import { combineArray, O, Op, replayLatest } from "@aelea/core"
import { CHAIN, filterNull, intervalListFillOrderMap, listen } from "@gambitdao/gmx-middleware"
import { awaitPromises, continueWith, empty, filter, fromPromise, map, multicast, never, now, periodic, switchLatest, takeWhile, tap } from "@most/core"
import { Stream } from "@most/types"
import { $berry } from "../components/$DisplayBerry"
import { IValueInterval } from "../components/$StakingGraph"
import {
  IBerryDisplayTupleMap, getLabItemTupleIndex, IAttributeExpression, IAttributeBackground, IAttributeMappings,
  IBerryLabItems, IToken, IAttributeHat, tokenIdAttributeTuple
} from "@gambitdao/gbc-middleware"
import { IPricefeed, IStakeSource, queryLatestPrices, queryTokenv2 } from "./query"
import { $Node, $svg, attr, style } from "@aelea/dom"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import { Closet } from "@gambitdao/gbc-contracts"
import { BigNumberish, BigNumber } from "@ethersproject/bignumber"
import { bnToHex } from "../pages/$Berry"
import { JsonRpcProvider, Web3Provider } from "@ethersproject/providers"
import { ContractFactory, EventFilter } from "@ethersproject/contracts"

export type TContractMapping<T> = {
  [P in CHAIN]?: {
    [Z in keyof T]: T[Z]
  }
}



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

export function getContractAddress<T, Z extends TContractMapping<T>>(contractMap: Z, chain: CHAIN, contractName: keyof T): T[keyof T] | null {
  const addressMapping = contractMap[chain]

  if (!addressMapping) {
    return null
  }

  const newLocal = addressMapping[contractName]
  return newLocal
}

export function readContractMapping<TProvider extends JsonRpcProvider, TMap, TCmap extends TContractMapping<TMap>, TContract extends typeof ContractFactory>(
  contractMap: TCmap,
  contractCtr: TContract,
  connect: Stream<TProvider>,
  contractName: keyof TMap
) {

  // @ts-ignore
  type RetContract = ReturnType<TContract['connect']>

  const contract = filterNull(awaitPromises(map(async (provider): Promise<RetContract | null> => {

    const chain = (await provider.getNetwork()).chainId as CHAIN
    const address = getContractAddress(contractMap, chain, contractName)

    if (address === null) {
      return null
    }

    // @ts-ignore
    const contract = contractCtr.connect(address, provider instanceof Web3Provider ? provider.getSigner() : provider)

    return contract
  }, connect)))


  const run = <R>(op: Op<RetContract, Promise<R>>) => O(
    op,
    awaitPromises,
  )(contract)


  const readInt = (op: Op<RetContract, Promise<BigNumber>>): Stream<bigint> => {
    const newLocal = O(
      op,
      map(async (n) => {
        return (await n).toBigInt()
      })
    )

    return run(newLocal)
  }

  const _listen = <T>(name: string | EventFilter) => switchLatest(map(res => {
    if (res === null) {
      return now(null)
    }

    // @ts-ignore
    return listen(res, name) as Stream<T>
  }, contract))


  return { run, readInt, contract, listen: _listen }
}

export function readContract<T extends string, TContract extends typeof ContractFactory, TProvider extends JsonRpcProvider>(
  contractCtr: TContract,
  provider: Stream<TProvider>,
  address: T
) {
  // @ts-ignore
  type RetContract = ReturnType<TContract['connect']>

  const contract = awaitPromises(map(async (provider): Promise<RetContract> => {
    const signerOrProvider = provider instanceof Web3Provider ? provider.getSigner() : provider
    // @ts-ignore
    const contract = contractCtr.connect(address, signerOrProvider)

    return contract
  }, provider))

  const run = <R>(op: Op<RetContract, Promise<R>>) => O(
    filter(w3p => {
      return w3p !== null
    }),
    op,
    awaitPromises,
  )(contract)

  const readInt = (op: Op<RetContract, Promise<BigNumber>>): Stream<bigint> => {
    const newLocal = O(
      op,
      map(async (n) => {
        return (await n).toBigInt()
      })
    )

    return run(newLocal)
  }

  const _listen = <Z>(name: string | EventFilter) => switchLatest(map(res => {
    // @ts-ignore
    const newLocal = listen(res, name) as Stream<Z>
    return newLocal
  }, contract))


  return { run, readInt, contract, listen: _listen }
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

  return $berry(tuple, size)
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


  return backgroundStyle($berry(localTuple, sizeNorm))
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

