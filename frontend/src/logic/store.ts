import { Op } from '@aelea/core'
import { map, merge, now, tap } from "@most/core"
import { Stream } from "@most/types"


interface StoreFn<STORE> {
  <T>(stream: Stream<T>, writePipe?: Op<T, { store: STORE, value: T }>): Stream<T>
  // <T>(stream: Stream<T>): (writePipe?: Op<T, { store: STORE, value: T }>) => Stream<T>
}

interface StoreReplayFn<STORE> {
  <T>(stream: Stream<T>, transformInitialPipe?: Op<STORE, T>, writePipe?: Op<T, { store: STORE, value: T }>): Stream<T>
  // <T>(stream: Stream<T>): (transformInitialPipe?: Op<STORE, T>, writePipe?: Op<T, { store: STORE, value: T }>) => Stream<T>
  // <T>(stream: Stream<T>): (transformInitialPipe?: Op<STORE, T>) => (writePipe?: Op<T, { store: STORE, value: T }>) => Stream<T>
}



export type BrowserStore<TKey extends string, STORE> = {
  getState: () => STORE
  store: StoreFn<STORE>
  storeReplay: StoreReplayFn<STORE>
  craete: <ZKey extends string, ZStore>(key: ZKey, defaultState: ZStore) => BrowserStore<`${TKey}.${ZKey}`, ZStore>
}

// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() }

const ES_BIGINT_EXP = /-?\d+n$/


function getStateFromLS<STORE>(key: string, defaultState: STORE): STORE {
  const storeData = localStorage.getItem(key)!

  if (storeData === null) {
    return defaultState
  } else if (ES_BIGINT_EXP.test(storeData)) {
    return BigInt(storeData) as STORE
  } else {
    return JSON.parse(storeData)
  }
}

function setStateFromLS<STORE>(key: string, value: STORE): STORE {
  if (typeof value === 'bigint') {
    localStorage.setItem(key, String(value) + 'n')
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }

  return value
}

function createLocalStorageChainFactory<TKey extends string>(keyChain: TKey) {

  return <ZKey extends string, STORE>(key: ZKey, defaultState: STORE) => {
    const mktTree = `${keyChain}.${key}`

    const getState = () => getStateFromLS(mktTree, defaultState)


    const scope: BrowserStore<`${TKey}.${ZKey}`, STORE> = {
      getState,
      store: <T>(stream: Stream<T>, writePipe?: Op<T, { store: STORE, value: T }>) => {
        if (!writePipe) {
          return tap(store => setStateFromLS(mktTree, store), stream)
        }

        const writeEffect = map(({ store, value }) => {
          setStateFromLS(mktTree, store)
          return value
        }, writePipe(stream))

        return writeEffect
      },
      storeReplay: <T>(stream: Stream<T>, transformInitialPipe?: Op<STORE, T>, writePipe?: Op<T, { store: STORE, value: T }>): Stream<T> => {
        const state = getStateFromLS(mktTree, defaultState)
        const initial = map(getState, now(state))
        const toState: Stream<T> = transformInitialPipe ? transformInitialPipe(initial) : initial as unknown as Stream<T>

        if (!writePipe) {
          return merge(stream, toState)
        }

        const writeEffect = map(({ store, value }) => {
          setStateFromLS(mktTree, store)
          return value
        }, writePipe(stream))

        return merge(writeEffect, toState)
      },
      craete: createLocalStorageChainFactory(mktTree)
    }

    return scope
  }
}



export function createLocalStorageChain<TKey extends string, VKey extends string>(keyChain: TKey, version: VKey) {
  return createLocalStorageChainFactory(keyChain)(version, version)
}