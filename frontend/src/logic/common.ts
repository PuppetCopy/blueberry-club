import { combineArray, replayLatest } from "@aelea/core"
import { intervalListFillOrderMap } from "@gambitdao/gmx-middleware"
import { awaitPromises, continueWith, map, multicast, now, periodic, takeWhile, tap } from "@most/core"
import { Stream } from "@most/types"
import { $displayBerry } from "../components/$DisplayBerry"
import { IValueInterval } from "../components/$StakingGraph"
import { IAttributeBody, IBerryDisplayTupleMap, getLabItemTupleIndex } from "@gambitdao/gbc-middleware"
import tokenIdAttributeTuple from "./mappings/tokenIdAttributeTuple"
import { IPricefeed, IStakeSource, queryLatestPrices } from "./query"
import { $svg, attr, style } from "@aelea/dom"


export const latestTokenPriceMap = replayLatest(multicast(awaitPromises(map(() => queryLatestPrices(), periodic(5000)))))



function getByAmoutFromFeed(amount: bigint, priceUsd: bigint, decimals: number) {
  const denominator = 10n ** BigInt(decimals)

  return amount * priceUsd / denominator
}


export function takeUntilLast <T>(fn: (t: T) => boolean, s: Stream<T>) {
  let last: T
  
  return continueWith(() => now(last), takeWhile(x => {

    const res = !fn(x)
    last = x

    return res
  }, s))
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

export const $berryById = (id: number, size = 85) => {
  const metaTuple = tokenIdAttributeTuple[id - 1]

  if (!metaTuple) {
    throw new Error('Could not find berry #' + id)
  }

  const [background, clothes, body, expression, faceAccessory, hat] = metaTuple

  return $displayBerry([background, clothes, IAttributeBody.BLUEBERRY, expression, faceAccessory, hat], size)
}


export const $labItem = (id: number, size = 85) => {
  const state = getLabItemTupleIndex(id)
  const newLocal = [...Array(state), id] as IBerryDisplayTupleMap

  return $displayBerry(newLocal, size)
}

export const $labItemAlone = (id: number, size = 80) => {
  const state = getLabItemTupleIndex(id)

  return $svg('svg')(
    attr({ xmlns: 'http://www.w3.org/2000/svg', preserveAspectRatio: 'none', fill: 'none', viewBox: `0 0 1500 1500` }),
    style({ width: `${size}px`, height: `${size}px`, })
  )(
    tap(async ({ element }) => {
      const svgParts = (await import("../logic/mappings/svgParts")).default

      // @ts-ignore
      element.innerHTML = svgParts[state][id]
    })
  )()
}
