
import { combine, empty, map, mergeArray, multicast, now, scan, skip, snapshot, switchLatest } from "@most/core"
import {
  switchFailedSources, ITokenIndex, ITokenInput, ITokenTrade, AddressZero, getChainName, filterNull, IVaultPosition, unixTimestampNow, TRADE_CONTRACT_MAPPING,
  IAbstractPositionKey, parseFixed, TOKEN_SYMBOL, getPositionKey, KeeperIncreaseRequest, KeeperDecreaseRequest, ITokenDescription, safeDiv, TOKEN_ADDRESS_TO_SYMBOL
} from "@gambitdao/gmx-middleware"
import { replayLatest } from "@aelea/core"
import { ERC20__factory, PositionRouter__factory, Router__factory, VaultPriceFeed__factory, Vault__factory } from "../gmx-contracts"
import { periodicRun } from "@gambitdao/gmx-middleware"
import { resolveAddress } from "../utils"
import { Stream } from "@most/types"
import { getContractAddress, getMappedValue, readContractMapping, switchOp } from "../common"
import { CHAIN, zipState } from "@gambitdao/wallet-link"
import { id } from "@ethersproject/hash"
import { Interface } from "@ethersproject/abi"
import { http } from "@aelea/ui-components"
import { BaseProvider, Web3Provider } from "@ethersproject/providers"
import { Contract } from "ethers"
import { listen } from "./listen"


export type IPositionGetter = IVaultPosition & IAbstractPositionKey

export interface IFundingInfo {
  cumulative: bigint
  rate: bigint
  nextRate: bigint
}

export interface ITokenInfo {
  availableLongLiquidityUsd: bigint
  availableShortLiquidityUsd: bigint
  weight: bigint
  bufferAmounts: bigint
  usdgAmounts: bigint
  poolAmounts: bigint
  reservedAmounts: bigint
  guaranteedUsd: bigint
  globalShortSizes: bigint
  maxGlobalShortSizes: bigint
  maxGlobalLongSizes: bigint
}


const derievedSymbolMapping: { [k: string]: TOKEN_SYMBOL } = {
  [TOKEN_SYMBOL.WETH]: TOKEN_SYMBOL.ETH,
  [TOKEN_SYMBOL.WBTC]: TOKEN_SYMBOL.BTC,
  [TOKEN_SYMBOL.BTCB]: TOKEN_SYMBOL.BTC,
  [TOKEN_SYMBOL.WBTCE]: TOKEN_SYMBOL.BTC,
  [TOKEN_SYMBOL.WAVAX]: TOKEN_SYMBOL.AVAX,
}


const gmxIOPriceMapSource = {
  [CHAIN.ARBITRUM]: replayLatest(multicast(periodicRun({
    interval: 5000,
    actionOp: map(async time => getGmxIOPriceMap('https://gmx-server-mainnet.uw.r.appspot.com/prices'))
  }))),
  [CHAIN.AVALANCHE]: replayLatest(multicast(periodicRun({
    interval: 5000,
    actionOp: map(async time => getGmxIOPriceMap('https://gmx-avax-server.uc.r.appspot.com/prices'))
  }))),
}

export function latestPriceFromExchanges(indexToken: ITokenTrade): Stream<bigint> {
  const existingToken = getMappedValue(TOKEN_ADDRESS_TO_SYMBOL, indexToken, indexToken)
  const symbol = derievedSymbolMapping[existingToken] || existingToken

  if (symbol === null) {
    console.warn(`no symbol ${symbol} found in mapping`)
    return empty()
  }

  const binance = http.fromWebsocket('wss://stream.binance.com:9443/ws', now({ params: [`${symbol}usdt@trade`.toLowerCase()], method: "SUBSCRIBE", id: 1 }))
  const bitfinex = http.fromWebsocket('wss://api-pub.bitfinex.com/ws/2', now({ symbol: `${symbol}USD`, event: "subscribe", channel: "ticker" }))
  const coinbase = http.fromWebsocket('wss://ws-feed.pro.coinbase.com', now({ product_ids: [`${symbol}-USD`], type: "subscribe", channels: ["ticker"] }))

  const allSources: Stream<number> = filterNull(mergeArray([
    map((ev: any) => {
      if ('p' in ev) {
        return Number(ev.p)
      }
      // console.warn(ev)
      return null
    }, binance),
    map((ev: any) => {
      if (Array.isArray(ev) && ev.length === 2 && Array.isArray(ev[1]) && ev[1].length === 10) {
        return ev[1][6]
      }
      // console.warn(ev)
      return null
    }, bitfinex),
    map((ev: any) => {
      if ('price' in ev) {
        return Number(ev.price)
      }
      // console.warn(ev)
      return null
    }, coinbase),
  ]))

  const avgPrice = skip(1, scan((prev, next) => prev === 0 ? next : (prev + next) / 2, 0, allSources))

  return map(ev => parseFixed(ev, 30), avgPrice)
}


export async function getErc20Balance(token: ITokenTrade | typeof AddressZero, w3p: Web3Provider | BaseProvider) {

  if (!(w3p instanceof Web3Provider)) {
    return 0n
  }

  const signer = w3p.getSigner()

  if (token === AddressZero) {
    return (await signer.getBalance()).toBigInt()
  }
  const chainId = w3p.network?.chainId


  // @ts-ignore
  const contractMapping = TRADE_CONTRACT_MAPPING[chainId]

  if (!contractMapping) {
    return 0n
  }

  const resolvedTokenAddress = resolveAddress(chainId, token)

  const erc20 = ERC20__factory.connect(resolvedTokenAddress, w3p)

  return (await erc20.balanceOf(await signer.getAddress())).toBigInt()
}




export function connectTradeReader(provider: Stream<BaseProvider>) {
  const vaultReader = readContractMapping(TRADE_CONTRACT_MAPPING, Vault__factory, provider, 'Vault')
  const positionRouterReader = readContractMapping(TRADE_CONTRACT_MAPPING, PositionRouter__factory, provider, 'PositionRouter')
  const usdgReader = readContractMapping(TRADE_CONTRACT_MAPPING, ERC20__factory, provider, 'USDG')
  const pricefeedReader = readContractMapping(TRADE_CONTRACT_MAPPING, VaultPriceFeed__factory, provider, 'VaultPriceFeed')
  const routerReader = readContractMapping(TRADE_CONTRACT_MAPPING, Router__factory, provider, 'Router')

  const executeIncreasePosition = mapKeeperEvent(positionRouterReader.listen('ExecuteIncreasePosition'))
  const cancelIncreasePosition = mapKeeperEvent(positionRouterReader.listen('CancelIncreasePosition'))

  const executeDecreasePosition = mapKeeperEvent(positionRouterReader.listen('ExecuteDecreasePosition'))
  const cancelDecreasePosition = mapKeeperEvent(positionRouterReader.listen('CancelDecreasePosition'))


  const executionFee = positionRouterReader.readInt(map(async positionRouter => positionRouter.minExecutionFee()))
  const usdgSupply = usdgReader.readInt(map(usdg => usdg.totalSupply()))
  const totalTokenWeight = vaultReader.readInt(map(vault => vault.totalTokenWeights()))


  const getIsPluginEnabled = (address: string) => routerReader.run(map(async router => {
    return router.approvedPlugins(address, getContractAddress(TRADE_CONTRACT_MAPPING, (await router.provider.getNetwork()).chainId, 'PositionRouter'))
  }))

  const getTokenCumulativeFunding = (ts: Stream<ITokenIndex>) => vaultReader.readInt(combine((address, vault) => {
    return vault.cumulativeFundingRates(address)
  }, ts))

  const getTokenFundingInfo = (params: Stream<{ token: ITokenIndex, description: ITokenDescription }>) => vaultReader.run(combine(async (params, vault) => {
    const [cumulative, nextRate, reserved, poolAmount, fundingRateFactor] = await Promise.all([
      vault.cumulativeFundingRates(params.token).then(x => x.toBigInt()),
      vault.getNextFundingRate(params.token).then(x => x.toBigInt()),
      vault.reservedAmounts(params.token).then(x => x.toBigInt()),
      vault.poolAmounts(params.token).then(x => x.toBigInt()),
      params.description.isStable
        ? vault.stableFundingRateFactor().then(x => x.toBigInt())
        : vault.fundingRateFactor().then(x => x.toBigInt())
    ])

    const rate = safeDiv(fundingRateFactor * reserved, poolAmount)

    return { cumulative, rate, nextRate }
  }, params))

  const getTokenInfo = (ti: Stream<ITokenIndex>) => switchOp(zipState({ vault: vaultReader.contract, positionRouter: positionRouterReader.contract }), combine(async (token, params) => {
    const [weight, usdgAmounts, bufferAmounts, poolAmounts, reservedAmounts, guaranteedUsd, globalShortSizes, maxGlobalShortSizes, maxGlobalLongSizes,] = await Promise.all([
      params.vault.tokenWeights(token).then(x => x.toBigInt()),
      params.vault.usdgAmounts(token).then(x => x.toBigInt()),
      params.vault.bufferAmounts(token).then(x => x.toBigInt()),
      params.vault.poolAmounts(token).then(x => x.toBigInt()),
      params.vault.reservedAmounts(token).then(x => x.toBigInt()),
      params.vault.guaranteedUsd(token).then(x => x.toBigInt()),
      params.vault.globalShortSizes(token).then(x => x.toBigInt()),
      params.positionRouter.maxGlobalShortSizes(token).then(x => x.toBigInt()),
      params.positionRouter.maxGlobalLongSizes(token).then(x => x.toBigInt()),
    ])

    const availableLongLiquidityUsd = maxGlobalLongSizes - guaranteedUsd
    const availableShortLiquidityUsd = maxGlobalShortSizes - globalShortSizes


    return {
      availableLongLiquidityUsd, availableShortLiquidityUsd, weight, bufferAmounts,
      usdgAmounts, poolAmounts, reservedAmounts, guaranteedUsd, globalShortSizes, maxGlobalShortSizes, maxGlobalLongSizes
    }
  }, ti))


  const getTokenWeight = (token: Stream<ITokenInput>) => vaultReader.readInt(combine((token, vault) => vault.tokenWeights(token), token))
  const getTokenDebtUsd = (token: Stream<ITokenInput>) => vaultReader.readInt(combine((token, vault) => vault.usdgAmounts(token), token))
  const getPrimaryPrice = (token: ITokenInput, maximize = false) => pricefeedReader.readInt(map((pricefeed) => pricefeed.getPrimaryPrice(token, maximize)))


  const positionIncreaseEvent = vaultReader.listen('IncreasePosition')
  const positionDecreaseEvent = vaultReader.listen('DecreasePosition')
  const positionCloseEvent = vaultReader.listen('ClosePosition')
  const positionLiquidateEvent = vaultReader.listen('LiquidatePosition')

  const getLatestPrice = (token: Stream<ITokenTrade>) => switchLatest(pricefeedReader.run(combine(async (token, pricefeed) => {
    const chain = (await pricefeed.provider.getNetwork()).chainId
    const resovledA = resolveAddress(chain, token)

    return switchFailedSources([
      gmxIoLatestPrice(chain, resovledA),
      periodicRun({
        recoverError: false,
        interval: 5000,
        actionOp: map(async () => {
          const price = (await pricefeed.getPrimaryPrice(resovledA, true)).toBigInt()
          return price
        })
      })
    ])
  }, token)))

  const positionUpdateEvent = switchLatest(vaultReader.run(map(async vault => {
    const chain = (await vault.provider.getNetwork()).chainId

    if (!chain) {
      throw new Error('no chain detected')
    }

    const newLocal = vaultReader.listen('UpdatePosition')

    if (chain === CHAIN.ARBITRUM) {
      const tempContract = new Contract(vault.address, ["event UpdatePosition(bytes32,uint256,uint256,uint256,uint256,uint256,int256)"], vault.provider)
      const topicId = id("UpdatePosition(bytes32,uint256,uint256,uint256,uint256,uint256,int256)")

      const filter = { address: vault.address, topics: [topicId] }
      const listener = listen(tempContract, filter)


      const updateEvent: typeof newLocal = map((ev) => {
        const { data, topics } = ev.__event
        const abi = ["event UpdatePosition(bytes32,uint256,uint256,uint256,uint256,uint256,int256)"]
        const iface = new Interface(abi)
        const [key, size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl] = iface.parseLog({
          data,
          topics
        }).args

        return {
          key,
          id: key,
          markPrice: 0n,
          timestamp: unixTimestampNow(),
          lastIncreasedTime: BigInt(unixTimestampNow()),
          size: size.toBigInt(),
          collateral: collateral.toBigInt(),
          averagePrice: averagePrice.toBigInt(),
          entryFundingRate: entryFundingRate.toBigInt(),
          reserveAmount: reserveAmount.toBigInt(),
          realisedPnl: realisedPnl.toBigInt()
        }
      }, listener) as any

      return updateEvent
    }

    return newLocal
  })))

  const positionSettled = (keyEvent: Stream<string | null>) => filterNull(snapshot((key, posSettled) => {
    console.log(posSettled)
    if (key !== posSettled.key) {
      return null
    }

    const obj = 'markPrice' in posSettled
      ? { ...posSettled }
      : { ...posSettled }
    return obj
  }, keyEvent, mergeArray([positionLiquidateEvent, positionCloseEvent])))



  const getPrice = (token: Stream<ITokenIndex>) => switchLatest(vaultReader.run(combine(async (token, vault) => {
    return periodicRun({
      actionOp: map(async () => {
        const price = (await vault.getMaxPrice(token)).toBigInt()
        return price
      })
    })
  }, token)))



  return {
    getIsPluginEnabled, routerReader, executionFee, getTokenFundingInfo, getPrimaryPrice,
    executeIncreasePosition, getTokenWeight, getTokenDebtUsd, positionRouterReader,
    cancelIncreasePosition, executeDecreasePosition, cancelDecreasePosition, getTokenCumulativeFunding,
    positionIncreaseEvent, positionDecreaseEvent, positionUpdateEvent, positionCloseEvent, positionLiquidateEvent,
    getLatestPrice, positionSettled, vaultReader, getPrice, totalTokenWeight, usdgSupply, getTokenInfo
  }
}

export function mapKeeperEvent<T extends KeeperIncreaseRequest | KeeperDecreaseRequest>(keeperEvent: Stream<T & { path: string[] }>): Stream<T & IAbstractPositionKey> {
  return map(ev => {
    const isIncrease = 'amountIn' in ev
    const key = getPositionKey(ev.account, isIncrease ? ev.path.slice(-1)[0] : ev.path[0], ev.indexToken, ev.isLong)

    return { ...ev, key }
  }, keeperEvent)
}

async function getGmxIOPriceMap(url: string): Promise<{ [key in ITokenIndex]: bigint }> {
  const res = await fetch(url)
  const json = await res.json()

  // @ts-ignore
  return Object.keys(json).reduce((seed, key) => {
    // @ts-ignore
    seed[key.toLowerCase()] = json[key]
    return seed
  }, {})
}

export const gmxIoLatestPrice = (chain: CHAIN, token: ITokenTrade) => {
  const source = gmxIOPriceMapSource[chain as keyof typeof gmxIOPriceMapSource]

  if (!source) {
    throw new Error(`no price mapping exists for chain ${getChainName(chain)} ${chain}`)
  }

  return map(pmap => {
    const val = pmap[token as keyof typeof pmap]

    return BigInt(val)
  }, source)
}

