import { combineArray, replayLatest } from "@aelea/core"
import { GBC_ADDRESS, BI_18_PRECISION, } from "@gambitdao/gbc-middleware"
import { ARBITRUM_ADDRESS, AVALANCHE_ADDRESS, getTokenUsd, getGmxArbiPrice, TOKEN_DESCRIPTION_MAP } from "@gambitdao/gmx-middleware"
import { awaitPromises, fromPromise, map, multicast, now } from "@most/core"
import { readContract } from "./common"
import { IGmxContractInfo, connectGmxEarn } from "./contract"
import { IERC20__factory, VaultPriceFeed__factory } from "./gmx-contracts"
import { arbGlobalProvider, avaGlobalProvider } from "./provider"



export const vaultArbitrumEthBalance = awaitPromises(map(async p => (await p.getBalance(GBC_ADDRESS.TREASURY_ARBITRUM)).toBigInt(), now(arbGlobalProvider)))
export const arbWethContract = awaitPromises(map(async () => {
  return (await IERC20__factory.connect(ARBITRUM_ADDRESS.NATIVE_TOKEN, arbGlobalProvider).balanceOf(GBC_ADDRESS.TREASURY_ARBITRUM)).toBigInt()
}, now(null)))

export const avalancheWethContract = awaitPromises(map(async () => {
  return (await IERC20__factory.connect(AVALANCHE_ADDRESS.WETHE, avaGlobalProvider).balanceOf(GBC_ADDRESS.TREASURY_AVALANCHE)).toBigInt()
}, now(null)))
export const vaultAvalancheAvaxBalance = map(x => x.toBigInt(), fromPromise(avaGlobalProvider.getBalance(GBC_ADDRESS.TREASURY_AVALANCHE)))

const arbPricefeed = readContract(VaultPriceFeed__factory, now(arbGlobalProvider), ARBITRUM_ADDRESS.VaultPriceFeed)
const avaxPricefeed = readContract(VaultPriceFeed__factory, now(avaGlobalProvider), AVALANCHE_ADDRESS.VaultPriceFeed)



const globalMapPrice = replayLatest(multicast(awaitPromises(combineArray(async (arb, ava) => {
  const queryEthPrice = arb.getPrimaryPrice(ARBITRUM_ADDRESS.NATIVE_TOKEN, false)
  const queryAvaxPrice = ava.getPrimaryPrice(AVALANCHE_ADDRESS.NATIVE_TOKEN, false)
  const eth = (await queryEthPrice).toBigInt()
  
  const gmx = await getGmxArbiPrice(arbGlobalProvider, eth)
  const avax = (await queryAvaxPrice).toBigInt()

  return { gmx, eth, avax }
}, arbPricefeed, avaxPricefeed))))


export const arbitrumContract: IGmxContractInfo = connectGmxEarn(now(arbGlobalProvider), GBC_ADDRESS.TREASURY_ARBITRUM, ARBITRUM_ADDRESS)
export const avalancheContract: IGmxContractInfo = connectGmxEarn(now(avaGlobalProvider), GBC_ADDRESS.TREASURY_AVALANCHE, AVALANCHE_ADDRESS)


export const totalWalletHoldingsUsd = combineArray((wethArbi, vaultArbitrumEthBalance, vaultAvalancheEthBalance, vaultAvaxBalance, avalancheStakingRewards, latestPrice) => {
  const totalEth = wethArbi + vaultArbitrumEthBalance + vaultAvalancheEthBalance
  const ethInGbcContractUsd = getTokenUsd(totalEth, latestPrice.eth, TOKEN_DESCRIPTION_MAP.ETH.decimals)
  const vaultAvaxUsd = getTokenUsd(vaultAvaxBalance, latestPrice.avax, TOKEN_DESCRIPTION_MAP.AVAX.decimals)

  return ethInGbcContractUsd + avalancheStakingRewards + vaultAvaxUsd
}, arbWethContract, vaultArbitrumEthBalance, avalancheWethContract, vaultAvalancheAvaxBalance, getTotalStakingInUsd(arbitrumContract, avalancheContract), globalMapPrice)


function getTotalStakingInUsd(a: IGmxContractInfo, b: IGmxContractInfo) {
  return combineArray((aStakingRewards, bStakingRewards, pmap) => {
    const totalGmx = bStakingRewards.gmxInStakedGmx + bStakingRewards.esGmxInStakedGmx + aStakingRewards.gmxInStakedGmx + aStakingRewards.esGmxInStakedGmx
    const gmxInStakedGmxUsd = totalGmx * pmap.gmx / BI_18_PRECISION
    const glpInStakedGlpUsd = aStakingRewards.glpPrice * aStakingRewards.glpBalance / BI_18_PRECISION + bStakingRewards.glpPrice * bStakingRewards.glpBalance / BI_18_PRECISION
    const totalPendingRewardsUsd = bStakingRewards.totalRewardsUsd + aStakingRewards.totalRewardsUsd

    return gmxInStakedGmxUsd + glpInStakedGlpUsd + totalPendingRewardsUsd
  }, a.stakingRewards, b.stakingRewards, globalMapPrice)
}


