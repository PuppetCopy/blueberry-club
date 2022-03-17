import { replayLatest, combineArray, combineObject } from "@aelea/core"
import { USE_CHAIN, GBC_ADDRESS } from "@gambitdao/gbc-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { multicast, awaitPromises, filter, map } from "@most/core"
import { GBC__factory, GBCLab__factory } from "contracts"
import { web3ProviderTestnet } from "./provider"


export const itemsGlobal = GBCLab__factory.connect(GBC_ADDRESS.LAB, web3ProviderTestnet)

export function connectWallet(wallet: IWalletLink) {
  const contract = replayLatest(multicast(awaitPromises(combineArray(async w3p => {
    if (w3p === null || w3p?.network?.chainId !== USE_CHAIN) {
      throw new Error('Unable to connect ')
    }

    const gbc = GBC__factory.connect(GBC_ADDRESS.GBC, w3p.getSigner())
    const items = GBCLab__factory.connect(GBC_ADDRESS.LAB, w3p.getSigner())

    return { gbc, items }
  }, wallet.provider))))
  

  const account = filter((a): a is string => a !== null, wallet.account)

  const gbcWallet = combineObject({ account, contract })

  const tokenList = awaitPromises(map(async ({ account, contract }) => {
    return (await contract.gbc.walletOfOwner(account)).map(x => x.toNumber())
  }, gbcWallet))
  const ownedItemList = awaitPromises(map(async ({ account, contract }) => {
    return (await contract.items.walletOfOwner(account)).map(x => x.toNumber())
  }, gbcWallet))

  return { contract, tokenList, ownedItemList }
}


