import { combineArray, replayLatest } from "@aelea/core"
import { intervalInMsMap } from "@gambitdao/gmx-middleware"
import { awaitPromises, map, multicast, periodic } from "@most/core"
import { Stream } from "@most/types"
import { $DisplayBerry } from "../components/$DisplayBerry"
import { IValueInterval } from "../components/$StakingGraph"
import { attributeMappings } from "./gbcMappings"
import { IPricefeed, IStakeSource, queryLatestPrices } from "./query"


export const latestTokenPriceMap = replayLatest(multicast(awaitPromises(map(() => queryLatestPrices(), periodic(5000)))))




export type TimelineTime = {
  time: number
}

export interface IFillGap<T, R, RTime extends R & TimelineTime = R & TimelineTime> {
  interval: intervalInMsMap
  getTime: (t: T) => number
  seed: R & TimelineTime
  source: T[]
  
  fillMap: (prev: RTime, next: T) => R
  fillGapMap?: (prev: RTime, next: T) => R
  squashMap?: (prev: RTime, next: T) => R
}


export function intervalListFillOrderMap<T, R, RTime extends R & TimelineTime = R & TimelineTime>({
  source, getTime, seed, interval,

  fillMap, squashMap = fillMap, fillGapMap = (prev, _next) => prev
}: IFillGap<T, R, RTime>) {

  const sortedSource = [...source].sort((a, b) => getTime(a) - getTime(b))
  const slot = Math.floor(seed.time / interval)
  const normalizedSeed = { ...seed, time: slot * interval } as RTime

  const timeslotMap: { [k: number]: RTime } = {
    [slot]: normalizedSeed
  }

  return sortedSource.reduce((timeline: RTime[], next: T) => {
    const lastIdx = timeline.length - 1
    const slot = Math.floor(getTime(next) / interval)
    const squashPrev = timeslotMap[slot]

    if (squashPrev) {
      const newSqush = { ...squashMap(squashPrev, next), time: squashPrev.time } as RTime
      timeslotMap[slot] = newSqush
      timeline.splice(lastIdx, 1, newSqush)
    } else {
      const prev = timeline[timeline.length - 1]

      const time = slot * interval
      const barSpan = (time - prev.time) / interval
      const barSpanCeil = barSpan - 1

      for (let index = 1; index <= barSpanCeil; index++) {
        const fillNext = fillGapMap(timeline[timeline.length - 1], next)
        const gapTime = interval * index
        const newTime = prev.time + gapTime
        const newTick = { ...fillNext, time: newTime } as RTime
        const newSlot = Math.floor(newTime / interval)

        timeslotMap[newSlot] ??= newTick
        timeline.push(newTick)
      }

      const lastTick = fillMap(prev, next)
      const item = { ...lastTick, time: time } as RTime

      timeslotMap[slot] = item
      timeline.push(item)
    }

    return timeline
  },
  [normalizedSeed])
}


function getByAmoutFromFeed(amount: bigint, priceUsd: bigint, decimals: number) {
  const denominator = 10n ** BigInt(decimals)

  return amount * priceUsd / denominator
}


export function priceFeedHistoryInterval<T extends string>(interval: number, gmxPriceHistoryQuery: Stream<IPricefeed[]>, yieldSource: Stream<IStakeSource<T>[]>): Stream<IValueInterval[]> {
  return combineArray((feed, yieldList) => {
    const source = [
      ...feed,
      ...yieldList
    ].sort((a, b) => a.timestamp - b.timestamp)
    const seed: IValueInterval = {
      time: source[0].timestamp,
      price: feed[0],
      balance: 0n,
      balanceUsd: 0n,
    }

    const series = intervalListFillOrderMap({
      seed, getTime: a => a.timestamp,
      source,
      interval,
      fillMap: (prev, next) => {
        if ('feed' in next) {
          const balanceUsd = getByAmoutFromFeed(prev.balance, next.c, 18)
          const price = next

          return { ...prev, balanceUsd, price }
        }


        const balance = prev.balance + next.amount

        return { ...prev, balance }
      }
    })

    const sum = yieldList.reduce((s, n) => s + n.amount, 0n)


    return series
  }, gmxPriceHistoryQuery, yieldSource)
}

export const $berryById = (id: number, size = '85px') => {
  const metaTuple = attributeMappings[id - 1]

  if (!metaTuple) {
    throw new Error('Could not find berry #' + id)
  }

  const [background, clothes, body, expression, faceAccessory, hat] = metaTuple

  return $DisplayBerry({
    size,
    background,
    clothes,
    expression,
    faceAccessory,
    hat
  })({})
}
