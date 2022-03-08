import { combineArray, replayLatest } from "@aelea/core"
import { intervalListFillOrderMap } from "@gambitdao/gmx-middleware"
import { awaitPromises, map, multicast, periodic } from "@most/core"
import { Stream } from "@most/types"
import { $DisplayBerry } from "../components/$DisplayBerry"
import { IValueInterval } from "../components/$StakingGraph"
import { attributeMappings } from "./gbcMappings"
import { IPricefeed, IStakeSource, queryLatestPrices } from "./query"


export const latestTokenPriceMap = replayLatest(multicast(awaitPromises(map(() => queryLatestPrices(), periodic(5000)))))



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
