import { fromCallback } from "@aelea/core"
import { empty, map, switchLatest, zipArray } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"
import { EIP1193Provider } from "viem"


function resolveError(error: any) {

  if ('reason' in error && typeof error.reason === 'string') {
    return new Error(error.reason)
  }

  if (error instanceof Error) {
    return error
  }

  if ('message' in error && typeof error.message === 'string') {
    return new Error(error.message)
  }

  if (typeof error === 'string') {
    return new Error(error)
  }

  throw new Error('Unable to resolve error message')
}

export function parseError(data: any): Error {
  if (typeof data === 'string') {
    return resolveError(data)
  }

  if ('error' in data) {
    try {
      return resolveError(data)
    } catch (err) {
      console.warn('Unable to resolve error')
    }
  }

  if ('data' in data) {
    return resolveError((data as any).data)
  } else if ('reason' in data) {
    return new Error(data.reason)
  } else if ('message' in data) {
    return new Error(data.message)
  }

  if (data instanceof Error) {
    return data
  }

  return new Error('Unknown error')
}



type IEip1193EventName = 'connect' | 'disconnect' | 'chainChanged' | 'accountsChanged' | 'message'

export const eip1193ProviderEventFn = (provider: EIP1193Provider, eventName: IEip1193EventName) => fromCallback<any, any>(
  (cb) => {
    provider.on(eventName as any, cb)
    return disposeWith(() => provider.removeListener(eventName as any, cb), null)
  }
)

export const eip1193ProviderEvent = (provider: Stream<EIP1193Provider | null>, eventName: IEip1193EventName) => switchLatest(
  map(provider => {
    if (provider === null) {
      return empty()
    }

    return eip1193ProviderEventFn(provider, eventName)
  }, provider)
)





export type StateStream<T> = {
  [P in keyof T]: Stream<T[P]>
}



export function zipState<A, K extends keyof A = keyof A>(state: StateStream<A>): Stream<A> {
  const entries = Object.entries(state) as [keyof A, Stream<A[K]>][]
  const streams = entries.map(([_, stream]) => stream)

  const zipped = zipArray((...arrgs: A[K][]) => {
    return arrgs.reduce((seed, val, idx) => {
      const key = entries[idx][0]
      seed[key] = val

      return seed
    }, {} as A)
  }, streams)

  return zipped
}
