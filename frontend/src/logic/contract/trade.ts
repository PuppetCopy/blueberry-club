import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, filter, map } from "@most/core"
import { getWalletProvider } from "../common"
import { ADDRESS_LEVERAGE, ARBITRUM_ADDRESS } from "@gambitdao/gmx-middleware"
import { combineArray } from "@aelea/core"
import { ERC20__factory } from "@gambitdao/gbc-contracts"
import { PositionRouter__factory, VaultPriceFeed__factory, VaultReader__factory, Vault__factory } from "./gmx-contracts"



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

export function connectPricefeed(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => VaultPriceFeed__factory.connect(ARBITRUM_ADDRESS.PositionRouter, w3p.getSigner()), provider)
  
  const account = filter((a): a is string => a !== null, wallet.account)

  const getPrice = (token: ADDRESS_LEVERAGE, maximize = false, incAmm = true) => map(async c => {
    const p = await c.getPrice(token, maximize, incAmm, false)

    return p.toBigInt()
  }, contract)


  return { contract, getPrice }
}

export function connectVault(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => Vault__factory.connect(ARBITRUM_ADDRESS.Vault, w3p.getSigner()), provider)
  
  const account = filter((a): a is string => a !== null, wallet.account)

  const getMaxPrice = (token: ADDRESS_LEVERAGE) => map(async c => {
    const p = await c.getMaxPrice(token)

    return p.toBigInt()
  }, contract)

  const tokenWeight = (token: ADDRESS_LEVERAGE) => map(async c => {
    const p = await c.tokenWeights(token)

    return p.toBigInt()
  }, contract)

  const getMinPrice = (token: ADDRESS_LEVERAGE) => map(async c => {
    const p = await c.getMinPrice(token)

    return p.toBigInt()
  }, contract)


  return { contract, getMinPrice, getMaxPrice, tokenWeight }
}
