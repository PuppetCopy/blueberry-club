import { combineArray } from "@aelea/core"
import { DEPLOYED_CONTRACT, TREASURY_ARBITRUM, TREASURY_AVALANCHE, USD_PRECISION } from "@gambitdao/gbc-middleware"
import { ERC20__factory } from "@gambitdao/gmx-contracts"
import { ARBITRUM_CONTRACT, AVALANCHE_CONTRACT, AVALANCHE_TRADEABLE_ADDRESS, expandDecimals } from "@gambitdao/gmx-middleware"
import { fromPromise, map } from "@most/core"
import { latestTokenPriceMap } from "./common"
import { initContractChain, mergeContractAccountInfo } from "./contract"
import { w3p, w3pAva } from "./provider"

const wethContract = ERC20__factory.connect(AVALANCHE_TRADEABLE_ADDRESS.WETHE, w3pAva)

export const gbcContractEthBalance = map(x => x.toBigInt(), fromPromise(w3p.getBalance(DEPLOYED_CONTRACT)))
export const vaultArbitrumEthBalance = map(x => x.toBigInt(), fromPromise(w3p.getBalance(TREASURY_ARBITRUM)))
export const vaultAvalancheEthBalance = map(x => x.toBigInt(), fromPromise(wethContract.balanceOf(TREASURY_AVALANCHE)))


export const arbitrumContract = initContractChain(w3p, TREASURY_ARBITRUM, ARBITRUM_CONTRACT)
export const avalancheContract = initContractChain(w3pAva, TREASURY_AVALANCHE, AVALANCHE_CONTRACT)

export const treasuryContract = mergeContractAccountInfo(arbitrumContract, avalancheContract)

export const totalHodlingsUsd = combineArray((contractEthBalance, vaultArbitrumEthBalance, vaultAvalancheEthBalance, stakingRewards, priceMap) => {
  const totalEth = vaultArbitrumEthBalance + contractEthBalance + vaultAvalancheEthBalance + stakingRewards.totalEthRewards
  const ethInGbcContractUsd = totalEth * priceMap.eth.value / USD_PRECISION
  const totalGmx = stakingRewards.gmxInStakedGmx + stakingRewards.esGmxInStakedGmx + stakingRewards.totalEsGmxRewards
  // const totalAvax = stakingRewards.totalAvaxRewards

  const gmxInStakedGmxUsd = totalGmx * priceMap.gmx.value / USD_PRECISION
  const glpInStakedGlpUsd = expandDecimals(priceMap.glp.value * stakingRewards.glpBalance / USD_PRECISION, 12)


  return ethInGbcContractUsd + gmxInStakedGmxUsd + glpInStakedGlpUsd
}, gbcContractEthBalance, vaultArbitrumEthBalance, vaultAvalancheEthBalance,  treasuryContract.stakingRewards, latestTokenPriceMap)

