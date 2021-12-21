import { combineArray, combineObject, nullSink, O } from "@aelea/core"
import { BigNumber } from "@ethersproject/bignumber"
import { DEPLOYED_CONTRACT, GLP_DECIMALS, TREASURY, USD_PRECISION } from "@gambitdao/gbc-middleware"
import { RewardReader__factory, GMX__factory, Reader__factory, EsGMX__factory, GlpManager__factory, Vault__factory } from "@gambitdao/gmx-contracts"
import { ARBITRUM_ADDRESS, BASIS_POINTS_DIVISOR, expandDecimals, formatFixed, FUNDING_RATE_PRECISION, parseFixed, readableNumber } from "@gambitdao/gmx-middleware"
import { awaitPromises, combine, fromPromise, map, now, switchLatest } from "@most/core"
import { newDefaultScheduler } from "@most/scheduler"
import { GBC__factory } from "contracts"
import { w3p } from "./provider"
import { queryLatestPrices } from "./query"
import { CHAIN } from "@gambitdao/wallet-link"
import { Contract } from "@ethersproject/contracts"


export const gbc = GBC__factory.connect(DEPLOYED_CONTRACT, w3p)

const rewardReaderContract = RewardReader__factory.connect(ARBITRUM_ADDRESS.RewardReader, w3p)
const readerContract = Reader__factory.connect(ARBITRUM_ADDRESS.Reader, w3p)
const gmxContract = GMX__factory.connect(ARBITRUM_ADDRESS.GMX, w3p)
const esGmxContract = EsGMX__factory.connect(ARBITRUM_ADDRESS.ES_GMX, w3p)
const glpManagerContract = GlpManager__factory.connect(ARBITRUM_ADDRESS.GlpManager, w3p)
const vaultContract = Vault__factory.connect(ARBITRUM_ADDRESS.Vault, w3p)




const walletTokens = [
  ARBITRUM_ADDRESS.GMX,
  ARBITRUM_ADDRESS.ES_GMX,
  ARBITRUM_ADDRESS.GLP,
  ARBITRUM_ADDRESS.StakedGmxTracker,
] as const



export const stakedGmxSupply = awaitPromises(map(async () => {
  return (await gmxContract.balanceOf(ARBITRUM_ADDRESS.StakedGmxTracker)).toBigInt()
}, now(null)))

export const gmxSupply = awaitPromises(map(async () => {
  return (await gmxContract.totalSupply()).toBigInt()
}, now(null)))

export const nativeTokenPrice = awaitPromises(map(async () => {
  return (await vaultContract.getMinPrice(ARBITRUM_ADDRESS.NATIVE_TOKEN)).toBigInt()
}, now(null)))

export const aum = awaitPromises(map(async () => {
  return (await glpManagerContract.getAum(true)).toBigInt()
}, now(null)))

export const accountBalances = awaitPromises(map(async () => {
  const balancesQuery = readerContract.getTokenBalancesWithSupplies(TREASURY, walletTokens as any)
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


export const gmxVestingInfo = awaitPromises(map(async () => {
  const balancesQuery = readerContract.getVestingInfo(TREASURY, [ARBITRUM_ADDRESS.GmxVester])
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

export const glpVestingInfo = awaitPromises(map(async () => {
  const balancesQuery = readerContract.getVestingInfo(TREASURY, [ARBITRUM_ADDRESS.GlpVester])
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



export const accountStaking = awaitPromises(map(async () => {
  const stakingTrackers = [
    ARBITRUM_ADDRESS.StakedGmxTracker,
    ARBITRUM_ADDRESS.BonusGmxTracker,
    ARBITRUM_ADDRESS.FeeGmxTracker,
    ARBITRUM_ADDRESS.StakedGlpTracker,
    ARBITRUM_ADDRESS.FeeGlpTracker,
  ] as const

  const trackersQuery = rewardReaderContract.getStakingInfo(TREASURY, stakingTrackers as any)
  return parseTrackerMap(trackersQuery, ['claimable', 'tokensPerInterval', 'averageStakedAmounts', 'cumulativeRewards', 'totalSupply'] as const, stakingTrackers)
}, now(null)))

export const depositbalances = awaitPromises(map(async () => {
  const tokens = [
    ARBITRUM_ADDRESS.GMX,
    ARBITRUM_ADDRESS.ES_GMX,
    ARBITRUM_ADDRESS.StakedGmxTracker,
    ARBITRUM_ADDRESS.BonusGmxTracker,
    ARBITRUM_ADDRESS.BN_GMX,
    ARBITRUM_ADDRESS.GLP,
  ] as const
  const balancesQuery = rewardReaderContract.getDepositBalances(TREASURY, tokens as any,
    [
      ARBITRUM_ADDRESS.StakedGmxTracker,
      ARBITRUM_ADDRESS.StakedGmxTracker,
      ARBITRUM_ADDRESS.BonusGmxTracker,
      ARBITRUM_ADDRESS.FeeGmxTracker,
      ARBITRUM_ADDRESS.FeeGmxTracker,
      ARBITRUM_ADDRESS.FeeGlpTracker,
    ])

  return parseTrackerInfo(balancesQuery, tokens)
}, now(null)))



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


export type ITreasuryAsset = {
  price: bigint
  balance: bigint
  balanceUsd: bigint
}

export interface IAssetReward {
  apr: bigint
  value: bigint
  valueUsd: bigint
}



const tokenPriceMap = fromPromise(queryLatestPrices())

export const accountTokenBalances = switchLatest(map(priceMap => {
  const balanceEthBn = combine((a, b) => a.toBigInt() + b.toBigInt(), fromPromise(w3p.getBalance(DEPLOYED_CONTRACT)), fromPromise(w3p.getBalance(TREASURY)))

  const gmx = map((dp): ITreasuryAsset => {
    const balance = dp[ARBITRUM_ADDRESS.GMX]
    return { price: priceMap.gmx, balance, balanceUsd: balance * priceMap.gmx / USD_PRECISION }
  }, depositbalances)

  const glp = map((dp): ITreasuryAsset => {
    const price = priceMap.glp
    const balance = dp[ARBITRUM_ADDRESS.GLP]
    const balanceUsd = expandDecimals(balance * price / USD_PRECISION, 12)
    
    return { price, balance, balanceUsd }
  }, depositbalances)

  const eth = map((n): ITreasuryAsset => {
    const price = parseFixed(Number(priceMap.eth) / 1e8, 30)
    return { price, balance: n, balanceUsd: n * price / USD_PRECISION }
  }, balanceEthBn)

  return combineObject({ eth, glp, gmx, totalUsd: combineArray((a, b, c) => a.balanceUsd + b.balanceUsd + c.balanceUsd, eth, glp, gmx) })
}, tokenPriceMap))

const SECONDS_PER_YEAR = 31540000n


export const stakingRewards = combineArray(({ balanceData, supplyData }, depositbalances, accountStaking, gmxVesting, glpVesting, aum, nativeTokenPrice, stakedGmxSupply, priceMap) => {


  const gmxSupplyUsd = supplyData[ARBITRUM_ADDRESS.GMX] * priceMap.gmx / USD_PRECISION
  const stakedGmxSupplyUsd = stakedGmxSupply * priceMap.gmx / USD_PRECISION
  const gmxInStakedGmx = depositbalances[ARBITRUM_ADDRESS.StakedGmxTracker]
  const gmxInStakedGmxUsd = gmxInStakedGmx * priceMap.gmx / USD_PRECISION



  const stakedGmxTrackerSupply = supplyData[ARBITRUM_ADDRESS.StakedGmxTracker]
  const stakedEsGmxSupply = stakedGmxTrackerSupply - stakedGmxSupply
  const stakedEsGmxSupplyUsd = stakedEsGmxSupply * priceMap.gmx / USD_PRECISION

  const esGmxInStakedGmx = depositbalances[ARBITRUM_ADDRESS.ES_GMX]
  const esGmxInStakedGmxUsd = esGmxInStakedGmx * priceMap.gmx / USD_PRECISION

  const bnGmxInFeeGmx = depositbalances[ARBITRUM_ADDRESS.BN_GMX]
  const bonusGmxInFeeGmx = depositbalances[ARBITRUM_ADDRESS.BonusGmxTracker]
  const feeGmxSupply = accountStaking[ARBITRUM_ADDRESS.FeeGmxTracker].totalSupply
  const feeGmxSupplyUsd = feeGmxSupply * priceMap.gmx / USD_PRECISION

  const stakedGmxTrackerRewards = accountStaking[ARBITRUM_ADDRESS.StakedGmxTracker].claimable
  const stakedGmxTrackerRewardsUsd = stakedGmxTrackerRewards * priceMap.gmx / USD_PRECISION

  const bonusGmxTrackerRewards = accountStaking[ARBITRUM_ADDRESS.BonusGmxTracker].claimable

  const feeGmxTrackerRewards = accountStaking[ARBITRUM_ADDRESS.FeeGmxTracker].claimable
  const feeGmxTrackerRewardsUsd = feeGmxTrackerRewards * nativeTokenPrice / USD_PRECISION

  const stakedGmxTrackerAnnualRewardsUsd = accountStaking[ARBITRUM_ADDRESS.StakedGmxTracker].tokensPerInterval * SECONDS_PER_YEAR  * priceMap.gmx / USD_PRECISION
  const gmxAprForEsGmxPercentage = stakedGmxTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / stakedGmxSupplyUsd
  const feeGmxTrackerAnnualRewardsUsd = accountStaking[ARBITRUM_ADDRESS.FeeGmxTracker].tokensPerInterval * SECONDS_PER_YEAR * nativeTokenPrice  / USD_PRECISION
  const gmxAprForEthPercentage = feeGmxTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / feeGmxSupplyUsd
  const gmxAprTotalPercentage = gmxAprForEthPercentage + gmxAprForEsGmxPercentage

  const totalGmxRewardsUsd = stakedGmxTrackerRewardsUsd + feeGmxTrackerRewardsUsd

  const glpSupply = supplyData[ARBITRUM_ADDRESS.GLP]
  const glpPrice = aum * USD_PRECISION / glpSupply
  const glpSupplyUsd = glpSupply * glpPrice / USD_PRECISION


  const stakedGlpTrackerRewards = accountStaking[ARBITRUM_ADDRESS.StakedGlpTracker].claimable
  const stakedGlpTrackerRewardsUsd = stakedGlpTrackerRewards * priceMap.gmx / USD_PRECISION

  const feeGlpTrackerRewards = accountStaking[ARBITRUM_ADDRESS.FeeGlpTracker].claimable
  const feeGlpTrackerRewardsUsd = feeGlpTrackerRewards * nativeTokenPrice / USD_PRECISION

  const stakedGlpTrackerAnnualRewardsUsd = accountStaking[ARBITRUM_ADDRESS.StakedGlpTracker].tokensPerInterval * SECONDS_PER_YEAR * priceMap.gmx / USD_PRECISION
  const glpAprForEsGmxPercentage = stakedGlpTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / glpSupplyUsd
  const feeGlpTrackerAnnualRewardsUsd = accountStaking[ARBITRUM_ADDRESS.FeeGlpTracker].tokensPerInterval * SECONDS_PER_YEAR * nativeTokenPrice / USD_PRECISION
  const glpAprForEthPercentage = feeGlpTrackerAnnualRewardsUsd * BASIS_POINTS_DIVISOR / glpSupplyUsd
  const glpAprTotalPercentage = glpAprForEthPercentage + glpAprForEsGmxPercentage


  const glpRewardsUsd = stakedGlpTrackerRewardsUsd + feeGlpTrackerRewardsUsd

  const totalEsGmxRewards = stakedGmxTrackerRewards + stakedGlpTrackerRewards
  const totalEsGmxRewardsUsd = stakedGmxTrackerRewardsUsd + stakedGlpTrackerRewardsUsd

  const totalVesterRewards = gmxVesting.claimable + glpVesting.claimable
  const totalVesterRewardsUsd = totalVesterRewards * priceMap.gmx / USD_PRECISION


  const totalEthRewards = feeGmxTrackerRewards + feeGlpTrackerRewards
  const totalEthRewardsUsd = feeGmxTrackerRewardsUsd + feeGlpTrackerRewardsUsd

  const totalRewardsUsd = totalEsGmxRewardsUsd + totalEthRewardsUsd + totalVesterRewardsUsd


  const totalAprPercentage = (gmxAprTotalPercentage + glpAprTotalPercentage) / 2n

  return {
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

    totalEthRewards,
    totalEthRewardsUsd,
    totalRewardsUsd,
    totalAprPercentage,
  }
}, accountBalances, depositbalances, accountStaking, gmxVestingInfo, glpVestingInfo, aum, nativeTokenPrice, stakedGmxSupply, tokenPriceMap)




// import { Token as UniToken, } from '@uniswap/sdk-core'
// import { Pool, ADDRESS_ZERO } from '@uniswap/v3-sdk'

// import aaa from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'


// const www = aaa.abi


// console.log(ADDRESS_ZERO)



// const uniV3Pool = new Contract("0x80A9ae39310abf666A87C743d6ebBD0E8C42158E", www, w3p)

// async function getGmxPrice() {
//   const s1 = await uniV3Pool.slot0()

//   debugger

//   const tokenA = new UniToken(CHAIN.ARBITRUM, ARBITRUM_ADDRESS.NATIVE_TOKEN, 18, "SYMBOL", "NAME")
//   const tokenB = new UniToken(CHAIN.ARBITRUM, ARBITRUM_ADDRESS.GMX, 18, "SYMBOL", "NAME")

//   const pool = new Pool(
//     tokenA, // tokenA
//     tokenB, // tokenB
//     10000, // fee
//     uniV3Pool.sqrtPriceX96, // sqrtRatioX96
//     1, // liquidity
//     uniV3Pool.tick, // tickCurrent
//     []
//   )
// }

// getGmxPrice()