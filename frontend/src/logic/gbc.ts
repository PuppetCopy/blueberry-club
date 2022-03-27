import { combineArray, replayLatest } from "@aelea/core"
import { GBC_ADDRESS, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { multicast, awaitPromises, map, filter } from "@most/core"
import { GBC__factory, GBCLab__factory, Manager__factory, Profile__factory, Sale__factory } from "contracts"


function getProvider(wallet: IWalletLink,) {
  return replayLatest(multicast(awaitPromises(combineArray(async w3p => {
    if (w3p === null) {
      throw new Error('no Ethereum Provider available')
    }

    if (w3p?.network?.chainId !== USE_CHAIN) {
      throw new Error(`Please connect to ${NETWORK_METADATA[USE_CHAIN].chainName} network`)
    }

    return w3p
  }, wallet.provider))))
}

export function connectLab(wallet: IWalletLink) {
  const provider = getProvider(wallet)

  const contract = map(w3p => GBCLab__factory.connect(GBC_ADDRESS.LAB, w3p.getSigner()), provider)
  const account = filter((a): a is string => a !== null, wallet.account)

  const itemList = awaitPromises(combineArray(async (account, contract) => {
    return (await contract.walletOfOwner(account)).map(x => x.toNumber())
  }, account, contract))


  return { contract, itemList }
}


export function connectSale(wallet: IWalletLink, saleAddress: string) {
  const provider = getProvider(wallet)

  const contract = map(w3p => Sale__factory.connect(saleAddress, w3p.getSigner()), provider)


  return { contract }
}


export function connectManager(wallet: IWalletLink) {
  const provider = getProvider(wallet)

  const contract = map(w3p => Manager__factory.connect(GBC_ADDRESS.MANAGER, w3p.getSigner()), provider)
  const profileContract = map(w3p => Profile__factory.connect(GBC_ADDRESS.MANAGER, w3p.getSigner()), provider)
  const account = filter((a): a is string => a !== null, wallet.account)

  const mainItems = combineArray(async (profile, contract, address) => {
    const mainId = (await profile.getMain(address)).toBigInt()
    return mainId === 0n ? null : contract.itemsOf(mainId)
  }, profileContract, contract, account)

  return { contract, mainItems }
}

export function connectGbc(wallet: IWalletLink) {
  const provider = getProvider(wallet)

  const contract = map(w3p => GBC__factory.connect(GBC_ADDRESS.GBC, w3p.getSigner()), provider)
  
  const account = filter((a): a is string => a !== null, wallet.account)

  const tokenList = awaitPromises(combineArray(async (account, contract) => {
    return (await contract.walletOfOwner(account)).map(x => x.toNumber())
  }, account, contract))

  return { tokenList, contract }
}


