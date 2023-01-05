import { combineArray, replayLatest } from "@aelea/core"
import { GBC_ADDRESS, BI_18_PRECISION, } from "@gambitdao/gbc-middleware"
import { ARBITRUM_ADDRESS, AVALANCHE_ADDRESS, getTokenUsd, getGmxArbiPrice, TOKEN_DESCRIPTION_MAP } from "@gambitdao/gmx-middleware"
import { awaitPromises, map, multicast } from "@most/core"
import { readContract } from "./common"
import { IGmxContractInfo, connectGmxEarn } from "./contract"
import { IERC20__factory, VaultPriceFeed__factory } from "./gmx-contracts"
import { arbGlobalProviderEvent, avaGlobalProviderEvent } from "./provider"



export const vaultArbitrumEthBalance = awaitPromises(map(async p => (await p.getBalance(GBC_ADDRESS.TREASURY_ARBITRUM)).toBigInt(), arbGlobalProviderEvent))
export const arbWethContract = awaitPromises(map(async (provider) => {
  return (await IERC20__factory.connect(ARBITRUM_ADDRESS.NATIVE_TOKEN, provider).balanceOf(GBC_ADDRESS.TREASURY_ARBITRUM)).toBigInt()
}, arbGlobalProviderEvent))

export const avalancheWethContract = awaitPromises(map(async provider => {
  return (await IERC20__factory.connect(AVALANCHE_ADDRESS.WETHE, provider).balanceOf(GBC_ADDRESS.TREASURY_AVALANCHE)).toBigInt()
}, avaGlobalProviderEvent))
export const vaultAvalancheAvaxBalance = awaitPromises(map(async provider => (await provider.getBalance(GBC_ADDRESS.TREASURY_AVALANCHE)).toBigInt(), avaGlobalProviderEvent))

const arbPricefeed = readContract(VaultPriceFeed__factory, arbGlobalProviderEvent, ARBITRUM_ADDRESS.VaultPriceFeed)
const avaxPricefeed = readContract(VaultPriceFeed__factory, avaGlobalProviderEvent, AVALANCHE_ADDRESS.VaultPriceFeed)



const globalMapPrice = replayLatest(multicast(awaitPromises(combineArray(async (provider, arb, ava) => {
  const queryEthPrice = arb.getPrimaryPrice(ARBITRUM_ADDRESS.NATIVE_TOKEN, false)
  const queryAvaxPrice = ava.getPrimaryPrice(AVALANCHE_ADDRESS.NATIVE_TOKEN, false)
  const eth = (await queryEthPrice).toBigInt()
  const gmx = await getGmxArbiPrice(provider, eth)
  const avax = (await queryAvaxPrice).toBigInt()

  return { gmx, eth, avax }
}, arbGlobalProviderEvent, arbPricefeed, avaxPricefeed))))


export const arbitrumContract: IGmxContractInfo = connectGmxEarn(arbGlobalProviderEvent, GBC_ADDRESS.TREASURY_ARBITRUM, ARBITRUM_ADDRESS)
export const avalancheContract: IGmxContractInfo = connectGmxEarn(avaGlobalProviderEvent, GBC_ADDRESS.TREASURY_AVALANCHE, AVALANCHE_ADDRESS)


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


