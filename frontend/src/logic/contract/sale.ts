import { replayLatest } from "@aelea/core"
import { BigNumberish } from "@ethersproject/bignumber"
import { MerkleTpl__factory, PublicTpl__factory, HolderWhitelistTpl__factory, Sale__factory } from "@gambitdao/gbc-contracts"
import { periodicRun } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, map, multicast } from "@most/core"
import { getWalletProvider } from "../common"
import { web3ProviderTestnet } from "../provider"


export function connectSale(wallet: IWalletLink, saleAddress: string) {
  const provider = getWalletProvider(wallet)
  const contract = map(w3p => PublicTpl__factory.connect(saleAddress, w3p.getSigner()), provider)

  return { contract }
}

export function connectHolderWhitelistSale(wallet: IWalletLink, saleAddress: string) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => HolderWhitelistTpl__factory.connect(saleAddress, w3p.getSigner()), provider)

  const hasTokenUsed = (tokenId: BigNumberish) => awaitPromises(map(c => c.isNftUsed(tokenId), contract))
  const whitelistMinted = awaitPromises(map(c => c.totalNftMinted(), contract))

  return { contract, hasTokenUsed, whitelistMinted }
}

export function connectWhitelistSale(wallet: IWalletLink, saleAddress: string) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => MerkleTpl__factory.connect(saleAddress, w3p.getSigner()), provider)


  return { contract }
}

const sale = (address: string) => Sale__factory.connect(address, web3ProviderTestnet)


export const getMintCount = (address: string, updateInterval = 3500) => {
  const contract = sale(address)
  const count = replayLatest(multicast(periodicRun(updateInterval, map(async () => (await contract.totalMinted()).toBigInt()), true)))

  return count
}


