import { combineArray } from "@aelea/core"
import { GBC_ADDRESS } from "@gambitdao/gbc-middleware"
import { GBCLab__factory } from "@gambitdao/gbc-contracts"
import { IWalletLink } from "@gambitdao/wallet-link"
import { filter, awaitPromises, map } from "@most/core"
import { getWalletProvider } from "../common"

export function connectLab(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => GBCLab__factory.connect(GBC_ADDRESS.LAB, w3p.getSigner()), provider)
  const account = filter((a): a is string => a !== null, wallet.account)


  return { contract }
}
