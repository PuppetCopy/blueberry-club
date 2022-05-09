import { replayLatest } from "@aelea/core"
import { BigNumberish } from "@ethersproject/bignumber"
import { periodicRun } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, map, multicast } from "@most/core"
import { SaleExample__factory } from "contracts"
import { getWalletProvider } from "../common"
import { web3ProviderTestnet } from "../provider"


export function connectSale(wallet: IWalletLink, saleAddress: string) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => SaleExample__factory.connect(saleAddress, w3p.getSigner()), provider)

  const hasTokenUsed = (tokenId: BigNumberish) => awaitPromises(map(c => c.isAlreadyUsed(tokenId), contract))
  const whitelistMinted = awaitPromises(map(c => c.whitelistMinted(), contract))

  return { contract, hasTokenUsed, whitelistMinted }
}

const sale = (address: string) => SaleExample__factory.connect(address, web3ProviderTestnet)


export const getMintCount = (address: string, updateInterval = 3500) => {
  const contract = sale(address)
  const count = replayLatest(multicast(periodicRun(updateInterval, map(async () => (await contract.minted()).toBigInt()), true)))

  return count
}


