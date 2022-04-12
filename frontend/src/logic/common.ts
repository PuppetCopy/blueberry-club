import { combineArray, O, replayLatest } from "@aelea/core"
import { intervalListFillOrderMap, NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import { awaitPromises, continueWith, fromPromise, map, multicast, now, periodic, switchLatest, takeWhile, tap } from "@most/core"
import { Stream } from "@most/types"
import { $loadBerry } from "../components/$DisplayBerry"
import { IValueInterval } from "../components/$StakingGraph"
import { IAttributeBody, IBerryDisplayTupleMap, getLabItemTupleIndex, IAttributeExpression, GBC_ADDRESS, USE_CHAIN, IAttributeBackground, IAttributeMappings, IBerry } from "@gambitdao/gbc-middleware"
import tokenIdAttributeTuple from "./mappings/tokenIdAttributeTuple"
import { IPricefeed, IStakeSource, queryLatestPrices } from "./query"
import { $Node, $svg, attr, style } from "@aelea/dom"
import { Manager__factory } from "contracts"
import { web3ProviderTestnet } from "./provider"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { IWalletLink } from "@gambitdao/wallet-link"


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

const lab = Manager__factory.connect(GBC_ADDRESS.MANAGER, web3ProviderTestnet)


export const $berryById = (id: number, berry: IBerry | null = null, size = 85) => {
  return $berryByLabItems(id, berry?.background, berry?.custom, size)
}

export const $berryByLabItems = (berryId: number, backgroundId?: IAttributeBackground, labItemId?: IAttributeMappings, size = 85) => {
  const matchTuple: Partial<IBerryDisplayTupleMap> = [...tokenIdAttributeTuple[berryId - 1]]

  if (labItemId) {
    const customIdx = getLabItemTupleIndex(labItemId)

    // @ts-ignore
    matchTuple.splice(customIdx, 1, labItemId)
  }

  if (backgroundId) {
    matchTuple.splice(0, 1, backgroundId)
  }


  return $loadBerry(matchTuple, size)
}



export const $labItem = (id: number, size = 85, background = true, showFace = false): $Node => {
  const state = getLabItemTupleIndex(id)
  const newLocal = Array(5).fill(undefined) as IBerryDisplayTupleMap
  newLocal.splice(state, 1, id)

  if (showFace) {
    newLocal.splice(3, 1, IAttributeExpression.HAPPY)
  }

  const backgroundStyle = O(
    style({ placeContent: 'center', maxWidth: size + 'px', overflow: 'hidden', borderRadius: 85 * 0.15 + 'px' }),
    background ? style({ backgroundColor: state === 0 ? '' : colorAlpha(pallete.message, .95) }) : O()
  )

  // @ts-ignore
  return backgroundStyle($loadBerry(newLocal, size))
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
