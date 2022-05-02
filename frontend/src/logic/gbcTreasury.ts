import { combineArray } from "@aelea/core"
import { GBC_ADDRESS, BI_18_PRECISION } from "@gambitdao/gbc-middleware"
import { ARBITRUM_ADDRESS, AVALANCHE_ADDRESS } from "@gambitdao/gmx-middleware"
import { fromPromise, map } from "@most/core"
import { ERC20__factory } from "contracts"
import { latestTokenPriceMap } from "./common"
import { IGmxContractInfo, initContractChain } from "./contract"
import { web3Provider, w3pAva } from "./provider"

const avalancheWethContract = ERC20__factory.connect(AVALANCHE_ADDRESS.WETHE, w3pAva)

export const gbcContractEthBalance = map(x => x.toBigInt(), fromPromise(web3Provider.getBalance(GBC_ADDRESS.GBC)))
export const vaultArbitrumEthBalance = map(x => x.toBigInt(), fromPromise(web3Provider.getBalance(GBC_ADDRESS.TREASURY_ARBITRUM)))
export const vaultAvalancheEthBalance = map(x => x.toBigInt(), fromPromise(avalancheWethContract.balanceOf(GBC_ADDRESS.TREASURY_AVALANCHE)))
export const vaultAvalancheAvaxBalance = map(x => x.toBigInt(), fromPromise(w3pAva.getBalance(GBC_ADDRESS.TREASURY_AVALANCHE)))


export const arbitrumContract: IGmxContractInfo = initContractChain(web3Provider, GBC_ADDRESS.TREASURY_ARBITRUM, ARBITRUM_ADDRESS)
export const avalancheContract: IGmxContractInfo = initContractChain(w3pAva, GBC_ADDRESS.TREASURY_AVALANCHE, AVALANCHE_ADDRESS)


export const totalWalletHoldingsUsd = combineArray((contractEthBalance, vaultArbitrumEthBalance, vaultAvalancheEthBalance, vaultAvaxBalance, avalancheStakingRewards, latestPrice) => {
  const totalEth = contractEthBalance + vaultArbitrumEthBalance + vaultAvalancheEthBalance
  const ethInGbcContractUsd = totalEth * latestPrice.eth.value / BI_18_PRECISION
  const vaultAvaxUsd = vaultAvaxBalance * latestPrice.avax.value / BI_18_PRECISION


  return ethInGbcContractUsd + avalancheStakingRewards + vaultAvaxUsd
}, gbcContractEthBalance, vaultArbitrumEthBalance, vaultAvalancheEthBalance, vaultAvalancheAvaxBalance, getTotalStakingInUsd(arbitrumContract, avalancheContract), latestTokenPriceMap)


function getTotalStakingInUsd(a: IGmxContractInfo, b: IGmxContractInfo) {
  return combineArray((aStakingRewards, bStakingRewards, latestPrice) => {
    const totalGmx = bStakingRewards.gmxInStakedGmx + bStakingRewards.esGmxInStakedGmx + aStakingRewards.gmxInStakedGmx + aStakingRewards.esGmxInStakedGmx

    const gmxInStakedGmxUsd = totalGmx * latestPrice.gmx.value / BI_18_PRECISION
    const glpInStakedGlpUsd = aStakingRewards.glpPrice * aStakingRewards.glpBalance / BI_18_PRECISION + bStakingRewards.glpPrice * bStakingRewards.glpBalance / BI_18_PRECISION

    const totalPendingRewardsUsd = bStakingRewards.totalRewardsUsd + aStakingRewards.totalRewardsUsd

    return gmxInStakedGmxUsd + glpInStakedGlpUsd + totalPendingRewardsUsd
  }, a.stakingRewards, b.stakingRewards, latestTokenPriceMap)
}


