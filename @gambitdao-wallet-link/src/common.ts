import { fromCallback } from "@aelea/core"
import type { BaseProvider, EventType, ExternalProvider } from "@ethersproject/providers"
import { CHAIN, NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import { empty, map, switchLatest, zipArray } from "@most/core"
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


export const eip1193ProviderEventFn = (provider: EIP1193Provider, eventName: string) => fromCallback<any, any>(
  (cb) => {
    provider.on(eventName as any, cb)
    return disposeWith(() => provider.removeListener(eventName, cb), null)
  },
  a => {
    return a
  }
)

export const eip1193ProviderEvent = (provider: Stream<EIP1193Provider | null>, eventName: string) => switchLatest(
  map(provider => {
    if (provider === null) {
      return empty()
    }

    return eip1193ProviderEventFn(provider, eventName)
  }, provider)
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



// https://eips.ethereum.org/EIPS/eip-3085
export async function attemptToSwitchNetwork(metamask: ExternalProvider, chain: CHAIN) {
  if (!('request' in metamask)) {
    return console.error('External Provider does not contain request() method')
  }

  try {
    // check if the chain to connect to is installed
    await metamask.request!({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + chain.toString(16) }], // chainId must be in hexadecimal numbers
    })
  } catch (error: any) {
    if (!NETWORK_METADATA[chain]) {
      throw new Error(`Could not add metamask network, chainId ${chain} is not supported`)
    }
    // This error code indicates that the chain has not been added to MetaMask
    // if it is not, then install it into the user MetaMask
    if (error.code === 4902) {
      try {
        await metamask.request!({
          method: 'wallet_addEthereumChain',
          params: [
            NETWORK_METADATA[chain]
          ],
        })
      } catch (addError: any) {
        throw parseError(addError)
      }
    }

    throw parseError(parseError(error))
  }
}


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
