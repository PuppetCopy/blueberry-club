import { combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { BigNumber } from "@ethersproject/bignumber"
import { DEPLOYED_CONTRACT, GLP_DECIMALS, TREASURY, USD_PRECISION } from "@gambitdao/gbc-middleware"
import { RewardReader__factory } from "@gambitdao/gmx-contracts"
import { ARBITRUM_ADDRESS, expandDecimals, formatFixed, formatReadableUSD, parseFixed, readableNumber, USD_DECIMALS } from "@gambitdao/gmx-middleware"
import { awaitPromises, combine, fromPromise, map, multicast, now, switchLatest } from "@most/core"
import { GBC__factory } from "contracts"
import { w3p } from "./provider"
import { queryLatestPrices } from "./query"

export const gbc = GBC__factory.connect(DEPLOYED_CONTRACT, w3p)

const rewardReaderContract = RewardReader__factory.connect('0xe725Ad0ce3eCf68A7B93d8D8091E83043Ff12e9A', w3p)


const rewardReader = O(awaitPromises, multicast, replayLatest)

export const stakingInfo = rewardReader(map(async () => {
  const stakingTrackers = [
    ARBITRUM_ADDRESS.StakedGmxTracker,
    ARBITRUM_ADDRESS.BonusGmxTracker,
    ARBITRUM_ADDRESS.FeeGmxTracker,
    ARBITRUM_ADDRESS.StakedGlpTracker,
    ARBITRUM_ADDRESS.FeeGlpTracker,
  ]

  const trackersQuery = rewardReaderContract.getStakingInfo(TREASURY, stakingTrackers)
  return parseTrackerMap(trackersQuery, ['claimable', 'tokensPerInterval', 'averageStakedAmounts', 'cumulativeRewards', 'totalSupply'] as const, stakingTrackers)
}, now(null)))

export const depositbalances = rewardReader(map(async () => {
  const balancesQuery = rewardReaderContract.getDepositBalances(TREASURY,
    [
      ARBITRUM_ADDRESS.GMX,
      ARBITRUM_ADDRESS.ES_GMX,
      ARBITRUM_ADDRESS.StakedGmxTracker,
      ARBITRUM_ADDRESS.BonusGmxTracker,
      ARBITRUM_ADDRESS.BN_GMX,
      ARBITRUM_ADDRESS.GLP,
    ],
    [
      ARBITRUM_ADDRESS.StakedGmxTracker,
      ARBITRUM_ADDRESS.StakedGmxTracker,
      ARBITRUM_ADDRESS.BonusGmxTracker,
      ARBITRUM_ADDRESS.FeeGmxTracker,
      ARBITRUM_ADDRESS.FeeGmxTracker,
      ARBITRUM_ADDRESS.FeeGlpTracker,
    ]
  )
  return parseTrackerInfo(balancesQuery, ['gmxInStakedGmx', 'esGmxInStakedGmx', 'stakedGmxInBonusGmx', 'bonusGmxInFeeGmx', 'bnGmxInFeeGmx', 'glpInStakedGlp'] as const)
}, now(null)))



async function parseTrackerMap<T extends ReadonlyArray<string>>(query: Promise<BigNumber[]>, keys: T, trackers: string[]): Promise<{[k: string]: keysToObject<T>}> {
  return (await query).reduce((seed, next, idx) => {
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
  return (await argsQuery).reduce((seed, next, idx) => {
    seed[keys[idx]] = next.toBigInt()

    return seed
  }, {} as any)
}


function formatEth(n: bigint) {
  return readableNumber(formatFixed(n))
}


const formatReadableBn = O((src: bigint) => formatFixed(src, 18), readableNumber)


export type ITreasuryAsset = {
  price: bigint
  balance: bigint
  balanceUsd: bigint
}

export const trasuryBalances = replayLatest(multicast(switchLatest(map(priceMap => {
  const balanceEthBn = combine((a, b) => a.toBigInt() + b.toBigInt(), fromPromise(w3p.getBalance(DEPLOYED_CONTRACT)), fromPromise(w3p.getBalance(TREASURY)))

  const gmx = map((n): ITreasuryAsset => {
    return { price: priceMap.gmx, balance: n.gmxInStakedGmx, balanceUsd: n.gmxInStakedGmx * priceMap.gmx / USD_PRECISION }
  }, depositbalances)

  const glp = map((n): ITreasuryAsset => {
    const price = priceMap.glp
    const balanceUsd = expandDecimals(n.glpInStakedGlp * price / USD_PRECISION, 12)
    
    return { price, balance: n.glpInStakedGlp, balanceUsd }
  }, depositbalances)

  const eth = map((n): ITreasuryAsset => {
    const price = parseFixed(Number(priceMap.eth) / 1e8, 30)
    return { price, balance: n, balanceUsd: n * price / USD_PRECISION }
  }, balanceEthBn)

  return combineObject({ eth, glp, gmx, totalUsd: combineArray((a, b, c) => a.balanceUsd + b.balanceUsd + c.balanceUsd, eth, glp, gmx) })
}, fromPromise(queryLatestPrices())))))

