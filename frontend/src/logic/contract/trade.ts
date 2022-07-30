import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, filter, map, multicast, switchLatest } from "@most/core"
import { getWalletProvider } from "../common"
import { AddressZero, ADDRESS_LEVERAGE, ADDRESS_TRADE, ARBITRUM_ADDRESS, IVaultPosition, switchFailedSources, TradeAddress } from "@gambitdao/gmx-middleware"
import { combineArray, replayLatest } from "@aelea/core"
import { ERC20__factory } from "@gambitdao/gbc-contracts"
import { FastPriceFeed__factory, PositionRouter__factory, VaultReader__factory, Vault__factory } from "./gmx-contracts"
import { periodicRun } from "@gambitdao/gmx-middleware"
import { keccak256 } from "@ethersproject/solidity"
import { CHAIN_NATIVE_TO_ADDRESS } from "../../components/trade/utils"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"



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

  const account = filter((a): a is string => a !== null, wallet.account)

  const executionFee = awaitPromises(map(async c => {
    return (await c.minExecutionFee()).toBigInt()
  }, contract))


  return { contract, executionFee }
}

export function connectVaultReader(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => VaultReader__factory.connect(ARBITRUM_ADDRESS.VaultReader, w3p.getSigner()), provider)

  const account = filter((a): a is string => a !== null, wallet.account)

  // const getPrice = (token: ADDRESS_LEVERAGE, maximize = false, incAmm = true) => map(async c => {
  //   const p = await c.globalShortAveragePrices(token, maximize, incAmm, false)

  //   return p.toBigInt()
  // }, contract)


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

export function connectPricefeed(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => FastPriceFeed__factory.connect('0x1a0ad27350cccd6f7f168e052100b4960efdb774', w3p.getSigner()), provider)

  const account = filter((a): a is string => a !== null, wallet.account)

  const getLatestPrice = (address: ADDRESS_LEVERAGE | "0x0000000000000000000000000000000000000000", maximize = false, incAmm = true) => {
    const normalizedInputToken = address === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : address

    return switchFailedSources([
      gmxIoLatestPrice(normalizedInputToken),
      switchLatest(map(c => {
        return periodicRun({
          recoverError: false,
          actionOp: map(async () => (await c.prices(normalizedInputToken)).toBigInt())
        })
      }, contract)),
    ])

  }


  return { contract, getLatestPrice }
}



export function connectVault(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => Vault__factory.connect(ARBITRUM_ADDRESS.Vault, w3p.getSigner()), provider)
  const usdg = map(w3p => ERC20__factory.connect(ARBITRUM_ADDRESS.USDG, w3p.getSigner()), provider)

  const account = filter((a): a is string => a !== null, wallet.account)
  const usdgAmount = awaitPromises(map(async c => (await c.totalSupply()).toBigInt(), usdg))
  const totalTokenWeight = awaitPromises(map(async c => (await c.totalTokenWeights()).toBigInt(), contract))

  const getTokenWeight = (token: TradeAddress) => awaitPromises(map(async c => (await c.tokenWeights(token)).toBigInt(), contract))
  const getTokenDebtUsd = (token: TradeAddress) => awaitPromises(map(async c => (await c.usdgAmounts(token)).toBigInt(), contract))
  const getMaxPrice = (token: ADDRESS_LEVERAGE) => awaitPromises(map(async c => (await c.getMaxPrice(token)).toBigInt(), contract))
  const getMinPrice = (token: ADDRESS_LEVERAGE) => awaitPromises(map(async c => (await c.getMinPrice(token)).toBigInt(), contract))


  const getPosition = (accountAddress: string, isLong: boolean, collateralToken: TradeAddress, indexToken: ADDRESS_LEVERAGE) => awaitPromises(map(async c => {

    const nomCollateralToken = collateralToken === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : collateralToken
    const keys = isLong
      ? [getPositionKey(accountAddress, indexToken, indexToken, isLong)]
      : [
        getPositionKey(accountAddress, ARBITRUM_ADDRESS.USDC, indexToken, isLong),
        getPositionKey(accountAddress, ARBITRUM_ADDRESS.USDT, indexToken, isLong),
        getPositionKey(accountAddress, ARBITRUM_ADDRESS.FRAX, indexToken, isLong),
        getPositionKey(accountAddress, ARBITRUM_ADDRESS.DAI, indexToken, isLong),
      ]
    const positionList = await Promise.all(keys.map(k => c.positions(k)))
    const position = positionList.find(x => x.lastIncreasedTime.gt(0))

    if (!position) {
      return null
    }

    const key = keys[positionList.indexOf(position)]

    const [size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl, lastIncreasedTime] = position
    const lastIncreasedTimeBn = lastIncreasedTime.toBigInt()


    return <IVaultPosition>{
      key, isLong,
      size: size.toBigInt(),
      collateral: collateral.toBigInt(),
      averagePrice: averagePrice.toBigInt(),
      entryFundingRate: entryFundingRate.toBigInt(),
      reserveAmount: reserveAmount.toBigInt(),
      realisedPnl: realisedPnl.toBigInt(),
      lastIncreasedTime: lastIncreasedTimeBn,
    }
  }, contract))



  return { contract, getMinPrice, getMaxPrice, getTokenWeight, getTokenDebtUsd, totalTokenWeight, usdgAmount, getPosition }
}

const getPositionKey = (account: string, collateralToken: string, indexToken: string, isLong: boolean) => {
  return keccak256(
    ["address", "address", "address", "bool"],
    [account, collateralToken, indexToken, isLong]
  )
}
