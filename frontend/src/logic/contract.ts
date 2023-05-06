import { combineArray } from "@aelea/core"
import { BI_18_PRECISION, IAsset } from "@gambitdao/gbc-middleware"
import { ArbitrumAddress, AvalancheAddress, BASIS_POINTS_DIVISOR, TRADE_CONTRACT_MAPPING, intervalTimeMap } from "@gambitdao/gmx-middleware"
import { abi } from "@gambitdao/gmx-middleware"
import { awaitPromises, combine, map } from "@most/core"
import { Stream } from "@most/types"
import { erc20Abi } from "abitype/test"
import { Address, PublicClient } from "viem"
import { connectMappedContractConfig, contractReader } from "./common"


export type IGmxContractInfo = ReturnType<typeof connectGmxEarn>
export type IRewardsStream = IGmxContractInfo['stakingRewards']



const SECONDS_PER_YEAR = BigInt(intervalTimeMap.YEAR)

export const connectGmxEarn = (client: Stream<PublicClient>, accountAddress: Address, gmxPrice: Stream<bigint>, environmentContract: ArbitrumAddress | AvalancheAddress) => {

  const gmxReader = contractReader(connectMappedContractConfig(TRADE_CONTRACT_MAPPING, 'GMX', erc20Abi, client))
  const vaultReader = contractReader(connectMappedContractConfig(TRADE_CONTRACT_MAPPING, 'Vault', abi.vault, client))
  const glpManagerReader = contractReader(connectMappedContractConfig(TRADE_CONTRACT_MAPPING, 'GlpManager', abi.glpManager, client))
  const readerReader = contractReader(connectMappedContractConfig(TRADE_CONTRACT_MAPPING, 'Reader', abi.gmxReader, client))
  const rewardReader = contractReader(connectMappedContractConfig(TRADE_CONTRACT_MAPPING, 'RewardReader', abi.rewardReader, client))

  const gmxSupply = gmxReader('totalSupply')
  const stakedGmxSupply = gmxReader('balanceOf', environmentContract.StakedGmxTracker)
  const nativeTokenPrice = vaultReader('getMinPrice', environmentContract.NATIVE_TOKEN)
  const aum = glpManagerReader('getAum', true)

  const walletTokens = [environmentContract.GMX, environmentContract.ES_GMX, environmentContract.GLP, environmentContract.StakedGmxTracker] as const
  const tokenBalancesWithSupplies = readerReader('getTokenBalancesWithSupplies', accountAddress, walletTokens)


  const accountBalances = map(balances => {
    const keys = walletTokens
    const balanceData = {} as keysToObject<typeof walletTokens>
    const supplyData = {} as keysToObject<typeof walletTokens>
    const propsLength = 2

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      balanceData[key] = balances[i * propsLength]
      supplyData[key] = balances[i * propsLength + 1]
    }

    return { balanceData, supplyData }
  }, tokenBalancesWithSupplies)


  const balancesQuery = readerReader('getVestingInfo', accountAddress, [environmentContract.GmxVester])

  const gmxVestingInfo = map(balances => {
    const [pairAmount, vestedAmount, escrowedBalance, claimedAmounts, claimable, maxVestableAmount, averageStakedAmount] = balances

    return { pairAmount, vestedAmount, escrowedBalance, claimedAmounts, claimable, maxVestableAmount, averageStakedAmount }
  }, balancesQuery)

  const glpVestingInfo = map(balances => {
    const [pairAmount, vestedAmount, escrowedBalance, claimedAmounts, claimable, maxVestableAmount, averageStakedAmount] = balances

    return { pairAmount, vestedAmount, escrowedBalance, claimedAmounts, claimable, maxVestableAmount, averageStakedAmount }
  }, readerReader('getVestingInfo', accountAddress, [environmentContract.GlpVester]))

  const stakingTrackers = [
    environmentContract.StakedGmxTracker,
    environmentContract.BonusGmxTracker,
    environmentContract.FeeGmxTracker,
    environmentContract.StakedGlpTracker,
    environmentContract.FeeGlpTracker,
  ] as const

  const trackersQuery = rewardReader('getStakingInfo', accountAddress, stakingTrackers)

  const accountStaking = map(trackers => {
    return parseTrackerMap(trackers, ['claimable', 'tokensPerInterval', 'averageStakedAmounts', 'cumulativeRewards', 'totalSupply'] as const, stakingTrackers)
  }, trackersQuery)

  const tokens = [
    environmentContract.GMX,
    environmentContract.ES_GMX,
    environmentContract.StakedGmxTracker,
    environmentContract.BonusGmxTracker,
    environmentContract.BN_GMX,
    environmentContract.GLP,
  ] as const


  const depositBalancesQuery = rewardReader('getDepositBalances', accountAddress, tokens, [
    environmentContract.StakedGmxTracker,
    environmentContract.StakedGmxTracker,
    environmentContract.BonusGmxTracker,
    environmentContract.FeeGmxTracker,
    environmentContract.FeeGmxTracker,
    environmentContract.FeeGlpTracker,
  ])

  const depositbalances = map(balances => {
    return parseTrackerInfo(balances, tokens)
  }, depositBalancesQuery)


  const stakingRewards = combineArray(({ balanceData, supplyData }, depositbalances, accountStaking, gmxVesting, glpVesting, aum, nativeTokenPrice, stakedGmxSupply, gmxPrice) => {
    const gmxSupplyUsd = supplyData[environmentContract.GMX] * gmxPrice / BI_18_PRECISION
    const stakedGmxSupplyUsd = stakedGmxSupply * gmxPrice / BI_18_PRECISION
    const gmxInStakedGmx = depositbalances[environmentContract.GMX]
    const gmxInStakedGmxUsd = gmxInStakedGmx * gmxPrice / BI_18_PRECISION

    const stakedGmxTrackerSupply = supplyData[environmentContract.StakedGmxTracker]

    const stakedEsGmxSupply = stakedGmxTrackerSupply - stakedGmxSupply
    const stakedEsGmxSupplyUsd = stakedEsGmxSupply * gmxPrice / BI_18_PRECISION

    const glpBalance = depositbalances[environmentContract.GLP]
    const gmxBalance = depositbalances[environmentContract.GMX]


    const esGmxInStakedGmx = depositbalances[environmentContract.ES_GMX]
    const esGmxInStakedGmxUsd = esGmxInStakedGmx * gmxPrice / BI_18_PRECISION

    const bnGmxInFeeGmx = depositbalances[environmentContract.BN_GMX]
    const bonusGmxInFeeGmx = depositbalances[environmentContract.BonusGmxTracker]
    const feeGmxSupply = accountStaking[environmentContract.FeeGmxTracker].totalSupply
    const feeGmxSupplyUsd = feeGmxSupply * gmxPrice / BI_18_PRECISION

    const stakedGmxTrackerRewards = accountStaking[environmentContract.StakedGmxTracker].claimable
    const stakedGmxTrackerRewardsUsd = stakedGmxTrackerRewards * gmxPrice / BI_18_PRECISION

    const bonusGmxTrackerRewards = accountStaking[environmentContract.BonusGmxTracker].claimable

    const feeGmxTrackerRewards = accountStaking[environmentContract.FeeGmxTracker].claimable
    const feeGmxTrackerRewardsUsd = feeGmxTrackerRewards * nativeTokenPrice / BI_18_PRECISION

    const stakedGmxTrackerAnnualRewardsUsd = accountStaking[environmentContract.StakedGmxTracker].tokensPerInterval * SECONDS_PER_YEAR * gmxPrice / BI_18_PRECISION
    const gmxAprForEsGmxPercentage = stakedGmxSupplyUsd ? stakedGmxTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / stakedGmxSupplyUsd : 0n
    const feeGmxTrackerAnnualRewardsUsd = accountStaking[environmentContract.FeeGmxTracker].tokensPerInterval * SECONDS_PER_YEAR * nativeTokenPrice / BI_18_PRECISION
    const gmxAprForEthPercentage = feeGmxTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / feeGmxSupplyUsd
    const gmxAprTotalPercentage = gmxAprForEthPercentage + gmxAprForEsGmxPercentage

    const totalGmxRewardsUsd = stakedGmxTrackerRewardsUsd + feeGmxTrackerRewardsUsd

    const glpSupply = supplyData[environmentContract.GLP]
    const glpPrice = aum * BI_18_PRECISION / glpSupply
    const glpSupplyUsd = glpSupply * glpPrice / BI_18_PRECISION


    const stakedGlpTrackerRewards = accountStaking[environmentContract.StakedGlpTracker].claimable
    const stakedGlpTrackerRewardsUsd = stakedGlpTrackerRewards * gmxPrice / BI_18_PRECISION

    const feeGlpTrackerRewards = accountStaking[environmentContract.FeeGlpTracker].claimable
    const feeGlpTrackerRewardsUsd = feeGlpTrackerRewards * nativeTokenPrice / BI_18_PRECISION

    const stakedGlpTrackerAnnualRewardsUsd = accountStaking[environmentContract.StakedGlpTracker].tokensPerInterval * SECONDS_PER_YEAR * gmxPrice / BI_18_PRECISION
    const glpAprForEsGmxPercentage = stakedGlpTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / glpSupplyUsd
    const feeGlpTrackerAnnualRewardsUsd = accountStaking[environmentContract.FeeGlpTracker].tokensPerInterval * SECONDS_PER_YEAR * nativeTokenPrice / BI_18_PRECISION
    const glpAprForEthPercentage = feeGlpTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / glpSupplyUsd
    const glpAprTotalPercentage = glpAprForEthPercentage + glpAprForEsGmxPercentage


    const glpRewardsUsd = stakedGlpTrackerRewardsUsd + feeGlpTrackerRewardsUsd

    const totalEsGmxRewards = stakedGmxTrackerRewards + stakedGlpTrackerRewards
    const totalEsGmxRewardsUsd = stakedGmxTrackerRewardsUsd + stakedGlpTrackerRewardsUsd

    const totalVesterRewards = gmxVesting.claimable + glpVesting.claimable
    const totalVesterRewardsUsd = totalVesterRewards * gmxPrice / BI_18_PRECISION


    const totalFeeRewards = feeGmxTrackerRewards + feeGlpTrackerRewards
    const totalFeeRewardsUsd = feeGmxTrackerRewardsUsd + feeGlpTrackerRewardsUsd

    const totalRewardsUsd = totalEsGmxRewardsUsd + totalFeeRewardsUsd + totalVesterRewardsUsd


    const totalAprPercentage = (gmxAprTotalPercentage + glpAprTotalPercentage) / 2n

    return {
      glpBalance,

      // balanceData,
      gmxSupplyUsd,
      stakedGmxSupplyUsd,
      gmxInStakedGmx,
      gmxInStakedGmxUsd,
      stakedGmxTrackerSupply,
      stakedEsGmxSupply,
      stakedEsGmxSupplyUsd,

      esGmxInStakedGmx,
      esGmxInStakedGmxUsd,

      bnGmxInFeeGmx,
      bonusGmxInFeeGmx,
      feeGmxSupply,
      feeGmxSupplyUsd,
      stakedGmxTrackerRewards,
      stakedGmxTrackerRewardsUsd,
      bonusGmxTrackerRewards,
      feeGmxTrackerRewards,
      feeGmxTrackerRewardsUsd,
      stakedGmxTrackerAnnualRewardsUsd,
      gmxAprForEsGmxPercentage,
      feeGmxTrackerAnnualRewardsUsd,
      gmxAprForEthPercentage,
      gmxAprTotalPercentage,
      totalGmxRewardsUsd,

      glpSupply,
      glpPrice,
      glpSupplyUsd,
      stakedGlpTrackerRewards,
      stakedGlpTrackerRewardsUsd,

      feeGlpTrackerRewards,
      feeGlpTrackerRewardsUsd,
      stakedGlpTrackerAnnualRewardsUsd,
      glpAprForEsGmxPercentage,
      feeGlpTrackerAnnualRewardsUsd,
      glpAprForEthPercentage,
      glpAprTotalPercentage,
      glpRewardsUsd,

      totalEsGmxRewards,
      totalEsGmxRewardsUsd,
      totalVesterRewards,
      totalVesterRewardsUsd,

      totalFeeRewards,
      totalFeeRewardsUsd,
      totalRewardsUsd,
      totalAprPercentage,
    }
  }, accountBalances, depositbalances, accountStaking, gmxVestingInfo, glpVestingInfo, aum, nativeTokenPrice, stakedGmxSupply, gmxPrice)


  const nativeAssetBalance = awaitPromises(map(p => p.getBalance({ address: accountAddress }), client))
  const nativeAsset: Stream<IAsset> = combine((amount, price) => ({ balance: price * amount / BI_18_PRECISION }), nativeAssetBalance, nativeTokenPrice)


  return { nativeAsset, stakingRewards, accountStaking, depositbalances, stakedGmxSupply, gmxSupply, nativeTokenPrice, aum, accountBalances, gmxVestingInfo, glpVestingInfo }
}

function parseTrackerMap<T extends ReadonlyArray<string>, R extends ReadonlyArray<string>>(args: readonly bigint[], keys: T, trackers: R): { [K in R[number]]: keysToObject<T> } {
  return args.reduce((seed, next, idx) => {
    const trackersLength = trackers.length
    const k = trackers[Math.floor(idx / trackersLength)]

    seed[k] ??= {}

    const propIdx = idx % trackersLength
    seed[k][keys[propIdx]] = next

    return seed
  }, {} as any)
}

type keysToObject<KS extends ReadonlyArray<string>> = { [K in KS[number]]: bigint }

function parseTrackerInfo<T extends ReadonlyArray<string>>(args: readonly bigint[], keys: T): keysToObject<T> {

  return args.reduce((seed, next, idx) => {
    seed[keys[idx]] = next

    return seed
  }, {} as any)
}