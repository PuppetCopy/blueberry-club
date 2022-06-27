import { PositionRouter__factory } from "./trade/PositionRouter__factory"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, filter, map } from "@most/core"
import { getWalletProvider } from "../common"
import { ARBITRUM_ADDRESS } from "@gambitdao/gmx-middleware"
import { ERC20__factory } from "@gambitdao/gmx-contracts"
import { combineArray } from "@aelea/core"



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

  const increasePosition = map(c => {
    
    c.createIncreasePositionETH

  }, contract)


  return { contract }
}
