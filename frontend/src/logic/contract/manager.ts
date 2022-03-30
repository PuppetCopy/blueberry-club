import { combineArray } from "@aelea/core"
import { GBC_ADDRESS } from "@gambitdao/gbc-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { filter, map } from "@most/core"
import { Manager__factory, Profile__factory } from "contracts"
import { getWalletProvider } from "../common"


export function connectManager(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => Manager__factory.connect(GBC_ADDRESS.MANAGER, w3p.getSigner()), provider)
  const profileContract = map(w3p => Profile__factory.connect(GBC_ADDRESS.MANAGER, w3p.getSigner()), provider)
  const account = filter((a): a is string => a !== null, wallet.account)

  const mainItems = combineArray(async (profile, contract, address) => {
    const mainId = (await profile.getMain(address)).toBigInt()
    return mainId === 0n ? null : contract.itemsOf(mainId)
  }, profileContract, contract, account)

  return { contract, mainItems }
}