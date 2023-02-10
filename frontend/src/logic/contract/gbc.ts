import { GBC_ADDRESS } from "@gambitdao/gbc-middleware"
import { GBCLab__factory, GBC__factory } from "@gambitdao/gbc-contracts"
import { Closet__factory, Profile__factory } from "@gambitdao/gbc-contracts"
import { map } from "@most/core"
import { readContractMapping } from "../common"
import { Stream } from "@most/types"
import { BaseProvider } from "@ethersproject/providers"
import { CHAIN } from "@gambitdao/gmx-middleware"


export const GBC_CONTRACT_MAPPING = {
  [CHAIN.ARBITRUM]: {
    ...GBC_ADDRESS
  }
}


export function connectLab(provider: Stream<BaseProvider>) {

  const closet = readContractMapping(GBC_CONTRACT_MAPPING, Closet__factory, provider, 'CLOSET')
  const lab = readContractMapping(GBC_CONTRACT_MAPPING, GBCLab__factory, provider, 'LAB')
  const profile = readContractMapping(GBC_CONTRACT_MAPPING, Profile__factory, provider, 'PROFILE')
  const gbc = readContractMapping(GBC_CONTRACT_MAPPING, GBC__factory, provider, 'GBC')


  const main = (address: string) => profile.readInt(map(async (c) => {
    return (await c.getDataOf(address)).tokenId
  }))

  const ownersListBalance = (owners: string[], idList: number[]) => {
    return lab.run(map(async c => (await c.balanceOfBatch(owners, idList)).map(n => n.toNumber())))
  }


  const accountListBalance = (account: string, idList: number[]) => {
    const balanceList = lab.run(map(async c => {
      const orderedAccountList = [...idList].fill(account as any) as any as string[]

      return (await c.balanceOfBatch(orderedAccountList, idList)).map(n => n.toNumber())
    }))

    return map(list => {
      return list.map((amount, idx) => ({ amount: Number(amount), id: idList[idx] }))
    }, balanceList)
  }



  const tokenList = (account: string) => gbc.run(map(async c => {
    return (await c.walletOfOwner(account)).map(Number)
  }))

  // function getTokenSlots(token: BigNumberish) {

  //   return closet.run(map(async c => {
  //     return getBerryFromItems(
  //       (await c.contract.get(token, 0, 2)).map(bn => bn.toNumber())
  //     ) as IBerryLabItems
  //   }))
  // }

  // const getProfile = (account: string) => {

  //   const tokenId = profile.run(map(async (c) => {
  //     return (await c.contract.getDataOf(account)).tokenId.toBigInt()
  //   }))

  //   const pr = map(id => {
  //     return { ...await getTokenSlots(tokenId), tokenId }

  //   }, tokenId)

  //   return tokenId
  // }


  return { closet, ownersListBalance, accountListBalance, main, tokenList, lab, profile }
}


