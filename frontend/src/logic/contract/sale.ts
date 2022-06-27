import { replayLatest } from "@aelea/core"
import { BigNumberish } from "@ethersproject/bignumber"
import { Whitelist__factory, Holder__factory, Public__factory, Mintable__factory } from "@gambitdao/gbc-contracts"
import { MintRule } from "@gambitdao/gbc-middleware"
import { periodicRun } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, map, multicast, skipRepeats } from "@most/core"
import { getWalletProvider, takeUntilLast } from "../common"
import { web3Provider } from "../provider"


export function connectMintable(wallet: IWalletLink, saleAddress: string) {
  const provider = getWalletProvider(wallet)
  const contract = map(w3p => Mintable__factory.connect(saleAddress, w3p.getSigner()), provider)

  return { contract }
}

export function connectPublic(wallet: IWalletLink, saleAddress: string) {
  const provider = getWalletProvider(wallet)
  const contract = map(w3p => Public__factory.connect(saleAddress, w3p.getSigner()), provider)

  return { contract }
}

export function connectHolderSale(wallet: IWalletLink, saleAddress: string) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => Holder__factory.connect(saleAddress, w3p.getSigner()), provider)

  const hasTokenUsed = (tokenId: BigNumberish) => awaitPromises(map(c => c.isNftUsed(tokenId), contract))
  const whitelistMinted = awaitPromises(map(c => c.totalNftMinted(), contract))

  return { contract, hasTokenUsed, whitelistMinted }
}

export function connectPrivateSale(wallet: IWalletLink, saleAddress: string) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => Whitelist__factory.connect(saleAddress, w3p.getSigner()), provider)


  return { contract }
}

const sale = (address: string) => Mintable__factory.connect(address, web3Provider)


export const getMintCount = (rule: MintRule, updateInterval = 1500) => {
  const contract = sale(rule.contractAddress)
  const count = periodicRun(updateInterval, map(async () => (await contract.totalMinted()).toNumber()), true)
  const countUntil = takeUntilLast(c => rule.supply === c, count)

  return skipRepeats(replayLatest(multicast(countUntil)))
}


