import { fromCallback } from "@aelea/core"
import type { BaseProvider, EventType } from "@ethersproject/providers"
import { empty, map, switchLatest } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"
import type { EIP1193Provider, ProviderAccounts, ProviderChainId, ProviderInfo, ProviderMessage, ProviderRpcError } from "eip1193-provider"

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


export interface ProviderEventListener {
  (event: "connect"): Stream<ProviderInfo>
  (event: "disconnect"): Stream<ProviderRpcError>
  (event: "message"): Stream<ProviderMessage>
  (event: "chainChanged"): Stream<ProviderChainId>
  (event: "accountsChanged"): Stream<ProviderAccounts>
}


export const eip1193ProviderEvent = (provider: EIP1193Provider, eventName: string) => fromCallback<any, any>(
  (cb) => {
    provider.on(eventName as any, cb)
    return disposeWith(() => provider.removeListener(eventName, cb), null)
  },
  a => {
    return a
  }
)

export const providerEvent = <A>(ps: Stream<BaseProvider | null>) => (eventType: EventType) => switchLatest(
  map(provider => {
    if (provider === null) {
      return empty()
    }

    const eventChange: Stream<A> = fromCallback(
      cb => {
        provider.on(eventType, cb)
        return disposeWith(() => provider.removeListener(eventType, cb), null)
      },
      (cbValue) => {
        return cbValue
      }
    )

    return eventChange
  }, ps)
)


