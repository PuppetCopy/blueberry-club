
import { awaitPromises, combine, empty, map, mergeArray, multicast, now, scan, skip, snapshot, switchLatest } from "@most/core"
import { CHAIN, switchFailedSources, ITokenIndex, ITokenInput, ITokenTrade, AddressZero, getChainName, IPositionDecrease, IPositionIncrease, IPositionClose, IPositionLiquidated, filterNull, listen, IVaultPosition, unixTimestampNow, TRADE_CONTRACT_MAPPING, IPositionUpdate, IAbstractPositionIdentifier, parseFixed, TOKEN_SYMBOL, KeeperDecreaseRequest, KeeperIncreaseRequest, getPositionKey, IMappedEvent, getDenominator, getTokenUsd, ITokenDescription, safeDiv } from "@gambitdao/gmx-middleware"
import { combineArray, combineObject, replayLatest } from "@aelea/core"
import { ERC20__factory, PositionRouter__factory, Reader__factory, Router__factory, VaultPriceFeed__factory, Vault__factory } from "./gmx-contracts"
import { periodicRun } from "@gambitdao/gmx-middleware"
import { getTokenDescription as getTokenDescriptionFn, resolveAddress } from "../utils"
import { Stream } from "@most/types"
import { getContractAddress, readContractMapping } from "../common"
import { IWalletLink, IWalletState } from "@gambitdao/wallet-link"
import { id } from "@ethersproject/hash"
import { Interface } from "@ethersproject/abi"
import { http } from "@aelea/ui-components"
import { Contract } from "@ethersproject/contracts"
import { BaseProvider } from "@ethersproject/providers"


export type IPositionGetter = IVaultPosition & IAbstractPositionIdentifier

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

export function latestPriceFromExchanges(chain: CHAIN, indexToken: ITokenTrade): Stream<bigint> {
  const indexDesc = getTokenDescriptionFn(chain, indexToken)
  const symbol = indexDesc.symbol in derievedSymbolMapping ? derievedSymbolMapping[indexDesc.symbol] : indexDesc.symbol

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

  return mergeArray([
    gmxIoLatestPrice(chain, indexToken),
    map(ev => parseFixed(ev, 30), avgPrice)
  ])
}


export async function getErc20Balance(token: ITokenTrade | typeof AddressZero, w3p: IWalletState | null) {
  try {
    if (w3p === null) {
      return 0n
    }

    if (token === AddressZero) {
      return (await w3p.signer.getBalance()).toBigInt()
    }
    // @ts-ignore
    const tokenMap = TRADE_CONTRACT_MAPPING[w3p.chain]
    if (tokenMap && Object.values(tokenMap).indexOf(token) > -1) {
      const erc20 = ERC20__factory.connect(token, w3p.provider)

      return (await erc20.balanceOf(w3p.address)).toBigInt()
    }
  } catch (err) {
    return 0n
  }

  return 0n
}



export function connectTradeReader(provider: Stream<BaseProvider>) {
  const vault = readContractMapping(TRADE_CONTRACT_MAPPING, Vault__factory, provider, 'Vault')
  const positionRouter = readContractMapping(TRADE_CONTRACT_MAPPING, PositionRouter__factory, provider, 'PositionRouter')
  const usdg = readContractMapping(TRADE_CONTRACT_MAPPING, ERC20__factory, provider, 'USDG')
  const pricefeed = readContractMapping(TRADE_CONTRACT_MAPPING, VaultPriceFeed__factory, provider, 'VaultPriceFeed')
  const router = readContractMapping(TRADE_CONTRACT_MAPPING, Router__factory, provider, 'Router')


  const executeIncreasePosition = mapKeeperEvent(positionRouter.listen('ExecuteIncreasePosition'))
  const cancelIncreasePosition = mapKeeperEvent(positionRouter.listen('CancelIncreasePosition'))

  const executeDecreasePosition = mapKeeperEvent(positionRouter.listen('ExecuteDecreasePosition'))
  const cancelDecreasePosition = mapKeeperEvent(positionRouter.listen('CancelDecreasePosition'))

  const executionFee = positionRouter.readInt(map(c => c.minExecutionFee()))


  const isPluginEnabled = (address: string) => router.run(map(async (c) => {
    return c.approvedPlugins(address, getContractAddress(TRADE_CONTRACT_MAPPING, (await c.provider.getNetwork()).chainId, 'PositionRouter'))
  }))

  const usdgSupply = usdg.readInt(map(c => c.totalSupply()))
  const totalTokenWeight = vault.readInt(map(c => c.totalTokenWeights()))

  const getFundingInfo = (token: Stream<ITokenIndex>, tokenDescription: Stream<ITokenDescription>) => awaitPromises(combineArray(async (vaultContract, address, desc): Promise<IFundingInfo> => {

    const [cumulative, nextRate, reserved, poolAmount, fundingRateFactor] = await Promise.all([
      vaultContract.cumulativeFundingRates(address).then(x => x.toBigInt()),
      vaultContract.getNextFundingRate(address).then(x => x.toBigInt()),
      vaultContract.reservedAmounts(address).then(x => x.toBigInt()),
      vaultContract.poolAmounts(address).then(x => x.toBigInt()),
      desc.isStable
        ? vaultContract.stableFundingRateFactor().then(x => x.toBigInt())
        : vaultContract.fundingRateFactor().then(x => x.toBigInt())
    ])

    const rate = safeDiv(fundingRateFactor * reserved, poolAmount)

    return { cumulative, rate, nextRate }
  }, vault.contract, token, tokenDescription))

  const getTokenInfo = (token: Stream<ITokenIndex>) => awaitPromises(combineArray(async (vaultContract, positionRouterContract, address): Promise<ITokenInfo> => {
    const [weight, usdgAmounts, bufferAmounts, poolAmounts, reservedAmounts, guaranteedUsd, globalShortSizes, maxGlobalShortSizes, maxGlobalLongSizes,] = await Promise.all([
      vaultContract.tokenWeights(address).then(x => x.toBigInt()),
      vaultContract.usdgAmounts(address).then(x => x.toBigInt()),
      vaultContract.bufferAmounts(address).then(x => x.toBigInt()),
      vaultContract.poolAmounts(address).then(x => x.toBigInt()),
      vaultContract.reservedAmounts(address).then(x => x.toBigInt()),
      vaultContract.guaranteedUsd(address).then(x => x.toBigInt()),
      vaultContract.globalShortSizes(address).then(x => x.toBigInt()),
      positionRouterContract.maxGlobalShortSizes(address).then(x => x.toBigInt()),
      positionRouterContract.maxGlobalLongSizes(address).then(x => x.toBigInt()),
    ])

    const availableLongLiquidityUsd = maxGlobalLongSizes - guaranteedUsd
    const availableShortLiquidityUsd = maxGlobalShortSizes - globalShortSizes


    return {
      availableLongLiquidityUsd, availableShortLiquidityUsd, weight, bufferAmounts,
      usdgAmounts, poolAmounts, reservedAmounts, guaranteedUsd, globalShortSizes, maxGlobalShortSizes, maxGlobalLongSizes
    }
  }, vault.contract, positionRouter.contract, token))


  const getTokenWeight = (t: Stream<ITokenInput>) => vault.readInt(combine((token, c) => c.tokenWeights(token), t))
  const getTokenDebtUsd = (t: Stream<ITokenInput>) => vault.readInt(combine((token, c) => c.usdgAmounts(token), t))


  const positionIncreaseEvent: Stream<IPositionIncrease> = vault.listen('IncreasePosition')
  const positionDecreaseEvent: Stream<IPositionDecrease> = vault.listen('DecreasePosition')
  const positionCloseEvent: Stream<IPositionClose> = vault.listen('ClosePosition')
  const positionLiquidateEvent: Stream<IPositionLiquidated> = vault.listen('LiquidatePosition')

  const getLatestPrice = (chain: CHAIN, token: ITokenTrade, maximize = false) => {

    return switchFailedSources([
      gmxIoLatestPrice(chain, token),
      switchLatest(combineArray((c) => {
        if (c === null) {
          return empty()
        }

        return periodicRun({
          recoverError: false,
          interval: 5000,
          actionOp: map(async () => {
            const newLocal = await c.getPrimaryPrice(token, maximize)

            return newLocal.toBigInt()
          })
        })
      }, pricefeed.contract))
    ])
  }

  const positionUpdateEvent: Stream<IPositionUpdate> = switchLatest(awaitPromises(map(async (contract) => {
    const chain = (await contract.provider.getNetwork()).chainId

    if (chain === CHAIN.ARBITRUM) {
      const tempContract = new Contract(contract.address, ["event UpdatePosition(bytes32,uint256,uint256,uint256,uint256,uint256,int256)"], contract.provider)
      const topicId = id("UpdatePosition(bytes32,uint256,uint256,uint256,uint256,uint256,int256)")

      const filter = { address: contract.address, topics: [topicId] }
      const listener = listen(tempContract, filter)




      const updateEvent = map((ev) => {
        const { data, topics } = ev.__event
        const abi = ["event UpdatePosition(bytes32,uint256,uint256,uint256,uint256,uint256,int256)"]
        const iface = new Interface(abi)
        const [key, size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl] = iface.parseLog({
          data,
          topics
        }).args

        return {
          key,
          lastIncreasedTime: BigInt(unixTimestampNow()),
          size: size.toBigInt(),
          collateral: collateral.toBigInt(),
          averagePrice: averagePrice.toBigInt(),
          entryFundingRate: entryFundingRate.toBigInt(),
          reserveAmount: reserveAmount.toBigInt(),
          realisedPnl: realisedPnl.toBigInt(),
          __typename: 'UpdatePosition'
        }
      }, listener)
      return updateEvent
    }

    return listen(contract, contract.filters.UpdatePosition())
  }, vault.contract)))

  const positionSettled = (keyEvent: Stream<string | null>): Stream<IPositionClose | IPositionLiquidated> => filterNull(snapshot((key, posSettled) => {
    console.log(posSettled)
    if (key !== posSettled.key) {
      return null
    }

    const obj: IPositionClose | IPositionLiquidated = 'markPrice' in posSettled
      ? { ...posSettled, __typename: 'LiquidatePosition' }
      : { ...posSettled, __typename: 'ClosePosition' }
    return obj
  }, keyEvent, mergeArray([positionLiquidateEvent, positionCloseEvent])))



  const getPrice = (token: ITokenIndex, maximize: boolean) => switchLatest(map(c => periodicRun({
    actionOp: map(async () => {

      if (c === null) {
        throw new Error('no connected account')
      }

      const price = (maximize ? await c.getMaxPrice(token) : await c.getMinPrice(token)).toBigInt()
      return price
    })
  }), vault.contract))


  const getPosition = (key: string): Stream<Promise<IPositionGetter>> => map(async c => {
    const positionAbstract = await c.positions(key)
    const [size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl, lastIncreasedTime] = positionAbstract
    const lastIncreasedTimeBn = lastIncreasedTime.toBigInt()

    return {
      key,
      size: size.toBigInt(),
      collateral: collateral.toBigInt(),
      averagePrice: averagePrice.toBigInt(),
      entryFundingRate: entryFundingRate.toBigInt(),
      reserveAmount: reserveAmount.toBigInt(),
      realisedPnl: realisedPnl.toBigInt(),
      lastIncreasedTime: lastIncreasedTimeBn,
    }
  }, vault.contract)

  return {
    isPluginEnabled,
    positionRouter,
    router,
    executionFee,
    executeIncreasePosition,
    cancelIncreasePosition,
    executeDecreasePosition,
    cancelDecreasePosition,
    getTokenWeight, getTokenDebtUsd, getFundingInfo,
    positionIncreaseEvent, positionDecreaseEvent, positionUpdateEvent, positionCloseEvent, positionLiquidateEvent,
    getLatestPrice, positionSettled, vault, getPrice,
    totalTokenWeight, usdgSupply, getPosition, getTokenInfo
  }
}

export function mapKeeperEvent<T extends KeeperIncreaseRequest | KeeperDecreaseRequest>(keeperEvent: Stream<T>): Stream<T & IMappedEvent>{
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

