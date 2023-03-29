import { O, Op } from "@aelea/core"
import { filterNull } from "@gambitdao/gmx-middleware"
import { awaitPromises, continueWith, empty, map, multicast, never, now, recoverWith, switchLatest, takeWhile, tap } from "@most/core"
import { Stream } from "@most/types"
import { $berry, $defaultBerry } from "../components/$DisplayBerry"
import {
  IBerryDisplayTupleMap, getLabItemTupleIndex, IAttributeExpression, IAttributeBackground, IAttributeMappings,
  IBerryLabItems, IToken, IAttributeHat, tokenIdAttributeTuple, labAttributeTuple
} from "@gambitdao/gbc-middleware"
import { $Node, $svg, attr, NodeComposeFn, style } from "@aelea/dom"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import { Closet } from "@gambitdao/gbc-contracts"
import { BigNumberish, BigNumber } from "@ethersproject/bignumber"
import { BaseProvider, Web3Provider } from "@ethersproject/providers"
import { ContractFactory, Event } from "@ethersproject/contracts"
import { GetEventFilterType, listen } from "./contract/listen"
import { curry2 } from "@most/prelude"
import { CHAIN } from "@gambitdao/const"

export type TContractMapping<T> = {
  [P in CHAIN]?: {
    [Z in keyof T]: T[Z]
  }
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



export function readContractMapping<TProvider extends BaseProvider, TMap, TCmap extends TContractMapping<TMap>, TContract extends typeof ContractFactory>(
  contractMap: TCmap,
  contractCtr: TContract,
  connect: Stream<TProvider>,
  contractName: keyof TMap
) {

  // @ts-ignore
  type RetContract = ReturnType<TContract['connect']>

  const contract = filterNull(map((provider): RetContract | null => {
    if (!provider || !provider.network?.chainId) {
      return null
    }

    const chainId = provider.network.chainId as CHAIN

    const address = getContractAddress(contractMap, chainId, contractName)

    if (address === null) {
      return null
    }

    // @ts-ignore
    const contract = contractCtr.connect(address, provider instanceof Web3Provider ? provider.getSigner() : provider)

    return contract
  }, connect))

  const run = <R>(op: Op<RetContract, Promise<R>>) => {
    const switchOp = switchLatest(map(c => {
      const internalOp = awaitPromises(op(now(c)))
      const recoverOpError = recoverWith(err => {
        console.warn(err)
        return empty()
      }, internalOp)

      return recoverOpError
    }, contract))

    return switchOp
  }

  const readInt = (op: Op<RetContract, Promise<BigNumber>>): Stream<bigint> => {
    const newLocal = O(
      op,
      map(async (n) => {
        return (await n).toBigInt()
      })
    )

    return run(newLocal)
  }

  // @ts-ignore
  const _listen = <T extends RetContract, Name extends keyof T['filters'], ET extends GetEventFilterType<T, Name>>(name: Name extends string ? Name : never): Stream<ET & { __event: Event }> => switchLatest(map(res => {
    if (res === null) {
      return never()
    }

    // @ts-ignore
    return multicast(listen(res, name))
  }, contract))


  return { run, readInt, contract, listen: _listen }
}



interface ISwitchOpCurry2 {
  <T, R>(s: Stream<T>, oop: Op<T, Promise<R>>): Stream<R>
  <T, R>(s: Stream<T>): (oop: Op<T, Promise<R>>) => Stream<R>
}

export const switchOp: ISwitchOpCurry2 = curry2(function <T, R>(s: Stream<T>, oop: Op<T, Promise<R>>): Stream<R> {
  return awaitPromises(switchLatest(map(c => oop(now(c)), s)))
})




export function readContract<T extends string, TContract extends typeof ContractFactory, TProvider extends BaseProvider>(
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


  return contract
}



export const $berryByToken = (token: IToken, $container?: NodeComposeFn<$Node>) => {
  const display = getBerryFromItems(token.labItems.map(li => Number(li.id)))
  const tuple: Partial<IBerryDisplayTupleMap> = [...tokenIdAttributeTuple[token.id - 1]]

  return $berryByLabItems(token.id, display.background, display.custom, $container, tuple)
}

export const $berryByLabItems = (
  berryId: number,
  backgroundId: IAttributeBackground,
  labItemId: IAttributeMappings,
  $container?: NodeComposeFn<$Node>,
  tuple: Partial<IBerryDisplayTupleMap> = [...tokenIdAttributeTuple[berryId - 1]]
) => {

  if (labItemId) {
    const customIdx = getLabItemTupleIndex(labItemId)

    // @ts-ignore
    tuple.splice(customIdx, 1, labItemId)
  }

  if (backgroundId) {
    tuple.splice(0, 1, backgroundId)
  }

  return $berry(tuple, $container)
}

export const $defaultLabItem = $defaultBerry(
  style({ placeContent: 'center', overflow: 'hidden' })
)

export const $defaultLabItemMedium = $defaultLabItem(
  style({ width: '70px', height: '70px' })
)

export const $defaultLabItemBig = $defaultLabItem(
  style({ width: '250px', height: '250px' })
)

export const $defaultLabItemHuge = $defaultLabItem(
  style({ width: '460px', height: '460px' })
)

export interface ILabItemDisplay {
  id: number
  $container?: NodeComposeFn<$Node>
  background?: boolean
  showFace?: boolean
}
const tupleLength = labAttributeTuple.length

export const $labItem = ({ id, $container = $defaultLabItem, background = true, showFace = false }: ILabItemDisplay): $Node => {
  const tupleIdx = getLabItemTupleIndex(id)
  const localTuple = Array(tupleLength).fill(undefined) as IBerryDisplayTupleMap
  localTuple.splice(tupleIdx, 1, id)

  if (tupleIdx !== 5) {
    localTuple.splice(5, 1, IAttributeHat.NUDE)
  }

  if (tupleIdx !== 3 && showFace) {
    localTuple.splice(3, 1, IAttributeExpression.HAPPY)
  }


  const $csContainer = $container(
    background
      ? style({ backgroundColor: tupleIdx === 0 ? '' : colorAlpha(pallete.message, theme.name === 'light' ? .12 : .92) })
      : O()
  )
  return $berry(localTuple, $csContainer)
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
  const seedObj = { background: 0, badge: 0, custom: 0, }

  return items.reduce((seed, next) => {
    const ndx = getLabItemTupleIndex(next)

    if (ndx === 0) {
      seed.background = next
    } else if (ndx === 6) {
      seed.badge = next
    } else {
      seed.custom = next
    }

    return seed
  }, seedObj)
}

export function getBerryFromToken(token: IToken) {
  return getBerryFromItems(token.labItems.map(it => Number(it.id)))
}

