import { combineArray, replayLatest } from "@aelea/core"
import { intervalListFillOrderMap } from "@gambitdao/gmx-middleware"
import { awaitPromises, map, multicast, periodic } from "@most/core"
import { Stream } from "@most/types"
import { $DisplayBerry } from "../components/$DisplayBerry"
import { IValueInterval } from "../components/$StakingGraph"
import { IAttributeBody, IAttributeLabBackground, IAttributeLabClothes, IAttributeLabFaceAccessory, IAttributeLabHat, IAttributeExpression, IBerryDisplayTupleMap } from "@gambitdao/gbc-middleware"
import tokenIdAttributeTuple from "./mappings/tokenIdAttributeTuple"
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
  const metaTuple = tokenIdAttributeTuple[id - 1]

  if (!metaTuple) {
    throw new Error('Could not find berry #' + id)
  }

  const [background, clothes, body, expression, faceAccessory, hat] = metaTuple

  return $DisplayBerry([background, clothes, IAttributeBody.BLUEBERRY, expression, faceAccessory, hat], size)({})
}

const labAttributeTuple = [IAttributeLabBackground, IAttributeLabClothes, IAttributeBody, IAttributeExpression, IAttributeLabFaceAccessory, IAttributeLabHat] as const

export const getLabItemTupleIndex = (itemId: number) => {
  const attrMap = itemId in IAttributeLabHat ? IAttributeLabHat : itemId in IAttributeLabBackground ? IAttributeLabBackground : itemId in IAttributeLabClothes ? IAttributeLabClothes : itemId in IAttributeLabFaceAccessory ? IAttributeLabFaceAccessory : null

  if (attrMap === null) {
    throw new Error(`item id: ${itemId} doesn't match any attribute`)
  }

  return labAttributeTuple.indexOf(attrMap)
}

export const $labItem = (id: number, size = '85px') => {
  const state = getLabItemTupleIndex(id)
  const newLocal = [...Array(state), id] as IBerryDisplayTupleMap

  return $DisplayBerry(newLocal, size,)({})
}
