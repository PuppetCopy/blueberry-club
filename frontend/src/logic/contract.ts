import { combineArray } from "@aelea/core"
import { BigNumber } from "@ethersproject/bignumber"
import { BaseProvider } from "@ethersproject/providers"
import { USD_PRECISION } from "@gambitdao/gbc-middleware"
import { RewardReader__factory, GMX__factory, Reader__factory, EsGMX__factory, GlpManager__factory, Vault__factory } from "@gambitdao/gmx-contracts"
import { ARBITRUM_CONTRACT, AVALANCHE_CONTRACT, BASIS_POINTS_DIVISOR } from "@gambitdao/gmx-middleware"
import { awaitPromises, combine, fromPromise, map, now, take } from "@most/core"
import { Stream } from "@most/types"
import { latestTokenPriceMap } from "./common"
import { IPricefeedLatest } from "./query"



export type IAssetBalance = {
  price: bigint
  balance: bigint
  balanceUsd: bigint
}

export type ITreasuryAssetTotal = {
  eth: IAssetBalance
  gmx: IAssetBalance
  glp: IAssetBalance
  totalUsd: bigint
}

export interface IAssetReward {
  apr: bigint
  value: bigint
  valueUsd: bigint
}

export type IGmxContractInfo = ReturnType<typeof initContractChain>




export const initContractChain = (provider: BaseProvider, account: string, environmentContract: typeof ARBITRUM_CONTRACT | typeof AVALANCHE_CONTRACT, latestNativeFeed: Stream<IPricefeedLatest>) => {
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
      ])

    return parseTrackerInfo(balancesQuery, tokens)
  }, now(null)))


  const SECONDS_PER_YEAR = 31540000n


  const latestPriceMapOnce = take(1, latestTokenPriceMap)
  const stakingRewards = combineArray(({ balanceData, supplyData }, depositbalances, accountStaking, gmxVesting, glpVesting, aum, nativeTokenPrice, stakedGmxSupply, priceMap) => {
    const gmxPrice = priceMap.gmx.value

    const gmxSupplyUsd = supplyData[environmentContract.GMX] * gmxPrice / USD_PRECISION
    const stakedGmxSupplyUsd = stakedGmxSupply * gmxPrice  / USD_PRECISION
    const gmxInStakedGmx = depositbalances[environmentContract.StakedGmxTracker]
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


  const balanceEthBn = map(bn => bn.toBigInt(), fromPromise(provider.getBalance(account)))
  
  const nativeAsset =  combine((n, latestNativePrice): IAssetBalance => {
    const price = latestNativePrice.value
    return { price, balance: n, balanceUsd: n * price / USD_PRECISION }
  }, balanceEthBn, latestNativeFeed)


  return {
    nativeAsset,
    latestNativeFeed,
    // accountTokenBalances,
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



export function mergeContractAccountInfo(a: IGmxContractInfo, b: IGmxContractInfo) {

  const stakingRewards = combineArray((arbi, avax) => {
    const bnGmxInFeeGmx = arbi.bnGmxInFeeGmx + avax.bnGmxInFeeGmx
    const bonusGmxInFeeGmx = arbi.bonusGmxInFeeGmx + avax.bonusGmxInFeeGmx
    const bonusGmxTrackerRewards = arbi.bonusGmxTrackerRewards + avax.bonusGmxTrackerRewards
    const esGmxInStakedGmx = arbi.esGmxInStakedGmx + avax.esGmxInStakedGmx
    const esGmxInStakedGmxUsd = arbi.esGmxInStakedGmxUsd + avax.esGmxInStakedGmxUsd

    const feeGlpTrackerAnnualRewardsUsd = arbi.feeGlpTrackerAnnualRewardsUsd + avax.feeGlpTrackerAnnualRewardsUsd
    const feeGlpTrackerRewards = arbi.feeGlpTrackerRewards + avax.feeGlpTrackerRewards
    const feeGlpTrackerRewardsUsd = arbi.feeGlpTrackerRewardsUsd + avax.feeGlpTrackerRewardsUsd
    const feeGmxSupply = arbi.feeGmxSupply + avax.feeGmxSupply
    const feeGmxSupplyUsd = arbi.feeGmxSupplyUsd + avax.feeGmxSupplyUsd
    const feeGmxTrackerAnnualRewardsUsd = arbi.feeGmxTrackerAnnualRewardsUsd + avax.feeGmxTrackerAnnualRewardsUsd
    const feeGmxTrackerRewards = arbi.feeGmxTrackerRewards + avax.feeGmxTrackerRewards
    const feeGmxTrackerRewardsUsd = arbi.feeGmxTrackerRewardsUsd + avax.feeGmxTrackerRewardsUsd

    const glpAprForEsGmxPercentage = (arbi.glpAprForEsGmxPercentage + avax.glpAprForEsGmxPercentage) / 2n
    const glpAprForEthPercentage = (arbi.glpAprForEthPercentage + avax.glpAprForEthPercentage) / 2n
    const glpAprTotalPercentage = (arbi.glpAprTotalPercentage + avax.glpAprTotalPercentage) / 2n
    const glpPrice = (arbi.glpPrice + avax.glpPrice) / 2n
    const glpRewardsUsd = arbi.glpRewardsUsd + avax.glpRewardsUsd
    const glpSupply = (arbi.glpSupply + avax.glpSupply) / 2n
    const glpSupplyUsd = arbi.glpSupplyUsd + avax.glpSupplyUsd
    const gmxAprForEsGmxPercentage = (arbi.gmxAprForEsGmxPercentage + avax.gmxAprForEsGmxPercentage) / 2n
    const totalVesterRewardsUsd = arbi.totalVesterRewardsUsd + avax.totalVesterRewardsUsd
    const totalVesterRewards = arbi.totalVesterRewards + avax.totalVesterRewards
    const totalRewardsUsd = arbi.totalRewardsUsd + avax.totalRewardsUsd
    const totalGmxRewardsUsd = arbi.totalGmxRewardsUsd + avax.totalGmxRewardsUsd

    const totalEthRewardsUsd = arbi.totalFeeRewardsUsd + avax.totalFeeRewardsUsd
    const totalEthRewards = arbi.totalFeeRewards
    const totalAvaxRewards = avax.totalFeeRewards

    const totalEsGmxRewardsUsd = arbi.totalEsGmxRewardsUsd + avax.totalEsGmxRewardsUsd
    const totalEsGmxRewards = arbi.totalEsGmxRewards + avax.totalEsGmxRewards
    const totalAprPercentage = (arbi.totalAprPercentage + avax.totalAprPercentage) / 2n
    const stakedGmxTrackerSupply = arbi.stakedGmxTrackerSupply + avax.stakedGmxTrackerSupply
    const stakedGmxTrackerRewardsUsd = arbi.stakedGmxTrackerRewardsUsd + avax.stakedGmxTrackerRewardsUsd
    const stakedGmxTrackerRewards = arbi.stakedGmxTrackerRewards + avax.stakedGmxTrackerRewards
    const stakedGmxTrackerAnnualRewardsUsd = arbi.stakedGmxTrackerAnnualRewardsUsd + avax.stakedGmxTrackerAnnualRewardsUsd
    const stakedGmxSupplyUsd = arbi.stakedGmxSupplyUsd + avax.stakedGmxSupplyUsd
    const stakedGlpTrackerRewardsUsd = arbi.stakedGlpTrackerRewardsUsd + avax.stakedGlpTrackerRewardsUsd
    const gmxAprTotalPercentage = (arbi.gmxAprTotalPercentage + avax.gmxAprTotalPercentage) / 2n
    const gmxAprForEthPercentage = (arbi.gmxAprForEthPercentage + avax.gmxAprForEthPercentage) / 2n
    const gmxInStakedGmx = arbi.gmxInStakedGmx + avax.gmxInStakedGmx
    const gmxInStakedGmxUsd = arbi.gmxInStakedGmxUsd + avax.gmxInStakedGmxUsd
    const glpBalance = arbi.glpBalance + avax.glpBalance



    return {
      bnGmxInFeeGmx, bonusGmxInFeeGmx, bonusGmxTrackerRewards, esGmxInStakedGmx, esGmxInStakedGmxUsd, feeGlpTrackerAnnualRewardsUsd, feeGlpTrackerRewards, feeGlpTrackerRewardsUsd, feeGmxSupply, feeGmxSupplyUsd,
      feeGmxTrackerAnnualRewardsUsd, feeGmxTrackerRewards, feeGmxTrackerRewardsUsd, glpAprForEsGmxPercentage, glpAprForEthPercentage, glpAprTotalPercentage, glpPrice, glpRewardsUsd, glpSupply, glpSupplyUsd, 
      gmxAprForEsGmxPercentage, totalVesterRewardsUsd, 
      totalVesterRewards, totalRewardsUsd, totalGmxRewardsUsd, totalEthRewardsUsd, totalEsGmxRewardsUsd, totalEsGmxRewards, totalAprPercentage, stakedGmxTrackerSupply, stakedGmxTrackerRewardsUsd, stakedGmxTrackerRewards, stakedGmxTrackerAnnualRewardsUsd, stakedGmxSupplyUsd, stakedGlpTrackerRewardsUsd,

      gmxAprTotalPercentage, gmxAprForEthPercentage, gmxInStakedGmx, gmxInStakedGmxUsd, glpBalance,
      totalEthRewards, totalAvaxRewards,
    }
  }, a.stakingRewards, b.stakingRewards)


  return {
    // accountTokenBalances,
    aum: combine((a, b) => a + b, a.aum, b.aum),
    stakingRewards
  }
}


function mergeAssetBalance(a: IAssetBalance, b: IAssetBalance): IAssetBalance {
  return {
    balance: a.balance + b.balance,
    balanceUsd: a.balanceUsd + b.balanceUsd,
    price: (a.price + b.price) / 2n
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