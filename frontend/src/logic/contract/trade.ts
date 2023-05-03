
import { combineObject, replayLatest } from "@aelea/core"
import { http, observer } from "@aelea/ui-components"
import { CHAIN } from "@gambitdao/const"
import {
  AddressZero, IAbstractPositionIdentity, IAbstractPositionKey, ITokenIndex, ITokenInput, ITokenTrade, IVaultPosition, TOKEN_ADDRESS_TO_SYMBOL,
  TOKEN_SYMBOL, TRADE_CONTRACT_MAPPING, div, filterNull, getChainName, getMappedValue, getSafeMappedValue, getTokenDescription, parseFixed, periodicRun, periodicSample, safeDiv, switchFailedSources
} from "@gambitdao/gmx-middleware"
import { empty, map, mergeArray, multicast, now, scan, skip, snapshot, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { erc20Abi } from "abitype/test"
import { Account, Chain, PublicClient, Transport } from "viem"
import { contractReader, listenContract, connectMappedContract, getMappedContractAddress } from "../common"
import { resolveAddress } from "../utils"
import { abi } from "@gambitdao/gmx-middleware"
import { IWalletclient } from "@gambitdao/wallet-link"



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
    console.log(next)

    return prev === 0 ? next : (prev + next) / 2
  }, 0, allSources))

  return map(ev => {


    const newLocal = parseFixed(ev, 30)
    return newLocal
  }, avgPrice)
}


export async function getErc20Balance(token: ITokenTrade | typeof AddressZero, account: Account, client: PublicClient<Transport, Chain> | undefined): Promise<bigint> {
  if (!client) {
    return 0n
  }


  if (token === AddressZero) {
    return await client.getBalance(account)
  }

  const chainId = client.chain.id
  const contractMapping = getMappedValue(TRADE_CONTRACT_MAPPING, chainId)

  if (!contractMapping) {
    return 0n
  }

  const tokenAddress = resolveAddress(chainId, token)

  const erc20 = client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address]
  })

  return await erc20
}



export function connectTradeReader(client: Stream<PublicClient<Transport, Chain>>) {

  const positionRouterContractConfig = connectMappedContract(TRADE_CONTRACT_MAPPING, 'PositionRouter', abi.positionRouter, client)
  const vaultConfig = connectMappedContract(TRADE_CONTRACT_MAPPING, 'Vault', abi.vault, client)


  const usdgReader = contractReader(connectMappedContract(TRADE_CONTRACT_MAPPING, 'USDG', erc20Abi, client))
  const vaultReader = contractReader(vaultConfig)
  const positionRouterReader = contractReader(positionRouterContractConfig)
  const pricefeedReader = contractReader(connectMappedContract(TRADE_CONTRACT_MAPPING, 'VaultPriceFeed', abi.vaultPricefeed, client))
  const routerReader = contractReader(connectMappedContract(TRADE_CONTRACT_MAPPING, 'Router', abi.routerfeed, client))

  const positionRouterListener = listenContract(positionRouterContractConfig)
  const vaultListener = listenContract(vaultConfig)

  const executeIncreasePosition = positionRouterListener('ExecuteIncreasePosition')
  const cancelIncreasePosition = positionRouterListener('CancelIncreasePosition')
  const executeDecreasePosition = positionRouterListener('ExecuteDecreasePosition')
  const cancelDecreasePosition = positionRouterListener('CancelDecreasePosition')

  const executionFee = positionRouterReader('minExecutionFee')
  const usdgSupply = usdgReader('totalSupply')
  const totalTokenWeight = vaultReader('totalTokenWeights')


  const getIsPluginEnabled = (wallet: IWalletclient) => routerReader(
    'approvedPlugins',
    now(wallet.account.address),
    getMappedContractAddress(TRADE_CONTRACT_MAPPING, 'PositionRouter', client)
  )

  const getTokenFundingRate = (token: Stream<ITokenTrade>) => {
    const reservedAmounts = vaultReader('reservedAmounts', token)
    const poolAmounts = vaultReader('poolAmounts', token)

    return map(params => {
      return div(params.fundingRateFactor * params.reservedAmounts, params.poolAmounts)
    }, combineObject({ fundingRateFactor: getFundingRateFactor(token), poolAmounts, reservedAmounts, token }))
  }

  const getFundingRateFactor = (token: Stream<ITokenTrade>) => {
    const stableFundingRateFactor = vaultReader('stableFundingRateFactor')
    const fundingRateFactor = vaultReader('fundingRateFactor')

    return map((params) => {
      const tokenDescription = getTokenDescription(params.token)
      const rate = tokenDescription.isStable
        ? params.stableFundingRateFactor
        : params.fundingRateFactor

      return rate
    }, combineObject({ token, stableFundingRateFactor, fundingRateFactor }))
  }

  const getTokenPoolInfo = (token: Stream<ITokenTrade>): Stream<ITokenPoolInfo> => {
    const rateFactor = getFundingRateFactor(token)
    const cumulativeRate = vaultReader('cumulativeFundingRates', token)
    const reservedAmount = vaultReader('reservedAmounts', token)
    const poolAmounts = vaultReader('poolAmounts', token)
    const usdgAmounts = vaultReader('usdgAmounts', token)
    const maxUsdgAmounts = vaultReader('maxUsdgAmounts', token)
    const tokenWeights = vaultReader('tokenWeights', token)

    const dataRead = combineObject({ rateFactor, maxUsdgAmounts, cumulativeRate, usdgAmounts, tokenWeights, reservedAmount, poolAmounts })

    return map(params => {
      const rate = safeDiv(params.rateFactor * params.reservedAmount, params.poolAmounts)
      return { ...params, rate }
    }, dataRead)
  }

  const getAvailableLiquidityUsd = (indexToken: Stream<ITokenIndex>, collateralToken: Stream<ITokenTrade>) => {
    const globalShortSizes = vaultReader('globalShortSizes', indexToken)
    const guaranteedUsd = vaultReader('guaranteedUsd', indexToken)
    const maxGlobalShortSizes = positionRouterReader('maxGlobalShortSizes', indexToken)
    const maxGlobalLongSizes = positionRouterReader('maxGlobalLongSizes', indexToken)

    const state = combineObject({ collateralToken, maxGlobalShortSizes, maxGlobalLongSizes, indexToken, globalShortSizes, guaranteedUsd })

    return map(params => {
      const collateralTokenDescription = getTokenDescription(params.collateralToken)
      const isStable = collateralTokenDescription.isStable

      const vaultSize = isStable ? params.globalShortSizes : params.guaranteedUsd
      const globalMaxSize = isStable ? params.maxGlobalShortSizes : params.maxGlobalLongSizes

      return globalMaxSize - vaultSize
    }, state)
  }



  const nativeTokenPrice = pricefeedReader('getPrimaryPrice', getMappedContractAddress(TRADE_CONTRACT_MAPPING, 'NATIVE_TOKEN', client), now(false))


  const getTokenDebtUsd = (token: Stream<ITokenInput>) => vaultReader('usdgAmounts', token)
  const getPrimaryPrice = (token: Stream<ITokenInput>, maximize = false) => pricefeedReader('getPrimaryPrice', token, now(maximize))



  const positionIncreaseEvent = vaultListener('IncreasePosition')
  const positionDecreaseEvent = vaultListener('DecreasePosition')
  const positionCloseEvent = vaultListener('ClosePosition')
  const positionLiquidateEvent = vaultListener('LiquidatePosition')






  const positionUpdateEvent = vaultListener('UpdatePosition')
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

  const positionSettled = (keyEvent: Stream<string | null>) => filterNull(snapshot((key, posSettled) => {
    // console.log(posSettled)
    if (key !== posSettled.args.key) {
      return null
    }

    const obj = 'markPrice' in posSettled
      ? { ...posSettled }
      : { ...posSettled }
    return obj
  }, keyEvent, mergeArray([positionLiquidateEvent, positionCloseEvent])))

  const getVaultPrimaryPrice = (token: Stream<ITokenTrade>) => {
    const primaryPrice = getPrimaryPrice(token)

    return observer.duringWindowActivity(periodicSample(primaryPrice, {
      recoverError: false,
      interval: 5000
    }))
  }

  const getPrice = (token: Stream<ITokenIndex>) => {
    const maxPrice = vaultReader('getMaxPrice', token)

    return periodicSample(maxPrice)
  }

  function getLatestPrice(chainId: Stream<CHAIN>, token: Stream<ITokenTrade>) {
    const wsPrice = switchLatest(map(params => {
      const resolvedToken = resolveAddress(params.chainId, params.token)

      return exchangesWebsocketPriceSource(params.chainId, resolvedToken)
    }, combineObject({ chainId, token })))

    return switchFailedSources([
      wsPrice,
      getVaultPrimaryPrice(token)
    ])
  }

  return {
    getIsPluginEnabled, routerReader, executionFee, getPrimaryPrice, nativeTokenPrice, getTokenPoolInfo,
    executeIncreasePosition, getTokenDebtUsd, positionRouterReader,
    cancelIncreasePosition, executeDecreasePosition, cancelDecreasePosition,
    positionIncreaseEvent, positionDecreaseEvent, positionUpdateEvent, positionCloseEvent, positionLiquidateEvent,
    getLatestPrice, positionSettled, vaultReader, getPrice, totalTokenWeight, usdgSupply,
    getAvailableLiquidityUsd, getTokenFundingRate
  }
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

