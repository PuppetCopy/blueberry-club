import { combineArray } from "@aelea/core"
import { BigNumber } from "@ethersproject/bignumber"
import { BaseProvider } from "@ethersproject/providers"
import { USD_PRECISION } from "@gambitdao/gbc-middleware"
import { RewardReader__factory, GMX__factory, Reader__factory, EsGMX__factory, GlpManager__factory, Vault__factory } from "@gambitdao/gmx-contracts"
import { ARBITRUM_CONTRACT, AVALANCHE_CONTRACT, BASIS_POINTS_DIVISOR } from "@gambitdao/gmx-middleware"
import { awaitPromises, combine, fromPromise, map, now, take } from "@most/core"
import { Stream } from "@most/types"
import { IAsset } from "@gambitdao/gbc-middleware"
import { latestTokenPriceMap } from "./common"




export type ITreasuryAssetTotal = {
  eth: IAsset
  gmx: IAsset
  glp: IAsset
  totalUsd: bigint
}

export interface IAssetReward {
  apr: bigint
  value: bigint
  valueUsd: bigint
}

export type IGmxContractInfo = ReturnType<typeof initContractChain>
export type IRewardsStream = IGmxContractInfo['stakingRewards']




export const initContractChain = (provider: BaseProvider, account: string, environmentContract: typeof ARBITRUM_CONTRACT | typeof AVALANCHE_CONTRACT) => {
  const rewardReaderContract = RewardReader__factory.connect(environmentContract.RewardReader, provider)
  const readerContract = Reader__factory.connect(environmentContract.Reader, provider)
  const gmxContract = GMX__factory.connect(environmentContract.GMX, provider)
  const esGmxContract = EsGMX__factory.connect(environmentContract.ES_GMX, provider)
  const glpManagerContract = GlpManager__factory.connect(environmentContract.GlpManager, provider)
  const vaultContract = Vault__factory.connect(environmentContract.Vault, provider)



  const walletTokens = [
    environmentContract.GMX,
    environmentContract.ES_GMX,
    environmentContract.GLP,
    environmentContract.StakedGmxTracker,
  ] as const



  const stakedGmxSupply = awaitPromises(map(async () => {
    return (await gmxContract.balanceOf(environmentContract.StakedGmxTracker)).toBigInt()
  }, now(null)))

  const gmxSupply = awaitPromises(map(async () => {
    return (await gmxContract.totalSupply()).toBigInt()
  }, now(null)))

  const nativeTokenPrice = awaitPromises(map(async () => {
    return (await vaultContract.getMinPrice(environmentContract.NATIVE_TOKEN)).toBigInt()
  }, now(null)))

  const aum = awaitPromises(map(async () => {
    return (await glpManagerContract.getAum(true)).toBigInt()
  }, now(null)))

  const accountBalances = awaitPromises(map(async () => {
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
  }, now(null)))

  const gmxVestingInfo = awaitPromises(map(async () => {
    const balancesQuery = readerContract.getVestingInfo(account, [environmentContract.GmxVester])
    const [pairAmount, vestedAmount, escrowedBalance, claimedAmounts, claimable, maxVestableAmount, averageStakedAmount] = (await balancesQuery).map(x => x.toBigInt())

    return {
      pairAmount,
      vestedAmount,
      escrowedBalance,
      claimedAmounts,
      claimable,
      maxVestableAmount,
      averageStakedAmount,
    }

  }, now(null)))

  const glpVestingInfo = awaitPromises(map(async () => {
    const balancesQuery = readerContract.getVestingInfo(account, [environmentContract.GlpVester])
    const [pairAmount, vestedAmount, escrowedBalance, claimedAmounts, claimable, maxVestableAmount, averageStakedAmount] = (await balancesQuery).map(x => x.toBigInt())

    return {
      pairAmount,
      vestedAmount,
      escrowedBalance,
      claimedAmounts,
      claimable,
      maxVestableAmount,
      averageStakedAmount,
    }

  }, now(null)))

  const accountStaking = awaitPromises(map(async () => {
    const stakingTrackers = [
      environmentContract.StakedGmxTracker,
      environmentContract.BonusGmxTracker,
      environmentContract.FeeGmxTracker,
      environmentContract.StakedGlpTracker,
      environmentContract.FeeGlpTracker,
    ] as const

    const trackersQuery = rewardReaderContract.getStakingInfo(account, stakingTrackers as any)
    return parseTrackerMap(trackersQuery, ['claimable', 'tokensPerInterval', 'averageStakedAmounts', 'cumulativeRewards', 'totalSupply'] as const, stakingTrackers)
  }, now(null)))

  const depositbalances = awaitPromises(map(async () => {
    const tokens = [
      environmentContract.GMX,
      environmentContract.ES_GMX,
      environmentContract.StakedGmxTracker,
      environmentContract.BonusGmxTracker,
      environmentContract.BN_GMX,
      environmentContract.GLP,
    ] as const
    const balancesQuery = rewardReaderContract.getDepositBalances(account, tokens as any,
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
  }, now(null)))


  const SECONDS_PER_YEAR = 31540000n


  const latestPriceMapOnce = take(1, latestTokenPriceMap)
  const stakingRewards = combineArray(({ balanceData, supplyData }, depositbalances, accountStaking, gmxVesting, glpVesting, aum, nativeTokenPrice, stakedGmxSupply, priceMap) => {
    const gmxPrice = priceMap.gmx.value

    const gmxSupplyUsd = supplyData[environmentContract.GMX] * gmxPrice / USD_PRECISION
    const stakedGmxSupplyUsd = stakedGmxSupply * gmxPrice  / USD_PRECISION
    const gmxInStakedGmx = depositbalances[environmentContract.GMX]
    const gmxInStakedGmxUsd = gmxInStakedGmx * gmxPrice  / USD_PRECISION

    const stakedGmxTrackerSupply = supplyData[environmentContract.StakedGmxTracker]

    const stakedEsGmxSupply = stakedGmxTrackerSupply - stakedGmxSupply
    const stakedEsGmxSupplyUsd = stakedEsGmxSupply * gmxPrice / USD_PRECISION

    const glpBalance = depositbalances[environmentContract.GLP]
    const gmxBalance = depositbalances[environmentContract.GMX]


    const esGmxInStakedGmx = depositbalances[environmentContract.ES_GMX]
    const esGmxInStakedGmxUsd = esGmxInStakedGmx * gmxPrice / USD_PRECISION

    const bnGmxInFeeGmx = depositbalances[environmentContract.BN_GMX]
    const bonusGmxInFeeGmx = depositbalances[environmentContract.BonusGmxTracker]
    const feeGmxSupply = accountStaking[environmentContract.FeeGmxTracker].totalSupply
    const feeGmxSupplyUsd = feeGmxSupply * gmxPrice / USD_PRECISION

    const stakedGmxTrackerRewards = accountStaking[environmentContract.StakedGmxTracker].claimable
    const stakedGmxTrackerRewardsUsd = stakedGmxTrackerRewards * gmxPrice / USD_PRECISION

    const bonusGmxTrackerRewards = accountStaking[environmentContract.BonusGmxTracker].claimable

    const feeGmxTrackerRewards = accountStaking[environmentContract.FeeGmxTracker].claimable
    const feeGmxTrackerRewardsUsd = feeGmxTrackerRewards * nativeTokenPrice / USD_PRECISION

    const stakedGmxTrackerAnnualRewardsUsd = accountStaking[environmentContract.StakedGmxTracker].tokensPerInterval * SECONDS_PER_YEAR  * gmxPrice / USD_PRECISION
    const gmxAprForEsGmxPercentage = stakedGmxSupplyUsd ? stakedGmxTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / stakedGmxSupplyUsd : 0n
    const feeGmxTrackerAnnualRewardsUsd = accountStaking[environmentContract.FeeGmxTracker].tokensPerInterval * SECONDS_PER_YEAR * nativeTokenPrice  / USD_PRECISION
    const gmxAprForEthPercentage = feeGmxTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / feeGmxSupplyUsd
    const gmxAprTotalPercentage = gmxAprForEthPercentage + gmxAprForEsGmxPercentage

    const totalGmxRewardsUsd = stakedGmxTrackerRewardsUsd + feeGmxTrackerRewardsUsd

    const glpSupply = supplyData[environmentContract.GLP]
    const glpPrice = aum * USD_PRECISION / glpSupply
    const glpSupplyUsd = glpSupply * glpPrice / USD_PRECISION


    const stakedGlpTrackerRewards = accountStaking[environmentContract.StakedGlpTracker].claimable
    const stakedGlpTrackerRewardsUsd = stakedGlpTrackerRewards * gmxPrice / USD_PRECISION

    const feeGlpTrackerRewards = accountStaking[environmentContract.FeeGlpTracker].claimable
    const feeGlpTrackerRewardsUsd = feeGlpTrackerRewards * nativeTokenPrice / USD_PRECISION

    const stakedGlpTrackerAnnualRewardsUsd = accountStaking[environmentContract.StakedGlpTracker].tokensPerInterval * SECONDS_PER_YEAR * gmxPrice / USD_PRECISION
    const glpAprForEsGmxPercentage = stakedGlpTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / glpSupplyUsd
    const feeGlpTrackerAnnualRewardsUsd = accountStaking[environmentContract.FeeGlpTracker].tokensPerInterval * SECONDS_PER_YEAR * nativeTokenPrice / USD_PRECISION
    const glpAprForEthPercentage = feeGlpTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / glpSupplyUsd
    const glpAprTotalPercentage = glpAprForEthPercentage + glpAprForEsGmxPercentage


    const glpRewardsUsd = stakedGlpTrackerRewardsUsd + feeGlpTrackerRewardsUsd

    const totalEsGmxRewards = stakedGmxTrackerRewards + stakedGlpTrackerRewards
    const totalEsGmxRewardsUsd = stakedGmxTrackerRewardsUsd + stakedGlpTrackerRewardsUsd

    const totalVesterRewards = gmxVesting.claimable + glpVesting.claimable
    const totalVesterRewardsUsd = totalVesterRewards * gmxPrice / USD_PRECISION


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
  }, accountBalances, depositbalances, accountStaking, gmxVestingInfo, glpVestingInfo, aum, nativeTokenPrice, stakedGmxSupply, latestPriceMapOnce)


  const nativeAssetBalance = map(bn => bn.toBigInt(), fromPromise(provider.getBalance(account)))
  const nativeAsset: Stream<IAsset> = combine((amount, price) => ({ balance: price * amount / USD_PRECISION }), nativeAssetBalance, nativeTokenPrice)


  return {
    nativeAsset,
    stakingRewards,
    accountStaking,
    depositbalances,
    stakedGmxSupply,
    gmxSupply,
    nativeTokenPrice,
    aum,
    accountBalances,
    gmxVestingInfo,
    glpVestingInfo,
  }

}



async function parseTrackerMap<T extends ReadonlyArray<string>, R extends ReadonlyArray<string>>(argsQuery: Promise<BigNumber[]>, keys: T, trackers: R): Promise<{[K in R[number]]: keysToObject<T>}> {
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