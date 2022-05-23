import { combineArray } from "@aelea/core"
import { GBC_ADDRESS } from "@gambitdao/gbc-middleware"
import { GBC__factory } from "@gambitdao/gbc-contracts"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, filter, map } from "@most/core"
import { getWalletProvider } from "../common"




export function connectGbc(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => GBC__factory.connect(GBC_ADDRESS.GBC, w3p.getSigner()), provider)
  
  const account = filter((a): a is string => a !== null, wallet.account)

  const tokenList = awaitPromises(combineArray(async (account, contract) => {
    return (await contract.walletOfOwner(account)).map(x => x.toNumber())
  }, account, contract))

  return { tokenList, contract }
}
