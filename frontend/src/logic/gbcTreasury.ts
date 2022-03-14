import { combineArray } from "@aelea/core"
import { GBC_CONTRACT, TREASURY_ARBITRUM, TREASURY_AVALANCHE, USD_PRECISION } from "@gambitdao/gbc-middleware"
import { ERC20__factory } from "@gambitdao/gmx-contracts"
import { ARBITRUM_CONTRACT, AVALANCHE_CONTRACT, AVALANCHE_TRADEABLE_ADDRESS } from "@gambitdao/gmx-middleware"
import { fromPromise, map } from "@most/core"
import { latestTokenPriceMap } from "./common"
import { IGmxContractInfo, initContractChain } from "./contract"
import { web3Provider, w3pAva } from "./provider"

const avalancheWethContract = ERC20__factory.connect(AVALANCHE_TRADEABLE_ADDRESS.WETHE, w3pAva)

export const gbcContractEthBalance = map(x => x.toBigInt(), fromPromise(web3Provider.getBalance(GBC_CONTRACT)))
export const vaultArbitrumEthBalance = map(x => x.toBigInt(), fromPromise(web3Provider.getBalance(TREASURY_ARBITRUM)))
export const vaultAvalancheEthBalance = map(x => x.toBigInt(), fromPromise(avalancheWethContract.balanceOf(TREASURY_AVALANCHE)))
export const vaultAvalancheAvaxBalance = map(x => x.toBigInt(), fromPromise(w3pAva.getBalance(TREASURY_AVALANCHE)))


export const arbitrumContract: IGmxContractInfo = initContractChain(web3Provider, TREASURY_ARBITRUM, ARBITRUM_CONTRACT)
export const avalancheContract: IGmxContractInfo = initContractChain(w3pAva, TREASURY_AVALANCHE, AVALANCHE_CONTRACT)


export const totalWalletHoldingsUsd = combineArray((contractEthBalance, vaultArbitrumEthBalance, vaultAvalancheEthBalance, vaultAvaxBalance, avalancheStakingRewards, latestPrice) => {
  const totalEth = contractEthBalance + vaultArbitrumEthBalance + vaultAvalancheEthBalance
  const ethInGbcContractUsd = totalEth * latestPrice.eth.value / USD_PRECISION
  const vaultAvaxUsd = vaultAvaxBalance * latestPrice.avax.value / USD_PRECISION


  return ethInGbcContractUsd + avalancheStakingRewards + vaultAvaxUsd
}, gbcContractEthBalance, vaultArbitrumEthBalance, vaultAvalancheEthBalance, vaultAvalancheAvaxBalance, getTotalStakingInUsd(arbitrumContract, avalancheContract), latestTokenPriceMap)


function getTotalStakingInUsd(a: IGmxContractInfo, b: IGmxContractInfo) {
  return combineArray((aStakingRewards, bStakingRewards, latestPrice) => {
    const totalGmx = bStakingRewards.gmxInStakedGmx + bStakingRewards.esGmxInStakedGmx + aStakingRewards.gmxInStakedGmx + aStakingRewards.esGmxInStakedGmx

    const gmxInStakedGmxUsd = totalGmx * latestPrice.gmx.value / USD_PRECISION
    const glpInStakedGlpUsd = aStakingRewards.glpPrice * aStakingRewards.glpBalance / USD_PRECISION + bStakingRewards.glpPrice * bStakingRewards.glpBalance / USD_PRECISION

    const totalPendingRewardsUsd = bStakingRewards.totalRewardsUsd + aStakingRewards.totalRewardsUsd

    return gmxInStakedGmxUsd + glpInStakedGlpUsd + totalPendingRewardsUsd
  }, a.stakingRewards, b.stakingRewards, latestTokenPriceMap)
}


