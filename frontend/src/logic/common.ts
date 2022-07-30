import { combineArray, O, replayLatest } from "@aelea/core"
import { intervalListFillOrderMap, NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import { awaitPromises, continueWith, fromPromise, map, multicast, now, periodic, switchLatest, takeWhile, tap } from "@most/core"
import { Stream } from "@most/types"
import { $loadBerry } from "../components/$DisplayBerry"
import { IValueInterval } from "../components/$StakingGraph"
import { IBerryDisplayTupleMap, getLabItemTupleIndex, IAttributeExpression, USE_CHAIN, IAttributeBackground, IAttributeMappings, IBerryLabItems, IToken, IAttributeHat, tokenIdAttributeTuple } from "@gambitdao/gbc-middleware"
import { IPricefeed, IStakeSource, queryLatestPrices, queryTokenv2 } from "./query"
import { $Node, $svg, attr, style } from "@aelea/dom"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import { IWalletLink } from "@gambitdao/wallet-link"
import { Closet } from "@gambitdao/gbc-contracts"
import { BigNumberish } from "@ethersproject/bignumber"
import { bnToHex } from "../pages/$Berry"


export const latestTokenPriceMap = replayLatest(multicast(awaitPromises(map(() => queryLatestPrices(), periodic(5000)))))



function getByAmoutFromFeed(amount: bigint, priceUsd: bigint, decimals: number) {
  const denominator = 10n ** BigInt(decimals)

  return amount * priceUsd / denominator
}


export function takeUntilLast<T>(fn: (t: T) => boolean, s: Stream<T>) {
  let last: T

  return continueWith(() => now(last), takeWhile(x => {

    const res = !fn(x)
    last = x

    return res
  }, s))
}

export function getWalletProvider(wallet: IWalletLink,) {
  return replayLatest(multicast(awaitPromises(combineArray(async w3p => {
    if (w3p === null) {
      throw new Error('no Ethereum Provider available')
    }

    if (w3p?.network?.chainId !== USE_CHAIN) {
      throw new Error(`Please connect to ${NETWORK_METADATA[USE_CHAIN].chainName} network`)
    }

    return w3p
  }, wallet.provider))))
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

export const $berryById = (id: number, size: string | number = 85) => {
  const tokenQuery = queryTokenv2(bnToHex(BigInt(id)))

  return switchLatest(map(token => $berryByToken(token, size), fromPromise(tokenQuery)))
}

export const $berryByToken = (token: IToken, size: string | number = 85) => {
  const display = getBerryFromItems(token.labItems.map(li => Number(li.id)))

  return $berryByLabItems(token.id, display.background, display.custom, size)
}

export const $berryByLabItems = (berryId: number, backgroundId: IAttributeBackground, labItemId: IAttributeMappings, size: string | number = 85) => {
  const tuple: Partial<IBerryDisplayTupleMap> = [...tokenIdAttributeTuple[berryId - 1]]

  if (labItemId) {
    const customIdx = getLabItemTupleIndex(labItemId)

    // @ts-ignore
    tuple.splice(customIdx, 1, labItemId)
  }

  if (backgroundId) {
    tuple.splice(0, 1, backgroundId)
  }

  return $loadBerry(tuple, size)
}

export const $labItem = (id: number, size: string | number = 85, background = true, showFace = false): $Node => {
  const tupleIdx = getLabItemTupleIndex(id)
  const localTuple = Array(5).fill(undefined) as IBerryDisplayTupleMap
  localTuple.splice(tupleIdx, 1, id)

  if (tupleIdx !== 5) {
    localTuple.splice(5, 1, IAttributeHat.NUDE)
  }

  if (showFace) {
    localTuple.splice(3, 1, IAttributeExpression.HAPPY)
  }
  const sizeNorm = typeof size === 'number' ? size + 'px' : size

  const backgroundStyle = O(
    style({ placeContent: 'center', maxWidth: sizeNorm, overflow: 'hidden', borderRadius: 85 * 0.15 + 'px' }),
    background ? style({ backgroundColor: tupleIdx === 0 ? '' : colorAlpha(pallete.message, theme.name === 'light' ? .12 : .92) }) : O()
  )


  return backgroundStyle($loadBerry(localTuple, sizeNorm))
}

export const $labItemAlone = (id: number, size = 80) => {
  const state = getLabItemTupleIndex(id)

  return $svg('svg')(
    attr({ width: `${size}px`, height: `${size}px`, xmlns: 'http://www.w3.org/2000/svg', preserveAspectRatio: 'none', fill: 'none', viewBox: `0 0 1500 1500` }),
    style({  })
  )(
    tap(async ({ element }) => {
      const svgParts = (await import("@gambitdao/gbc-middleware/src/mappings/svgParts")).default

      // @ts-ignore
      element.innerHTML = svgParts[state][id]
    })
  )()
}

export async function getTokenSlots(token: BigNumberish, closet: Closet): Promise<IBerryLabItems> {
  const items = await closet.get(token, 0, 2)
  return getBerryFromItems(items.map(it => it.toNumber()))
}

export function getBerryFromItems(items: number[]) {
  const seedObj = { background: 0, special: 0, custom: 0, }

  return items.reduce((seed, next) => {
    const ndx = getLabItemTupleIndex(next)

    if (ndx === 0) {
      seed.background = next
    } else if (ndx === 7) {
      seed.special = next
    } else {
      seed.custom = next
    }

    return seed
  }, seedObj)
}

export function getBerryFromToken(token: IToken) {
  return getBerryFromItems(token.labItems.map(it => Number(it.id)))
}

