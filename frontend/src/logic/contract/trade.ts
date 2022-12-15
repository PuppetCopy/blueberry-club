import { awaitPromises, combine, empty, map, mergeArray, multicast, now, scan, skip, skipRepeats, snapshot, switchLatest } from "@most/core"
import { CHAIN, switchFailedSources, ITokenIndex, ITokenInput, ITokenTrade, AddressZero, getChainName, KeeperResponse, IPositionDecrease, IPositionIncrease, IPositionClose, IPositionLiquidated, filterNull, listen, IVaultPosition, unixTimestampNow, TRADE_CONTRACT_MAPPING, IPositionUpdate, IAbstractPositionIdentifier, parseFixed, TOKEN_SYMBOL } from "@gambitdao/gmx-middleware"
import { combineArray, replayLatest } from "@aelea/core"
import { ERC20__factory, PositionRouter__factory, Router__factory, VaultPriceFeed__factory, Vault__factory } from "./gmx-contracts"
import { periodicRun } from "@gambitdao/gmx-middleware"
import { getTokenDescription } from "../utils"
import { Stream } from "@most/types"
import { getContractAddress, readContractMapping } from "../common"
import { IWalletLink, IWalletState } from "@gambitdao/wallet-link"
import { id } from "@ethersproject/hash"
import { Interface } from "@ethersproject/abi"
import { http } from "@aelea/ui-components"


export type IPositionGetter = IVaultPosition & IAbstractPositionIdentifier

const derievedSymbolMapping: { [k: string]: TOKEN_SYMBOL } = {
  [TOKEN_SYMBOL.WETH]: TOKEN_SYMBOL.ETH,
  [TOKEN_SYMBOL.WBTC]: TOKEN_SYMBOL.BTC,
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
  const indexDesc = getTokenDescription(chain, indexToken)
  const symbol = indexDesc.symbol in derievedSymbolMapping ? derievedSymbolMapping[indexDesc.symbol] : indexDesc.symbol

  const binance = http.fromWebsocket('wss://stream.binance.com:9443/ws', now({ method: "SUBSCRIBE", params: [`${symbol}usdt@trade`.toLowerCase()], id: 1 }))
  const bitfinex = http.fromWebsocket('wss://api-pub.bitfinex.com/ws/2', now({ event: "subscribe", channel: "ticker", symbol: `${symbol}USD` }))
  const coinbase = http.fromWebsocket('wss://ws-feed.pro.coinbase.com', now({ type: "subscribe", product_ids: [`${symbol}-USD`], channels: ["ticker"], }))

  const allSources: Stream<number> = filterNull(mergeArray([
    map((ev: any) => {
      if ('p' in ev) {
        return Number(ev.p)
      }
      console.warn(ev)
      return null
    }, binance),
    map((ev: any) => {
      if (Array.isArray(ev) && ev.length === 2 && Array.isArray(ev[1]) && ev[1].length === 10) {
        return ev[1][6]
      }
      console.warn(ev)
      return null
    }, bitfinex),
    map((ev: any) => {
      if ('price' in ev) {
        return Number(ev.price)
      }
      console.warn(ev)
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

export function connectTrade(walletLink: IWalletLink) {
  const router = readContractMapping(TRADE_CONTRACT_MAPPING, Router__factory, walletLink.provider, 'Router')
  const positionRouter = readContractMapping(TRADE_CONTRACT_MAPPING, PositionRouter__factory, walletLink.provider, 'PositionRouter')


  const executeIncreasePosition: Stream<KeeperResponse> = positionRouter.listen('ExecuteIncreasePosition')
  const cancelIncreasePosition: Stream<KeeperResponse> = positionRouter.listen('CancelIncreasePosition')

  const executeDecreasePosition: Stream<KeeperResponse> = positionRouter.listen('ExecuteDecreasePosition')
  const cancelDecreasePosition: Stream<KeeperResponse> = positionRouter.listen('CancelDecreasePosition')

  const executionFee = positionRouter.readInt(map(c => c.minExecutionFee()))


  const isPluginEnabled = (address: string) => router.run(map(async (c) => {
    return c.approvedPlugins(address, getContractAddress(TRADE_CONTRACT_MAPPING, (await c.provider.getNetwork()).chainId, 'PositionRouter'))
  }))

  return {
    isPluginEnabled,
    positionRouter,
    router,
    executionFee,
    executeIncreasePosition,
    cancelIncreasePosition,
    executeDecreasePosition,
    cancelDecreasePosition,
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

export function connectVault(walletLink: IWalletLink) {
  const vault = readContractMapping(TRADE_CONTRACT_MAPPING, Vault__factory, walletLink.provider, 'Vault')
  const vaultGlobal = readContractMapping(TRADE_CONTRACT_MAPPING, Vault__factory, walletLink.defaultProvider, 'Vault')
  const usdg = readContractMapping(TRADE_CONTRACT_MAPPING, ERC20__factory, walletLink.provider, 'USDG')
  const pricefeed = readContractMapping(TRADE_CONTRACT_MAPPING, VaultPriceFeed__factory, walletLink.provider, 'VaultPriceFeed')

  // const usdg = map(w3p => ERC20__factory.connect(ARBITRUM_ADDRESS.USDG, w3p), provider)

  const usdgSupply = usdg.readInt(map(c => c.totalSupply()))
  const totalTokenWeight = vault.readInt(map(c => c.totalTokenWeights()))

  const tokenDescription = (t: Stream<ITokenInput>) => vault.run(combine(async (token, c) => getTokenDescription((await c.provider.getNetwork()).chainId, token), t))

  const getTokenWeight = (t: Stream<ITokenInput>) => vault.readInt(combine((token, c) => c.tokenWeights(token), t))
  const getTokenDebtUsd = (t: Stream<ITokenInput>) => vault.readInt(combine((token, c) => c.usdgAmounts(token), t))
  const getTokenCumulativeFundingRate = (t: Stream<ITokenInput>) => vault.readInt(combine((token, c) => c.cumulativeFundingRates(token), t))
  const getPoolAmount = (t: Stream<ITokenInput>) => vault.readInt(combine((token, c) => c.poolAmounts(token), t))
  const getReservedAmount = (t: Stream<ITokenInput>) => vault.readInt(combine((token, c) => c.reservedAmounts(token), t))
  const getTotalShort = (t: Stream<ITokenInput>) => vault.readInt(combine((token, c) => c.globalShortSizes(token), t))
  const getTotalShortCap = (t: Stream<ITokenInput>) => vault.run(combine(async (token, c) => {
    try {
      return (await c.maxGlobalShortSizes(token)).toBigInt()
    } catch (e) {
      return null
    }
  }, t))
  // vault.listen(contract.filters.IncreasePosition())


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

  const positionUpdateEvent = (keyEvent: Stream<string | null>): Stream<IPositionUpdate> => switchLatest(awaitPromises(map(async (contract) => {
    const chain = (await contract.provider.getNetwork()).chainId

    if (chain === CHAIN.ARBITRUM) {

      const updateEvent = filterNull(snapshot((key, ev) => {
        const { data, topics } = ev.__event
        const abi = ["event UpdatePosition(bytes32,uint256,uint256,uint256,uint256,uint256,int256)"]
        const iface = new Interface(abi)
        const [updateKey, size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl] = iface.parseLog({
          data,
          topics
        }).args

        if (updateKey !== key) {
          return null
        }


        return {
          key: key,
          lastIncreasedTime: BigInt(unixTimestampNow()),
          size: size.toBigInt(),
          collateral: collateral.toBigInt(),
          averagePrice: averagePrice.toBigInt(),
          entryFundingRate: entryFundingRate.toBigInt(),
          reserveAmount: reserveAmount.toBigInt(),
          realisedPnl: realisedPnl.toBigInt(),
          __typename: 'UpdatePosition'
        }
      }, keyEvent, listen(contract, {
        address: contract.address, topics: [
          id("UpdatePosition(bytes32,uint256,uint256,uint256,uint256,uint256,int256)")
        ]
      })))
      return updateEvent
    }

    return filterNull(snapshot((key, ev) => key === ev.key ? ev : null, keyEvent, listen(contract, contract.filters.UpdatePosition())))
  }, vaultGlobal.contract)))

  const positionSettled = (keyEvent: Stream<string | null>): Stream<IPositionClose | IPositionLiquidated> => filterNull(snapshot((key, posSettled) => {
    if (key !== posSettled.key) {
      return null
    }

    const obj: IPositionClose | IPositionLiquidated = 'markPrice' in posSettled
      ? { ...posSettled, __typename: 'LiquidatePosition' }
      : { ...posSettled, __typename: 'ClosePosition' }
    return obj
  }, keyEvent, mergeArray([positionLiquidateEvent, positionCloseEvent])))

  // const getAvailableLiquidityUsd = (token: Stream<ITokenIndex>, isLong: Stream<boolean>) => {

  //   const tokenDesc = tokenDescription(token)
  //   const denominator = getDenominator(tokenDesc.decimals)
  //   const price = getPrice(token, false)
  //   const poolAmount = getPoolAmount(token)
  //   const reservedAmount = getReservedAmount(token)

  //   return combineArray((c, poolAmount, reservedAmount, maxGlobalShortSize, globalShortSize, price) => {
  //     const availableAmount = poolAmount - reservedAmount

  //     if (isLong) {
  //       return availableAmount * price / denominator
  //     }

  //     const maxAvailableShort = globalShortSize ? maxGlobalShortSize - globalShortSize : maxGlobalShortSize

  //     if (availableAmount > maxAvailableShort) {
  //       return maxAvailableShort
  //     }

  //     return availableAmount * price / denominator
  //   }, vault.contract, poolAmount, reservedAmount, getTotalShort(token), getTotalShortCap(token), price)
  // }

  const getPrice = (token: ITokenIndex, maximize: boolean) => switchLatest(map(c => periodicRun({
    actionOp: map(async () => {

      if (c === null) {
        throw new Error('no connected account')
      }

      const price = (maximize ? await c.getMaxPrice(token) : await c.getMinPrice(token)).toBigInt()
      return price
    })
  }), vault.contract))


  const getPosition = (key: string | null): Stream<Promise<IPositionGetter | null>> => map(async c => {
    if (key === null) {
      return null
    }

    const positionAbstract = await c.positions(key)

    if (positionAbstract.lastIncreasedTime.eq(0)) {
      return null
    }

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
    positionIncreaseEvent, positionDecreaseEvent, positionUpdateEvent, positionCloseEvent, positionLiquidateEvent,
    tokenDescription, getLatestPrice, getTotalShort, getTotalShortCap, positionSettled,
    vault, getPrice, getTokenWeight, getTokenDebtUsd, getTokenCumulativeFundingRate,
    totalTokenWeight, usdgSupply, getPosition, getPoolAmount, getReservedAmount, // getAvailableLiquidityUsd
  }
}
