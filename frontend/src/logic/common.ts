import { combineArray, O, Op, replayLatest } from "@aelea/core"
import { CHAIN, filterNull, intervalListFillOrderMap, listen, NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import { awaitPromises, continueWith, filter, fromPromise, map, multicast, now, periodic, switchLatest, takeWhile, tap } from "@most/core"
import { Stream } from "@most/types"
import { $loadBerry } from "../components/$DisplayBerry"
import { IValueInterval } from "../components/$StakingGraph"
import { IBerryDisplayTupleMap, getLabItemTupleIndex, IAttributeExpression, LAB_CHAIN, IAttributeBackground, IAttributeMappings, IBerryLabItems, IToken, IAttributeHat, tokenIdAttributeTuple } from "@gambitdao/gbc-middleware"
import { IPricefeed, IStakeSource, queryLatestPrices, queryTokenv2 } from "./query"
import { $Node, $svg, attr, style } from "@aelea/dom"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import { IWalletLink } from "@gambitdao/wallet-link"
import { Closet } from "@gambitdao/gbc-contracts"
import { BigNumberish, BigNumber } from "@ethersproject/bignumber"
import { bnToHex } from "../pages/$Berry"
import { Provider, Web3Provider } from "@ethersproject/providers"
import { BaseContract, ContractFactory } from "@ethersproject/contracts"


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
  const provider = filterNull(wallet.provider)

  return replayLatest(multicast(awaitPromises(combineArray(async w3p => {
    // if (w3p === null) {
    //   throw new Error('no Ethereum Provider available')
    // }

    if (w3p?.network?.chainId !== LAB_CHAIN) {
      throw new Error(`Please connect to ${NETWORK_METADATA[LAB_CHAIN].chainName} network`)
    }

    return w3p
  }, provider))))
}

export function contractConnect<T extends typeof ContractFactory>(contractCtr: T, provider: Stream<Web3Provider | null>, contractMapping: { [p in CHAIN]?: string }) {
  // @ts-ignore
  const contract: Stream<ReturnType<T['connect']> | null> = map((w3p) => {
    if (w3p === null) {
      return null
    }

    const chainId = w3p.network.chainId as CHAIN
    const address = contractMapping[chainId]

    if (!address) {
      console.warn(`contract ${contractCtr.name} doesn't support chain ${chainId}`)
      return null
    }

    try {
      // @ts-ignore 
      return contractCtr.connect(address, w3p.getSigner())
    } catch (error) {

      // @ts-ignore
      return contractCtr.connect(address, w3p)
    }
  }, provider)

  // @ts-ignore
  const run = <R>(op: Op<ReturnType<T['connect']>, Promise<R>>) => O(
    filter(w3p => w3p !== null),
    op,
    awaitPromises,
  )(contract)

  // @ts-ignore
  const int = (op: Op<ReturnType<T['connect']>, Promise<BigNumber>>): Stream<bigint> => {
    const newLocal = O(
      op,
      map(async (n) => {
        return (await n).toBigInt()
      })
    )

    return run(newLocal)
  }

  const _listen = (name: string) => switchLatest(map((c) => {
    if (c === null) {
      return null
    }

    return listen(c)(name)
  }, contract as any as Stream<BaseContract>))


  return { run, int, contract, listen: _listen }
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

  if (tupleIdx !== 3 && showFace) {
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
    style({})
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

