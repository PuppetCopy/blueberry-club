import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, filter, map, multicast, now, switchLatest } from "@most/core"
import { getWalletProvider } from "../common"
import { AddressZero, ADDRESS_LEVERAGE, ARBITRUM_ADDRESS, formatReadableUSD, getPositionKey, IVaultPosition, switchFailedSources, TradeAddress, USD_PERCISION } from "@gambitdao/gmx-middleware"
import { combineArray, replayLatest } from "@aelea/core"
import { ERC20__factory } from "@gambitdao/gbc-contracts"
import { FastPriceFeed, FastPriceFeed__factory, PositionRouter__factory, VaultReader__factory, Vault__factory } from "./gmx-contracts"
import { periodicRun } from "@gambitdao/gmx-middleware"
import { CHAIN_NATIVE_TO_ADDRESS, getTokenDescription } from "../../components/trade/utils"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { Stream } from "@most/types"
import { Web3Provider } from "@ethersproject/providers"


export interface KeeperExecutePosition {
  account: string
  path: string[]
  indexToken: string
  amountIn: bigint
  minOut: bigint
  sizeDelta: bigint
  isLong: boolean
  acceptablePrice: bigint
  executionFee: bigint
  blockGap: bigint
  timeGap: bigint
}

export function connectErc20(address: string, wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => ERC20__factory.connect(address, w3p.getSigner()), provider)

  const account = filter((a): a is string => a !== null, wallet.account)

  const balance = awaitPromises(combineArray(async (c, acct) => {
    return (await c.balanceOf(acct)).toBigInt()
  }, contract, account))

  return { contract, balance }
}


export function connectTrade(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)
  const contract = map(w3p => PositionRouter__factory.connect(ARBITRUM_ADDRESS.PositionRouter, w3p.getSigner()), provider)

  const executionFee = awaitPromises(map(async c => (await c.minExecutionFee()).toBigInt(), contract))

  const getLatestTradeRequest = (key: string, isIncrease: boolean) => map(async router => {
    const resp = isIncrease ? await router.increasePositionRequests(key) : await router.decreasePositionRequests(key)

    const account = resp.account
    const indexToken = resp.indexToken

    const acceptablePrice = resp.acceptablePrice.toBigInt()
    const sizeDelta = resp.sizeDelta.toBigInt()

    const blockNumber = resp.blockNumber.toBigInt()
    const blockTime = resp.blockTime.toBigInt()
    const executionFee = resp.executionFee.toBigInt()
    const minOut = resp.minOut.toBigInt()

    // const amountIn = resp.amountIn.toBigInt()
    // const hasCollateralInETH = resp.hasCollateralInETH

    const isLong = resp.isLong

    // amountIn, hasCollateralInETH,
    return { acceptablePrice, sizeDelta, account, indexToken, blockNumber, blockTime, executionFee, minOut, isLong, }
  }, contract)

  return { contract, executionFee, getLatestTradeRequest }
}

export function connectVaultReader(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => VaultReader__factory.connect(ARBITRUM_ADDRESS.VaultReader, w3p.getSigner()), provider)

  const account = filter((a): a is string => a !== null, wallet.account)

  return { contract }
}


async function getGmxIOPriceMap(): Promise<{ [key in ADDRESS_LEVERAGE]: bigint }> {
  const res = await fetch('https://gmx-server-mainnet.uw.r.appspot.com/prices')
  const json = await res.json()

  // @ts-ignore
  return Object.keys(json).reduce((seed, key) => {
    // @ts-ignore
    seed[key.toLowerCase()] = json[key]
    return seed
  }, {})
}

const gmxIOPriceMapSource = replayLatest(multicast(periodicRun({
  interval: 5000,
  actionOp: map(async time => getGmxIOPriceMap())
})))

const gmxIoLatestPrice = (token: ADDRESS_LEVERAGE) => map(pmap => BigInt(pmap[token]), gmxIOPriceMapSource)

const feedPrice = (token: TradeAddress, feed: Stream<FastPriceFeed>) => switchLatest(map(c => {
  return periodicRun({
    recoverError: false,
    actionOp: map(async () => (await c.prices(token)).toBigInt())
  })
}, feed))


export async function getErc20Balance(token: TradeAddress, w3p: Web3Provider | null, account: null | string) {
  if (!w3p || !account) {
    return 0n
  }

  if (token === AddressZero) {
    return (await w3p.getSigner().getBalance()).toBigInt()
  }

  const ercp = ERC20__factory.connect(token, w3p.getSigner())

  return (await ercp.balanceOf(account)).toBigInt()
}


export function connectPricefeed(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => FastPriceFeed__factory.connect('0x1a0ad27350cccd6f7f168e052100b4960efdb774', w3p.getSigner()), provider)

  const account = filter((a): a is string => a !== null, wallet.account)

  const getLatestPrice = (token: TradeAddress, maximize = false) => {
    const desc = getTokenDescription(USE_CHAIN, token)

    if (desc.isStable) {
      return now(USD_PERCISION)
    }

    const normalizedAddress = token === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : token

    return switchFailedSources([
      gmxIoLatestPrice(normalizedAddress as ADDRESS_LEVERAGE),
      feedPrice(token, contract),
    ])
  }

  return { contract, getLatestPrice }
}



export function connectVault(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => Vault__factory.connect(ARBITRUM_ADDRESS.Vault, w3p.getSigner()), provider)
  const usdg = map(w3p => ERC20__factory.connect(ARBITRUM_ADDRESS.USDG, w3p.getSigner()), provider)

  const account = filter((a): a is string => a !== null, wallet.account)
  const usdgSupply = awaitPromises(map(async c => (await c.totalSupply()).toBigInt(), usdg))
  const totalTokenWeight = awaitPromises(map(async c => (await c.totalTokenWeights()).toBigInt(), contract))

  const getTokenWeight = (token: TradeAddress) => awaitPromises(map(async c => (await c.tokenWeights(token)).toBigInt(), contract))
  const getTokenDebtUsd = (token: TradeAddress) => awaitPromises(map(async c => (await c.usdgAmounts(token)).toBigInt(), contract))
  const getTokenCumulativeFundingRate = (token: TradeAddress) => awaitPromises(map(async c => (await c.cumulativeFundingRates(token)).toBigInt(), contract))

  const getPrice = (token: ADDRESS_LEVERAGE, maximize: boolean) => switchLatest(map(c => periodicRun({
    actionOp: map(async () => {
      const price = (maximize ? await c.getMaxPrice(token) : await c.getMinPrice(token)).toBigInt()
      console.log(maximize, formatReadableUSD(price, { maximumFractionDigits: 1 }))
      return price
    })
  }), contract))


  const getPosition = (positionKey: string) => awaitPromises(map(async c => {
    const position = await c.positions(positionKey)

    if (!position || position.lastIncreasedTime.eq(0)) {
      return null
    }


    const [size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl, lastIncreasedTime] = position
    const lastIncreasedTimeBn = lastIncreasedTime.toBigInt()


    return <IVaultPosition>{
      key: positionKey,
      size: size.toBigInt(),
      collateral: collateral.toBigInt(),
      averagePrice: averagePrice.toBigInt(),
      entryFundingRate: entryFundingRate.toBigInt(),
      reserveAmount: reserveAmount.toBigInt(),
      realisedPnl: realisedPnl.toBigInt(),
      lastIncreasedTime: lastIncreasedTimeBn,
    }
  }, contract))



  return { contract, getPrice, getTokenWeight, getTokenDebtUsd, getTokenCumulativeFundingRate, totalTokenWeight, usdgSupply, getPosition }
}

