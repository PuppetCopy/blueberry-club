import { IERC20__factory } from "@gambitdao/gbc-contracts"
import { IWalletLink } from "@gambitdao/wallet-link"
import { filter, map } from "@most/core"
import { getWalletProvider } from "../common"
import { connectGbc } from "./gbc"


export function connectRewardDistributor(wallet: IWalletLink) {
  const provider = getWalletProvider(wallet)
  const gbc = connectGbc(wallet)

  const contract = map(w3p => IERC20__factory.connect('GBC_ADDRESS.REWARD_DISTRIBUTOR', w3p.getSigner()), provider)
  const account = filter((a): a is string => a !== null, wallet.account)

  // const hasTokenUsed = (tokenId: BigNumberish) => awaitPromises(map(c => c.ownerOf(tokenId), contract))

  // const earned = switchLatest(combineArray((c, account) => {
  //   return periodicRun(5500, map(async x => {
  //     const newLocal = (await c.earned(account)).toBigInt()

  //     console.log(newLocal)
  //     return newLocal
  //   }))
  // }, contract, account))
  
  
  // const tokenBalance = awaitPromises(combineArray(async (c, account) => (await c.balanceOf(account)).toBigInt(), contract, account))
  // const stakeBalance = awaitPromises(combineArray(async (c, account) => (await c.balanceOf(account)).toBigInt(), contract, account))

  // const rewardPerToken = awaitPromises(map(async (c) => (await c.rewardPerToken()).toBigInt(), contract))
  // const lastTimeRewardApplicable = awaitPromises(map((c) => c.lastTimeRewardApplicable(), contract))
  // const totalSupply = awaitPromises(map(async (c) => (await c.totalSupply()).toBigInt(), contract))
  // const rewardRate = awaitPromises(map(async c => (await c.rewardRate()).toBigInt(), contract))

  // const isApprovedForAll = awaitPromises(combineArray(async (account, contract, gbc) => {
  //   return gbc.isApprovedForAll(account, GBC_ADDRESS.REWARD_DISTRIBUTOR)
  // }, account, contract, gbc.contract))


  return { contract }
}




