import { combineArray, combineObject, replayLatest } from "@aelea/core"
import { GBC_CONTRACT, LAB_ITEMS_CONTRACT, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { multicast, awaitPromises, map, filter } from "@most/core"
import { GBC__factory, GBCLabsItems__factory } from "contracts"



export function connect(wallet: IWalletLink) {
  const contract = replayLatest(multicast(awaitPromises(combineArray(async w3p => {
    if (w3p === null || w3p?.network?.chainId !== USE_CHAIN) {
      throw new Error('Unable to connect ')
    }

    const gbc = GBC__factory.connect(GBC_CONTRACT, w3p.getSigner())
    const items = GBCLabsItems__factory.connect(LAB_ITEMS_CONTRACT, w3p.getSigner())

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


