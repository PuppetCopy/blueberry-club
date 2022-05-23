import { PositionRouter__factory } from "./trade/PositionRouter__factory"
import { IWalletLink } from "@gambitdao/wallet-link"
import { filter, map } from "@most/core"
import { getWalletProvider } from "../common"
import { ARBITRUM_ADDRESS } from "@gambitdao/gmx-middleware"
import { ERC20__factory } from "@gambitdao/gmx-contracts"



export function connectTrade(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => PositionRouter__factory.connect(ARBITRUM_ADDRESS.PositionRouter, w3p.getSigner()), provider)
  const erc20Balance = map(w3p => ERC20__factory.connect(ARBITRUM_ADDRESS.PositionRouter, w3p.getSigner()), provider)
  
  const account = filter((a): a is string => a !== null, wallet.account)



  // const tokenList = awaitPromises(combineArray(async (account, contract) => {
      
  //   contract.createIncreasePositionETH()
  //   return (await contract.walletOfOwner(account)).map(x => x.toNumber())
  // }, account, contract))

  return { contract }
}
