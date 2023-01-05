import { combineArray } from "@aelea/core"
import { BigNumber } from "@ethersproject/bignumber"
import { JsonRpcProvider } from "@ethersproject/providers"
import { BI_18_PRECISION } from "@gambitdao/gbc-middleware"
import { BASIS_POINTS_DIVISOR, getGmxTokenPrice, IGmxContractAddress, intervalTimeMap, TRADE_CONTRACT_MAPPING } from "@gambitdao/gmx-middleware"
import { awaitPromises, combine, map, now } from "@most/core"
import { Stream } from "@most/types"
import { IAsset } from "@gambitdao/gbc-middleware"
import { GlpManager__factory, GMX__factory, Reader__factory, RewardReader__factory, Vault__factory } from "./gmx-contracts"
import { getSafeMappedValue, readContract, readContractMapping } from "./common"


export type IGmxContractInfo = ReturnType<typeof connectGmxEarn>
export type IRewardsStream = IGmxContractInfo['stakingRewards']




const SECONDS_PER_YEAR = BigInt(intervalTimeMap.YEAR)

export const connectGmxEarn = (provider: Stream<JsonRpcProvider>, account: string, environmentContract: IGmxContractAddress) => {

  const gmx = readContractMapping(TRADE_CONTRACT_MAPPING, GMX__factory, provider, 'GMX')
  const vault = readContractMapping(TRADE_CONTRACT_MAPPING, Vault__factory, provider, 'Vault')
  const manager = readContractMapping(TRADE_CONTRACT_MAPPING, GlpManager__factory, provider, 'GlpManager')
  const reader = readContractMapping(TRADE_CONTRACT_MAPPING, Reader__factory, provider, 'Reader')
  const rewardReader = readContractMapping(TRADE_CONTRACT_MAPPING, RewardReader__factory, provider, 'RewardReader')


  const gmxSupply = gmx.readInt(map(c => c.totalSupply()))
  const stakedGmxSupply = gmx.readInt(map(c => c.balanceOf(environmentContract.StakedGmxTracker)))
  const nativeTokenPrice = vault.readInt(map(c => c.getMinPrice(environmentContract.NATIVE_TOKEN)))
  const aum = manager.readInt(map(c => c.getAum(true)))

  const accountBalances = reader.run(map(async (readerContract) => {
    const walletTokens = [environmentContract.GMX, environmentContract.ES_GMX, environmentContract.GLP, environmentContract.StakedGmxTracker] as const

    const balancesQuery = readerContract.getTokenBalancesWithSupplies(account, walletTokens as any)
    const balances = await balancesQuery

    const keys = walletTokens
    const balanceData = {} as keysToObject<typeof walletTokens>
    const supplyData = {} as keysToObject<typeof walletTokens>
    const propsLength = 2

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      balanceData[key] = balances[i * propsLength].toBigInt()
      supplyData[key] = balances[i * propsLength + 1].toBigInt()
    }

    return { balanceData, supplyData }
  }))

  const gmxVestingInfo = reader.run(map(async (contract) => {
    const balancesQuery = contract.getVestingInfo(account, [environmentContract.GmxVester])
    const [pairAmount, vestedAmount, escrowedBalance, claimedAmounts, claimable, maxVestableAmount, averageStakedAmount] = (await balancesQuery).map(x => x.toBigInt())

    return { pairAmount, vestedAmount, escrowedBalance, claimedAmounts, claimable, maxVestableAmount, averageStakedAmount }
  }))

  const glpVestingInfo = reader.run(map(async contract => {
    const balancesQuery = contract.getVestingInfo(account, [environmentContract.GlpVester])
    const [pairAmount, vestedAmount, escrowedBalance, claimedAmounts, claimable, maxVestableAmount, averageStakedAmount] = (await balancesQuery).map(x => x.toBigInt())

    return { pairAmount, vestedAmount, escrowedBalance, claimedAmounts, claimable, maxVestableAmount, averageStakedAmount }
  }))

  const accountStaking = rewardReader.run(map(contract => {
    const stakingTrackers = [
      environmentContract.StakedGmxTracker,
      environmentContract.BonusGmxTracker,
      environmentContract.FeeGmxTracker,
      environmentContract.StakedGlpTracker,
      environmentContract.FeeGlpTracker,
    ] as const

    const trackersQuery = contract.getStakingInfo(account, stakingTrackers as any)
    return parseTrackerMap(trackersQuery, ['claimable', 'tokensPerInterval', 'averageStakedAmounts', 'cumulativeRewards', 'totalSupply'] as const, stakingTrackers)
  }))

  const depositbalances = rewardReader.run(map(contract => {
    const tokens = [
      environmentContract.GMX,
      environmentContract.ES_GMX,
      environmentContract.StakedGmxTracker,
      environmentContract.BonusGmxTracker,
      environmentContract.BN_GMX,
      environmentContract.GLP,
    ] as const
    const balancesQuery = contract.getDepositBalances(account, tokens as any,
      [
        environmentContract.StakedGmxTracker,
        environmentContract.StakedGmxTracker,
        environmentContract.BonusGmxTracker,
        environmentContract.FeeGmxTracker,
        environmentContract.FeeGmxTracker,
        environmentContract.FeeGlpTracker,
      ]
    )

    return parseTrackerInfo(balancesQuery, tokens)
  }))


  const gmxPrice = getGmxTokenPrice(provider, nativeTokenPrice)


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


  const nativeAssetBalance = awaitPromises(map(async p => (await p.getBalance(account)).toBigInt(), provider))
  const nativeAsset: Stream<IAsset> = combine((amount, price) => ({ balance: price * amount / BI_18_PRECISION }), nativeAssetBalance, nativeTokenPrice)


  return { nativeAsset, stakingRewards, accountStaking, depositbalances, stakedGmxSupply, gmxSupply, nativeTokenPrice, aum, accountBalances, gmxVestingInfo, glpVestingInfo }
}

async function parseTrackerMap<T extends ReadonlyArray<string>, R extends ReadonlyArray<string>>(argsQuery: Promise<BigNumber[]>, keys: T, trackers: R): Promise<{ [K in R[number]]: keysToObject<T> }> {
  const args = await argsQuery
  return args.reduce((seed, next, idx) => {
    const trackersLength = trackers.length
    const k = trackers[Math.floor(idx / trackersLength)]

    seed[k] ??= {}

    const propIdx = idx % trackersLength
    seed[k][keys[propIdx]] = next.toBigInt()

    return seed
  }, {} as any)
}

type keysToObject<KS extends ReadonlyArray<string>> = { [K in KS[number]]: bigint }

async function parseTrackerInfo<T extends ReadonlyArray<string>>(argsQuery: Promise<BigNumber[]>, keys: T): Promise<keysToObject<T>> {
  const args = await argsQuery

  return args.reduce((seed, next, idx) => {
    seed[keys[idx]] = next.toBigInt()

    return seed
  }, {} as any)
}