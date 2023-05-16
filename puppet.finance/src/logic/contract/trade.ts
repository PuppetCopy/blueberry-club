
import { combineObject, replayLatest } from "@aelea/core"
import { http, observer } from "@aelea/ui-components"
import { CHAIN } from "@gambitdao/const"
import {
  AddressZero, IAbstractPositionIdentity, IAbstractPositionKey, ITokenIndex,
  ITokenTrade, IVaultPosition, TOKEN_ADDRESS_TO_SYMBOL, TOKEN_SYMBOL, TRADE_CONTRACT_MAPPING, abi,
  div, filterNull, getChainName, getMappedValue, getSafeMappedValue, getTokenDescription, parseFixed, periodicRun, periodicSample, safeDiv, switchFailedSources
} from "@gambitdao/gmx-middleware"
import { empty, fromPromise, map, mergeArray, multicast, now, scan, skip, snapshot, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { erc20Abi } from "abitype/test"
import { Address, Chain } from "viem"
import { connectMappedContract, getMappedContractAddress } from "../common"
import { resolveAddress } from "../utils"
import { fetchBalance, readContract } from "@wagmi/core"
import { network } from "../../wallet/walletLink"



export type IPositionGetter = IVaultPosition & IAbstractPositionKey & IAbstractPositionIdentity

export interface ITokenPoolInfo {
  rate: bigint
  rateFactor: bigint
  cumulativeRate: bigint
  reservedAmount: bigint
  poolAmounts: bigint
  usdgAmounts: bigint
  maxUsdgAmounts: bigint
  tokenWeights: bigint
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

  const binance = http.fromWebsocket('wss://stream.binance.com:9443/ws', now({ params: [`${symbol}usdt@trade`.toLowerCase()], method: "SUBSCRIBE", id: 1 }))
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
    // map((data: any) => {
    //   if (data[2] && data[2] === 'ticker') {
    //     return Number(data[1].c[0])

    //   }
    //   // console.warn(ev)

    //   return null
    // }, kraken),
    // map((ev: any) => {
    //   if (Array.isArray(ev) && ev.length === 2 && Array.isArray(ev[1]) && ev[1].length === 10) {
    //     // console.log(Number(ev[1][6]))
    //     return ev[1][6]
    //   }
    //   // console.warn(ev)
    //   return null
    // }, bitfinex),
    map((ev: any) => {
      if ('price' in ev) {
        // console.log(Number(ev.price))

        return Number(ev.price)
      }
      // console.warn(ev)
      return null
    }, coinbase),
  ]))

  const avgPrice = skip(1, scan((prev, next) => {
    return prev === 0 ? next : (prev + next) / 2
  }, 0, allSources))

  return map(ev => {


    const newLocal = parseFixed(ev, 30)
    return newLocal
  }, avgPrice)
}


export function getErc20Balance(chain: Chain, token: ITokenTrade | typeof AddressZero, address: Address): Stream<bigint> {

  if (token === AddressZero) {
    return fromPromise(fetchBalance({ address }).then(res => res.value))
  }

  const contractMapping = getMappedValue(TRADE_CONTRACT_MAPPING, chain.id)

  if (!contractMapping) {
    return now(0n)
  }

  const tokenAddress = resolveAddress(chain.id, token)

  const erc20 = readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address]
  })

  return fromPromise(erc20)
}





export const positionRouter = connectMappedContract(TRADE_CONTRACT_MAPPING, 'PositionRouter', abi.positionRouter)
export const pricefeed = connectMappedContract(TRADE_CONTRACT_MAPPING, 'VaultPriceFeed', abi.vaultPricefeed)
export const router = connectMappedContract(TRADE_CONTRACT_MAPPING, 'Router', abi.routerfeed)
export const usdg = connectMappedContract(TRADE_CONTRACT_MAPPING, 'USDG', erc20Abi)
export const vault = connectMappedContract(TRADE_CONTRACT_MAPPING, 'Vault', abi.vault)


export const executeIncreasePosition = positionRouter.listen('ExecuteIncreasePosition')
export const cancelIncreasePosition = positionRouter.listen('CancelIncreasePosition')
export const executeDecreasePosition = positionRouter.listen('ExecuteDecreasePosition')
export const cancelDecreasePosition = positionRouter.listen('CancelDecreasePosition')



export const getIsPluginEnabled = (address: Address) => router.read(
  'approvedPlugins',
  now(address),
  getMappedContractAddress(TRADE_CONTRACT_MAPPING, 'PositionRouter')
)

export const getTokenFundingRate = (token: Stream<ITokenTrade>) => {
  const reservedAmounts = vault.read('reservedAmounts', token)
  const poolAmounts = vault.read('poolAmounts', token)

  return map(params => {
    return div(params.fundingRateFactor * params.reservedAmounts, params.poolAmounts)
  }, combineObject({ fundingRateFactor: getFundingRateFactor(token), poolAmounts, reservedAmounts, token }))
}

export const getFundingRateFactor = (token: Stream<ITokenTrade>) => {
  const stableFundingRateFactor = vault.read('stableFundingRateFactor')
  const fundingRateFactor = vault.read('fundingRateFactor')

  return map((params) => {
    const tokenDescription = getTokenDescription(params.token)
    const rate = tokenDescription.isStable
      ? params.stableFundingRateFactor
      : params.fundingRateFactor

    return rate
  }, combineObject({ token, stableFundingRateFactor, fundingRateFactor }))
}

export const getTokenPoolInfo = (token: Stream<ITokenTrade>): Stream<ITokenPoolInfo> => {
  const rateFactor = getFundingRateFactor(token)
  const cumulativeRate = vault.read('cumulativeFundingRates', token)
  const reservedAmount = vault.read('reservedAmounts', token)
  const poolAmounts = vault.read('poolAmounts', token)
  const usdgAmounts = vault.read('usdgAmounts', token)
  const maxUsdgAmounts = vault.read('maxUsdgAmounts', token)
  const tokenWeights = vault.read('tokenWeights', token)

  const dataRead = combineObject({ rateFactor, maxUsdgAmounts, cumulativeRate, usdgAmounts, tokenWeights, reservedAmount, poolAmounts })

  return map(params => {
    const rate = safeDiv(params.rateFactor * params.reservedAmount, params.poolAmounts)
    return { ...params, rate }
  }, dataRead)
}

export const getAvailableLiquidityUsd = (indexToken: Stream<ITokenIndex>, collateralToken: Stream<ITokenTrade>) => {
  const globalShortSizes = vault.read('globalShortSizes', indexToken)
  const guaranteedUsd = vault.read('guaranteedUsd', indexToken)
  const maxGlobalShortSizes = positionRouter.read('maxGlobalShortSizes', indexToken)
  const maxGlobalLongSizes = positionRouter.read('maxGlobalLongSizes', indexToken)

  const state = combineObject({ collateralToken, maxGlobalShortSizes, maxGlobalLongSizes, indexToken, globalShortSizes, guaranteedUsd })

  return map(params => {
    const collateralTokenDescription = getTokenDescription(params.collateralToken)
    const isStable = collateralTokenDescription.isStable

    const vaultSize = isStable ? params.globalShortSizes : params.guaranteedUsd
    const globalMaxSize = isStable ? params.maxGlobalShortSizes : params.maxGlobalLongSizes

    return globalMaxSize - vaultSize
  }, state)
}



export const nativeTokenPrice = pricefeed.read('getPrimaryPrice', getMappedContractAddress(TRADE_CONTRACT_MAPPING, 'NATIVE_TOKEN'), now(false))


export const positionIncreaseEvent = vault.listen('IncreasePosition')
export const positionDecreaseEvent = vault.listen('DecreasePosition')
export const positionCloseEvent = vault.listen('ClosePosition')
export const positionLiquidateEvent = vault.listen('LiquidatePosition')






export const positionUpdateEvent = vault.listen('UpdatePosition')
// const positionUpdateEvent = switchLatest(vaultReader.read(map(async vault => {
//   const chain = vault.chainId

//   if (!chain) {
//     throw new Error('no chain detected')
//   }

//   const newLocal = vaultReader.listen('UpdatePosition')

//   if (chain === CHAIN.ARBITRUM) {
//     const tempContract = new Contract(vault.address, ["event UpdatePosition(bytes32,uint256,uint256,uint256,uint256,uint256,int256)"], vault.provider)
//     const topicId = id("UpdatePosition(bytes32,uint256,uint256,uint256,uint256,uint256,int256)")

//     const filter = { address: vault.address, topics: [topicId] }
//     const listener = listen(tempContract, filter)


//     const updateEvent: typeof newLocal = map((ev) => {
//       const { data, topics } = ev.__event
//       const abi = ["event UpdatePosition(bytes32,uint256,uint256,uint256,uint256,uint256,int256)"]
//       const iface = new Interface(abi)
//       const [key, size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl] = iface.parseLog({
//         data,
//         topics
//       }).args

//       return {
//         key,
//         id: key,
//         markPrice: 0n,
//         timestamp: unixTimestampNow(),
//         lastIncreasedTime: BigInt(unixTimestampNow()),
//         size: size,
//         collateral: collateral,
//         averagePrice: averagePrice,
//         entryFundingRate: entryFundingRate,
//         reserveAmount: reserveAmount,
//         realisedPnl: realisedPnl
//       }
//     }, listener) as any

//     return updateEvent
//   }

//   return newLocal
// })))

export const positionSettled = (keyEvent: Stream<string | null>) => filterNull(snapshot((key, posSettled) => {
  // console.log(posSettled)
  if (key !== posSettled.args.key) {
    return null
  }

  const obj = 'markPrice' in posSettled
    ? { ...posSettled }
    : { ...posSettled }
  return obj
}, keyEvent, mergeArray([positionLiquidateEvent, positionCloseEvent])))

export const getVaultPrimaryPrice = (token: Stream<ITokenTrade>) => {
  const primaryPrice = pricefeed.read('getPrimaryPrice', token, now(false))

  return observer.duringWindowActivity(periodicSample(primaryPrice, {
    recoverError: false,
    interval: 5000
  }))
}



export function getLatestPrice( token: Stream<ITokenTrade>) {
  const wsPrice = switchLatest(map(params => {
    const chainId = params.network!.id
    const resolvedToken = resolveAddress(chainId, params.token)

    return exchangesWebsocketPriceSource(chainId, resolvedToken)
  }, combineObject({ network, token })))

  return switchFailedSources([
    wsPrice,
    getVaultPrimaryPrice(token)
  ])
}



export async function getGmxIOPriceMap(url: string): Promise<{ [key in ITokenIndex]: bigint }> {
  const res = await fetch(url)
  const json = await res.json()

  // @ts-ignore
  return Object.keys(json).reduce((seed, key) => {
    // @ts-ignore
    seed[key.toLowerCase()] = json[key]
    return seed
  }, {})
}

export const exchangesWebsocketPriceSource = (chain: CHAIN, token: ITokenTrade) => {
  const source = gmxIOPriceMapSource[chain as keyof typeof gmxIOPriceMapSource]

  if (!source) {
    throw new Error(`no price mapping exists for chain ${getChainName(chain)} ${chain}`)
  }

  return map(pmap => {
    const val = pmap[token as keyof typeof pmap]

    return BigInt(val)
  }, source)
}

