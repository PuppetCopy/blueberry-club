import { GBC_ADDRESS, abi } from "@gambitdao/gbc-middleware"
import { map } from "@most/core"
import {  contractReader, getBerryFromItems, getMappedValue } from "../common"
import { Stream } from "@most/types"
import { CHAIN } from "@gambitdao/const"
import { Address, PublicClient } from "viem"
import { erc20Abi } from "abitype/test"


export const GBC_CONTRACT_MAPPING = {
  [CHAIN.ARBITRUM]: {
    ...GBC_ADDRESS
  }
}


export function connectLab(client: Stream<PublicClient>) {

  const closetReader = contractReader({ address: getMappedValue(GBC_CONTRACT_MAPPING, 'CLOSET', client), abi: abi.closet, client })
  const labReader = contractReader({ address: getMappedValue(GBC_CONTRACT_MAPPING, 'LAB', client), abi: abi.lab, client })
  const profileReader = contractReader({ address: getMappedValue(GBC_CONTRACT_MAPPING, 'PROFILE', client), abi: abi.profile, client })
  const erc721Reader = contractReader({ address: getMappedValue(GBC_CONTRACT_MAPPING, 'GBC', client), abi: abi.gbc, client })


  const main = (address: Address) => profileReader('getDataOf', address)

  const ownersListBalance = (owners: Address[], idList: bigint[]) => labReader('balanceOfBatch', owners, idList)

  const accountListBalance = (account: Address, idList: bigint[]) => {
    const accounts = [...idList].map(() => account)
    const balanceList = labReader('balanceOfBatch', accounts, idList)

    return map(list => {
      return list.map((amount, idx) => ({ amount: Number(amount), id: idList[idx] }))
    }, balanceList)
  }


  const tokenList = (account: Address) => erc721Reader('walletOfOwner', account)


  // const getTokenSlots = (token: bigint) => getBerryFromItems(closetReader('get', token, 0n, 2n))
 
  // const getProfile = (account: Address) => profileReader('getDataOf', account)

  // const getProfile = (account: Address) => {

  //   const tokenId = profile.run(map(async (c) => {
  //     return (await c.contract.getDataOf(account)).tokenId.toBigInt()
  //   }))

  //   const pr = map(id => {
  //     return { ...await getTokenSlots(tokenId), tokenId }

  //   }, tokenId)

  //   return tokenId
  // }


  return { closet: closetReader, ownersListBalance, accountListBalance, main, tokenList, lab: labReader, profile: profileReader }
}


