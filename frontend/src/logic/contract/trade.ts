
import { awaitPromises, combine, empty, map, mergeArray, multicast, now, scan, skip, snapshot, switchLatest } from "@most/core"
import {
  switchFailedSources, ITokenIndex, ITokenInput, ITokenTrade, AddressZero, getChainName, filterNull, IVaultPosition, unixTimestampNow, TRADE_CONTRACT_MAPPING,
  IAbstractPositionKey, getSafeMappedValue, parseFixed, TOKEN_SYMBOL, getPositionKey, KeeperIncreaseRequest, KeeperDecreaseRequest, safeDiv, TOKEN_ADDRESS_TO_SYMBOL, div, IAbstractPositionIdentity, getTokenDescription
} from "@gambitdao/gmx-middleware"
import { combineObject, replayLatest } from "@aelea/core"
import { ERC20__factory, PositionRouter__factory, Router__factory, VaultPriceFeed__factory, Vault__factory } from "../gmx-contracts"
import { periodicRun } from "@gambitdao/gmx-middleware"
import { resolveAddress } from "../utils"
import { Stream } from "@most/types"
import { getContractAddress, readContractMapping } from "../common"
import { id } from "@ethersproject/hash"
import { Interface } from "@ethersproject/abi"
import { http, observer } from "@aelea/ui-components"
import { BaseProvider, Web3Provider } from "@ethersproject/providers"
import { Contract } from "ethers"
import { listen } from "./listen"
import { CHAIN } from "@gambitdao/const"


export type IPositionGetter = IVaultPosition & IAbstractPositionKey & IAbstractPositionIdentity

export interface ITokenPoolInfo {
  rate: bigint
  rateFactor: bigint
  cumulativeRate: bigint
  reservedAmount: bigint
  poolAmount: bigint
  usdgAmount: bigint
  maxUsdgAmount: bigint
  weight: bigint
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
  [CHAIN.ARBITRUM]: replayLatest(multicast(observer.duringWindowActivity(periodicRun({
    interval: 2000,
    actionOp: map(async time => getGmxIOPriceMap('https://gmx-server-mainnet.uw.r.appspot.com/prices'))
  })))),
  [CHAIN.AVALANCHE]: replayLatest(multicast(observer.duringWindowActivity(periodicRun({
    interval: 2000,
    actionOp: map(async time => getGmxIOPriceMap('https://gmx-avax-server.uc.r.appspot.com/prices'))
  })))),
}

export function latestPriceFromExchanges(indexToken: ITokenTrade): Stream<bigint> {
  const existingToken = getSafeMappedValue(TOKEN_ADDRESS_TO_SYMBOL, indexToken, indexToken)
  const symbol = derievedSymbolMapping[existingToken] || existingToken

  if (symbol === null) {
    console.warn(`no symbol ${symbol} found in mapping`)
    return empty()
  }

  const binance = http.fromWebsocket('wss://stream.binance.com:9443/ws', now({ params: [`${symbol}usd@trade`.toLowerCase()], method: "SUBSCRIBE", id: 1 }))
  const bitfinex = http.fromWebsocket('wss://api-pub.bitfinex.com/ws/2', now({ symbol: `${symbol}USD`, event: "subscribe", channel: "ticker" }))
  const coinbase = http.fromWebsocket('wss://ws-feed.pro.coinbase.com', now({ product_ids: [`${symbol}-USD`], type: "subscribe", channels: ["ticker"] }))
  const kraken = http.fromWebsocket('wss://ws.kraken.com', now({ event: 'subscribe', pair: [`${symbol.toUpperCase()}/USD`], subscription: { name: 'ticker' } }))

  const allSources: Stream<number> = filterNull(mergeArray([
    // map((ev: any) => {
    //   if ('p' in ev) {
    //     console.log(Number(ev.p))
    //     return Number(ev.p)
    //   }
    //   // console.warn(ev)
    //   return null
    // }, binance),
    map((data: any) => {
      if (data[2] && data[2] === 'ticker') {
        return Number(data[1].c[0])

      }
      // console.warn(ev)

      return null
    }, kraken),
    map((ev: any) => {
      if (Array.isArray(ev) && ev.length === 2 && Array.isArray(ev[1]) && ev[1].length === 10) {
        // console.log(Number(ev[1][6]))
        return ev[1][6]
      }
      // console.warn(ev)
      return null
    }, bitfinex),
    map((ev: any) => {
      if ('price' in ev) {
        // console.log(Number(ev.price))

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


  const chainId = (await w3p.getNetwork()).chainId

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

  const executeIncreasePosition = mapKeeperEvent(true, positionRouterReader.listen('ExecuteIncreasePosition'))
  const cancelIncreasePosition = mapKeeperEvent(true, positionRouterReader.listen('CancelIncreasePosition'))

  const executeDecreasePosition = mapKeeperEvent(false, positionRouterReader.listen('ExecuteDecreasePosition'))
  const cancelDecreasePosition = mapKeeperEvent(false, positionRouterReader.listen('CancelDecreasePosition'))


  const executionFee = positionRouterReader.readInt(map(async positionRouter => positionRouter.minExecutionFee()))
  const usdgSupply = usdgReader.readInt(map(usdg => usdg.totalSupply()))
  const totalTokenWeight = vaultReader.readInt(map(vault => vault.totalTokenWeights()))


  const getIsPluginEnabled = (address: string) => routerReader.run(map(async router => {
    return router.approvedPlugins(address, getContractAddress(TRADE_CONTRACT_MAPPING, (await router.provider.getNetwork()).chainId, 'PositionRouter'))
  }))

  const getTokenCumulativeFunding = (ts: Stream<ITokenIndex>) => vaultReader.readInt(combine((address, vault) => {
    return vault.cumulativeFundingRates(address)
  }, ts))
  const getPoolAmount = (ts: Stream<ITokenIndex>) => vaultReader.readInt(combine((address, vault) => {
    return vault.poolAmounts(address)
  }, ts))
  const getReservedAmount = (ts: Stream<ITokenIndex>) => vaultReader.readInt(combine((address, vault) => {
    return vault.reservedAmounts(address)
  }, ts))
  const getTokenWeight = (ts: Stream<ITokenIndex>) => vaultReader.readInt(combine((address, vault) => {
    return vault.tokenWeights(address)
  }, ts))
  const getUsdgAmount = (ts: Stream<ITokenIndex>) => vaultReader.readInt(combine((address, vault) => {
    return vault.usdgAmounts(address)
  }, ts))
  const getMaxUsdgAmount = (ts: Stream<ITokenIndex>) => vaultReader.readInt(combine((address, vault) => {
    return vault.maxUsdgAmounts(address)
  }, ts))

  const getTokenFundingRate = (token: Stream<ITokenTrade>) => vaultReader.run(combine(async (address, vault) => {
    const tokenDescription = getTokenDescription(address)

    const [reserved, poolAmount, fundingRateFactor] = await Promise.all([
      vault.reservedAmounts(address).then(x => x.toBigInt()),
      vault.poolAmounts(address).then(x => x.toBigInt()),
      tokenDescription.isStable
        ? vault.stableFundingRateFactor().then(x => x.toBigInt())
        : vault.fundingRateFactor().then(x => x.toBigInt())
    ])

    return div(fundingRateFactor * reserved, poolAmount)
  }, token))

  const getFundingRateFactor = (token: Stream<ITokenTrade>) => vaultReader.readInt(combine(async (address, vault) => {
    const tokenDescription = getTokenDescription(address)
    const rate = tokenDescription.isStable
      ? vault.stableFundingRateFactor()
      : vault.fundingRateFactor()

    return rate
  }, token))

  const getTokenPoolInfo = (token: Stream<ITokenTrade>): Stream<ITokenPoolInfo> => {

    const rateFactor = getFundingRateFactor(token)
    const cumulativeRate = getTokenCumulativeFunding(token)
    const reservedAmount = getReservedAmount(token)
    const poolAmount = getPoolAmount(token)
    const usdgAmount = getUsdgAmount(token)
    const maxUsdgAmount = getMaxUsdgAmount(token)
    const weight = getTokenWeight(token)

    const dataRead = combineObject({ rateFactor, maxUsdgAmount, cumulativeRate, usdgAmount, weight, reservedAmount, poolAmount })

    return map(data => {
      const rate = safeDiv(data.rateFactor * data.reservedAmount, data.poolAmount)
      return { ...data, rate }
    }, dataRead)
  }

  const getAvailableLiquidityUsd = (indexToken: Stream<ITokenIndex>, collateralToken: Stream<ITokenTrade>) => {
    const state = combineObject({ collateralToken, indexToken, vault: vaultReader.contract, positionRouter: positionRouterReader.contract })

    return awaitPromises(map(async (params) => {
      const collateralTokenDescription = getTokenDescription(params.collateralToken)
      const isStable = collateralTokenDescription.isStable

      const [vaultSize, globalMaxSize] = await Promise.all([
        isStable
          ? params.vault.globalShortSizes(params.indexToken).then(x => x.toBigInt())
          : params.vault.guaranteedUsd(params.indexToken).then(x => x.toBigInt()),
        isStable
          ? params.positionRouter.maxGlobalShortSizes(params.indexToken).then(x => x.toBigInt())
          : params.positionRouter.maxGlobalLongSizes(params.indexToken).then(x => x.toBigInt())
      ])

      return globalMaxSize - vaultSize
    }, state))
  }


  const nativeTokenPrice = pricefeedReader.readInt(map(async contract => {
    const chain = (await contract.provider.getNetwork()).chainId
    const nativeAddress = getContractAddress(TRADE_CONTRACT_MAPPING, chain, 'NATIVE_TOKEN')

    if (nativeAddress === null) {
      throw new Error(`couldn't get native token contract address`)
    }

    return contract.getPrimaryPrice(nativeAddress, false)
  }))

  const getTokenDebtUsd = (token: Stream<ITokenInput>) => vaultReader.readInt(combine((token, vault) => vault.usdgAmounts(token), token))
  const getPrimaryPrice = (token: ITokenInput, maximize = false) => pricefeedReader.readInt(map(async (pricefeed) => {

    try {
      return await pricefeed.getPrimaryPrice(token, maximize)
    } catch (err) {
      throw new Error(`Pricefeed token ${token} does not exists`)
    }

  }))


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
          try {
            const price = (await pricefeed.getPrimaryPrice(resovledA, true)).toBigInt()
            return price
          } catch (err) {
            throw new Error(`Pricefeed token ${token} does not exists within ${pricefeed.address} pricefeed`)
          }
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
    getIsPluginEnabled, routerReader, executionFee, getPrimaryPrice, nativeTokenPrice, getTokenPoolInfo,
    executeIncreasePosition, getTokenWeight, getMaxUsdgAmount, getTokenDebtUsd, positionRouterReader,
    cancelIncreasePosition, executeDecreasePosition, cancelDecreasePosition, getTokenCumulativeFunding,
    positionIncreaseEvent, positionDecreaseEvent, positionUpdateEvent, positionCloseEvent, positionLiquidateEvent,
    getLatestPrice, positionSettled, vaultReader, getPrice, totalTokenWeight, usdgSupply, getPoolAmount,
    getReservedAmount, getUsdgAmount, getAvailableLiquidityUsd, getTokenFundingRate
  }
}

export function mapKeeperEvent<T extends KeeperIncreaseRequest | KeeperDecreaseRequest>(isIncrease: boolean, keeperEvent: Stream<T & { path: string[] }>): Stream<T & IAbstractPositionKey> {
  return map(ev => {
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

