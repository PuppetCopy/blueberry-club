import { O, Op, combineArray, fromCallback, isStream } from "@aelea/core"
import { $Node, $svg, NodeComposeFn, attr, style } from "@aelea/dom"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import {
  IAttributeBackground, IAttributeBadge, IAttributeExpression, IAttributeHat, IAttributeMappings,
  IBerryDisplayTupleMap, IToken, getLabItemTupleIndex, labAttributeTuple, svgParts, tokenIdAttributeTuple
} from "@gambitdao/gbc-middleware"
import { ContractFunctionConfig, StreamInput, StreamInputArray } from "@gambitdao/gmx-middleware"
import { awaitPromises, map, now, switchLatest, tap } from "@most/core"
import { curry2 } from "@most/prelude"
import { Stream } from "@most/types"
import type { Abi, AbiParametersToPrimitiveTypes, Address, ExtractAbiEvent, ExtractAbiFunction, } from 'abitype'
import {
  Chain, GetEventArgs, Hash, InferEventName, InferFunctionName, Log, PublicClient, ReadContractReturnType, SimulateContractParameters, SimulateContractReturnType, TransactionReceipt, Transport
} from "viem"
import { $berry, $defaultBerry } from "../components/$DisplayBerry"
import { IWalletclient, IPublicClient } from "@gambitdao/wallet-link"


export const getMappedContractAddress = <
  TDeepMap extends Record<number, { [k: string]: Address }>,
  TKey1 extends keyof TDeepMap,
  TKey2 extends keyof TDeepMap[TKey1],
  TAddress extends TDeepMap[TKey1][TKey2],
>(contractMap: TDeepMap, contractName: TKey2, client_: Stream<IWalletclient | IPublicClient>): Stream<TDeepMap[TKey1][TKey2]> => {
  const newLocal = map(client => {
    const contractAddressMap = contractMap[client.chain.id as TKey1]

    if (!contractAddressMap) {
      throw new Error(`Contract address not found for chain ${client.chain.id}`)
    }

    const address = contractMap[client.chain.id as TKey1][contractName] as TAddress
    return address
  }, client_)
  return newLocal
}


export const connectMappedContract = <
  TDeepMap extends Record<number, { [k: string]: Address }>,
  TKey1 extends keyof TDeepMap,
  TKey2 extends keyof TDeepMap[TKey1],
  TAddress extends TDeepMap[TKey1][TKey2],
  TTransport extends Transport,
  TChain extends Chain,
  TIncludeActions extends true,
  TPublicClient extends PublicClient<TTransport, TChain, TIncludeActions>,
  TAbi extends Abi,
>(contractMap: TDeepMap, contractName: TKey2, abi: TAbi, client_: Stream<TPublicClient> | TPublicClient): Stream<ContractFunctionConfig<TAbi, TAddress, TTransport, TChain, TIncludeActions, TPublicClient>> => {
  const newLocal = map(client => {
    const contractAddressMap = contractMap[client.chain.id as TKey1]

    if (!contractAddressMap) {
      throw new Error(`Contract address not found for chain ${client.chain.id}`)
    }

    const address = contractMap[client.chain.id as TKey1][contractName] as TAddress
    return { client, address, abi }
  }, fromStream(client_))
  return newLocal
}

export const connectContract = <
  TAddress extends Address,
  TTransport extends Transport,
  TChain extends Chain,
  TIncludeActions extends true,
  TPublicClient extends PublicClient<TTransport, TChain, TIncludeActions>,
  TAbi extends Abi,
>(client_: Stream<TPublicClient> | TPublicClient, address_: TAddress | Stream<TAddress>, abi: TAbi): Stream<ContractFunctionConfig<TAbi, TAddress, TTransport, TChain, TIncludeActions, TPublicClient>> => {
  return combineArray((client, address) => {
    return { client, address, abi }
  }, fromStream(client_), fromStream(address_))
}


function fromStream<T>(maybeStream: T | Stream<T>): Stream<T> {
  return isStream(maybeStream) ? maybeStream : now(maybeStream)
}


export function combineState<A extends object, K extends keyof A>(state: StreamInput<A>): Stream<A> {
  const entries = Object.entries(state) as [keyof A, Stream<A[K] | A[K]>][]
  const streams = entries.map(([_, stream]) => {
    return isStream(stream) ? stream : now(stream)
  })

  const combined = combineArray((...arrgs: A[K][]) => {
    return arrgs.reduce((seed, val, idx) => {
      const key = entries[idx][0]
      seed[key] = val

      return seed
    }, {} as A)
  }, ...streams)

  return combined
}

type onlyArray<T> = T extends readonly any[] ? T : never


export const contractReader = <
  TAddress extends Address,
  TTransport extends Transport,
  TChain extends Chain,
  TIncludeActions extends true,
  TPublicClient extends PublicClient<TTransport, TChain, TIncludeActions>,
  TAbi extends Abi,
>(params_: Stream<ContractFunctionConfig<TAbi, TAddress, TTransport, TChain, TIncludeActions, TPublicClient>>) =>
  <TFunctionName extends string, TArgs extends AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, TFunctionName>['inputs']>>(functionName: InferFunctionName<TAbi, TFunctionName, 'view' | 'pure'>, ...args_: onlyArray<TArgs> | onlyArray<StreamInputArray<onlyArray<TArgs>>>): Stream<ReadContractReturnType<TAbi, TFunctionName>> => {

    const mapState = switchLatest(map(({ abi, address, client }) => {
      const resolveArgs: Stream<onlyArray<TArgs>> = isStream(args_[0]) ? combineArray((..._args) => _args, ...args_ as any) : now(args_ as any) as any
      return awaitPromises(map(args => {
        return client.readContract({ abi, address, functionName, args } as any)
      }, resolveArgs))
    }, params_))

    return mapState
  }


export const listenContract = <
  TAddress extends Address,
  TAbi extends Abi,
  TTransport extends Transport,
  TChain extends Chain,
  TIncludeActions extends true,
  TPublicClient extends PublicClient<TTransport, TChain, TIncludeActions>,
>(params_: Stream<ContractFunctionConfig<TAbi, TAddress, TTransport, TChain, TIncludeActions, TPublicClient>>) =>
  <TEventName extends string, TLogs = Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>>>(eventName: InferEventName<TAbi, TEventName>, args?: GetEventArgs<TAbi, TEventName>): Stream<TLogs> => {

    const mapState = switchLatest(map(({ abi, address, client }) => {
      const eventStream = fromCallback(emitCb => {
        const listener = client.watchContractEvent<TAbi, TEventName>({
          abi, address,
          eventName, args,
          onLogs: logs => {
            for (const log in logs) {
              if (Object.prototype.hasOwnProperty.call(logs, log)) {
                emitCb(log)
              }
            }
          }
        })

        return listener
      })

      return eventStream
    }, params_))

    return mapState
  }


// export const simulateContract = <
//   TAddress extends Address,
//   TAbi extends Abi,
//   TTransport extends Transport,
//   TChain extends Chain,
//   TChainOverride extends Chain | undefined = undefined,
//   TPublicClient extends PublicClient<TTransport, TChain, true> = PublicClient<TTransport, TChain, true>,

// >(params_: Stream<ContractFunctionConfig<TAbi, TAddress, TTransport, TChain, true, TPublicClient>>) =>
//   <TFunctionName extends string>(simParams: Omit<SimulateContractParameters<TAbi, TFunctionName, TChain, TChainOverride>, 'address' | 'abi'>): Stream<Promise<SimulateContractReturnType<TAbi, TFunctionName, TChain, TChainOverride>>> => {

//     const mapState = map(({ abi, address, client }) => {
//       const simReq = client.simulateContract<TAbi, TFunctionName, TChainOverride>({ address, abi, ...simParams } as any)
//       return simReq
//     }, params_)


//     return mapState
//   }

export const waitForTransactionReceipt = async<
  TTransport extends Transport,
  TChain extends Chain,
>(client: PublicClient<TTransport, TChain>, hash_: Promise<Hash> | Hash): Promise<TransactionReceipt> => {
  const hash = await hash_
  const req = client.waitForTransactionReceipt({ hash })
  return req
}

export const simulateContract = <
  TFunctionName extends string,

  TAddress extends Address,
  TAbi extends Abi,
  TTransport extends Transport,
  TChain extends Chain,
  TChainOverride extends Chain | undefined = undefined,
  TPublicClient extends PublicClient<TTransport, TChain, true> = PublicClient<TTransport, TChain, true>,
>(params_: ContractFunctionConfig<TAbi, TAddress, TTransport, TChain, true, TPublicClient>, simParams: Omit<SimulateContractParameters<TAbi, TFunctionName, TChain, TChainOverride>, 'address' | 'abi'>): Promise<SimulateContractReturnType<TAbi, TFunctionName, TChain, TChainOverride>> => {

  const { abi, address, client } = params_

  const sim = client.simulateContract<TAbi, TFunctionName, TChainOverride>({ address, abi, ...simParams } as any)

  return sim
}

interface ISwitchOpCurry2 {
  <T, R>(s: Stream<T>, oop: Op<T, Promise<R>>): Stream<R>
  <T, R>(s: Stream<T>): (oop: Op<T, Promise<R>>) => Stream<R>
}

export const switchOp: ISwitchOpCurry2 = curry2(function <T, R>(s: Stream<T>, oop: Op<T, Promise<R>>): Stream<R> {
  return awaitPromises(switchLatest(map(c => oop(now(c)), s)))
})





export const $berryByToken = (token: IToken, $container?: NodeComposeFn<$Node>) => {
  const display = getBerryFromItems(token.labItems.map(li => Number(li.id)))
  const tuple: Partial<IBerryDisplayTupleMap> = [...tokenIdAttributeTuple[token.id - 1]]

  return $berryByLabItems(token.id, display.background, display.custom, display.badge, $container, tuple)
}

export const $berryByLabItems = (
  berryId: number,
  backgroundId: IAttributeBackground,
  labItemId: IAttributeMappings,
  badgeId: IAttributeBadge,
  $container?: NodeComposeFn<$Node>,
  tuple: Partial<IBerryDisplayTupleMap> = [...tokenIdAttributeTuple[berryId - 1]]
) => {

  if (labItemId) {
    const customIdx = getLabItemTupleIndex(labItemId)

    // @ts-ignore
    tuple.splice(customIdx, 1, labItemId)
  }

  if (badgeId) {
    tuple.splice(6, 1, badgeId)
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
      // @ts-ignore
      element.innerHTML = svgParts[state][id]
    })
  )()
}

// export async function getTokenSlots(token: bigint, closet: Closet): Promise<IBerryLabItems> {
//   const items = await closet.get(token, 0, 2)
//   return getBerryFromItems(items.map(it => Number(it)))
// }

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

