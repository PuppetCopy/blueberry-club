import { GBC_ADDRESS } from "@gambitdao/gbc-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { awaitPromises, filter, map } from "@most/core"
import { Closet__factory, Profile__factory } from "contracts"
import { getWalletProvider } from "../common"
import { web3ProviderTestnet } from "../provider"

export const manager = Closet__factory.connect(GBC_ADDRESS.CLOSET, web3ProviderTestnet)
export const profile = Profile__factory.connect(GBC_ADDRESS.PROFILE, web3ProviderTestnet)


export const getProfile = async (address: string) => {
  const tokenId = (await profile.getDataOf(address)).tokenId.toBigInt()
  const { background, custom, special } = await manager.itemsOf(tokenId)
  return {
    background: Number(background),
    custom: Number(custom),
    special: Number(special),
    tokenId: tokenId > 0 ? Number(tokenId) : null
  }
}

export function connectManager(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)

  const contract = map(w3p => Closet__factory.connect(GBC_ADDRESS.CLOSET, w3p.getSigner()), provider)
  const profileContract = map(w3p => Profile__factory.connect(GBC_ADDRESS.PROFILE, w3p.getSigner()), provider)
  const account = filter((a): a is string => a !== null, wallet.account)

  const main = (address: string) => awaitPromises(map(async contract => {
    return (await contract.getDataOf(address)).tokenId.toBigInt()
  }, profileContract))

  return { contract, profileContract, main }
}