import { combineObject, O, Op, replayLatest } from "@aelea/core"
import { AnimationFrames } from "@aelea/dom"
import { Disposable, Scheduler, Sink, Stream } from "@most/types"
import { at, awaitPromises, constant, continueWith, empty, filter, fromPromise, map, merge, multicast, now, recoverWith, switchLatest, zipArray } from "@most/core"
import { intervalTimeMap, USD_DECIMALS } from "./constant"
import { IRequestPageApi, IRequestPagePositionApi, IRequestSortApi } from "./types"
import { keccak256 } from "@ethersproject/solidity"
import { ClientOptions, createClient, OperationContext, TypedDocumentNode } from "@urql/core"
import { curry2 } from "@most/prelude"
import { CHAIN, EXPLORER_URL, NETWORK_METADATA } from "@gambitdao/const"
import { disposeNone } from "@most/disposable"



export const ETH_ADDRESS_REGEXP = /^0x[a-fA-F0-9]{40}$/i
export const TX_HASH_REGEX = /^0x([A-Fa-f0-9]{64})$/i
export const VALID_FRACTIONAL_NUMBER_REGEXP = /^-?(0|[1-9]\d*)(\.\d+)?$/




// Constant to pull zeros from for multipliers
let zeros = "0"
while (zeros.length < 256) { zeros += zeros }

export function isAddress(address: string) {
  return ETH_ADDRESS_REGEXP.test(address)
}

export function shortenAddress(address: string, padRight = 4, padLeft = 6) {
  return address.slice(0, padLeft) + "..." + address.slice(address.length - padRight, address.length)
}

export function shortPostAdress(address: string) {
  return address.slice(address.length - 4, address.length)
}

export function parseReadableNumber(stringNumber: string, locale?: Intl.NumberFormatOptions) {
  const thousandSeparator = Intl.NumberFormat('en-US', locale).format(11111).replace(/\p{Number}/gu, '')
  const decimalSeparator = Intl.NumberFormat('en-US', locale).format(1.1).replace(/\p{Number}/gu, '')

  const parsed = parseFloat(stringNumber
    .replace(new RegExp('\\' + thousandSeparator, 'g'), '')
    .replace(new RegExp('\\' + decimalSeparator), '.')
  )
  return parsed
}

const readableLargeNumber = Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
const readableSmallNumber = Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })
const readableTinyNumber = Intl.NumberFormat("en-US", { maximumSignificantDigits: 2, minimumSignificantDigits: 2 })

export function readableNumber(ammount: number | bigint) {
  const absAmount = typeof ammount === 'bigint' ? ammount > 0n ? ammount : -ammount : Math.abs(ammount)

  if (absAmount >= 1000) {
    return readableLargeNumber.format(ammount)
  }

  if (absAmount >= 1) {
    return readableSmallNumber.format(ammount)
  }


  return readableTinyNumber.format(ammount)
}

export const trimTrailingNumber = (n: string) => {
  const match = n.match(/(^0+\d{2}|^\d{2})/)
  // const match = n.match(new RegExp(`(^0+d{2}|^d{2})`))
  return match ? match[0] : ''
}



const options: Intl.DateTimeFormatOptions = { year: '2-digit', month: 'short', day: '2-digit' }

export function readableDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, options)
}

export function formatReadableUSD(ammount: bigint | number, displayDecimals = true) {
  if (ammount === 0n) {
    return '$0'
  }

  const amountUsd = typeof ammount === 'bigint' ? formatFixed(ammount, USD_DECIMALS) : ammount

  if (displayDecimals) {
    return '$' + readableNumber(amountUsd)
  }

  return '$' + readableNumber(amountUsd).replace(/\.\d+/, '')
}

export function shortenTxAddress(address: string) {
  return shortenAddress(address, 8, 6)
}

export function getDenominator(decimals: number) {
  return 10n ** BigInt(decimals)
}

export function expandDecimals(n: bigint, decimals: number) {
  return n * getDenominator(decimals)
}

function getMultiplier(decimals: number): string {
  if (decimals >= 0 && decimals <= 256 && !(decimals % 1)) {
    return ("1" + zeros.substring(0, decimals))
  }

  throw new Error("invalid decimal size")
}

export function formatFixed(value: bigint, decimals = 18): number {
  const multiplier = getMultiplier(decimals)
  const multiplierBn = BigInt(multiplier)
  let parsedValue = ''

  const negative = value < 0n
  if (negative) {
    value *= -1n
  }

  let fraction = (value % multiplierBn).toString()

  while (fraction.length < multiplier.length - 1) {
    fraction = "0" + fraction
  }

  const matchFractions = fraction.match(/^([0-9]*[1-9]|0)(0*)/)!
  fraction = matchFractions[1]

  const whole = (value / multiplierBn).toString()

  parsedValue = whole + "." + fraction

  if (negative) {
    parsedValue = "-" + parsedValue
  }

  return Number(parsedValue)
}

export function parseFixed(input: string | number, decimals = 18) {
  let value = typeof input === 'number' ? String(input) : input

  const multiplier = getMultiplier(decimals)
  const multiplierLength = multiplier.length

  if (!VALID_FRACTIONAL_NUMBER_REGEXP.test(value)) {
    throw new Error('invalid fractional value')
  }

  if (multiplier.length - 1 === 0) {
    return BigInt(value)
  }

  const negative = (value.substring(0, 1) === "-")
  if (negative) {
    value = value.substring(1)
  }
  const comps = value.split(".")

  let whole = comps[0]
  let fraction = comps[1]

  if (!whole) { whole = "0" }
  if (!fraction) { fraction = "0" }

  // Prevent underflow
  if (fraction.length > multiplierLength - 1) {
    throw new Error('fractional component exceeds decimals')
  }

  // Fully pad the string with zeros to get to wei
  while (fraction.length < multiplierLength - 1) { fraction += "0" }

  const wholeValue = BigInt(whole)
  const fractionValue = BigInt(fraction)

  const wei = (wholeValue * BigInt(multiplier)) + fractionValue

  return negative ? -wei : wei
}


export function bytesToHex(uint8a: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < uint8a.length; i++) {
    hex += uint8a[i].toString(16).padStart(2, '0')
  }
  return hex
}

export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== 'string' || hex.length % 2) throw new Error('Expected valid hex')
  const array = new Uint8Array(hex.length / 2)
  for (let i = 0; i < array.length; i++) {
    const j = i * 2
    array[i] = Number.parseInt(hex.slice(j, j + 2), 16)
  }
  return array
}

export function hex2asc(pStr: string) {
  let tempstr = ''
  for (let b = 0; b < pStr.length; b = b + 2) {
    tempstr = tempstr + String.fromCharCode(parseInt(pStr.substr(b, 2), 16))
  }
  return tempstr
}

export declare type Nominal<T, Name extends string> = T & {
  [Symbol.species]: Name
}

export type UTCTimestamp = Nominal<number, "UTCTimestamp">

export const tzOffset = new Date().getTimezoneOffset() * 60000

export function timeTzOffset(ms: number): UTCTimestamp {
  return Math.floor((ms - tzOffset)) as UTCTimestamp
}

export function unixTimeTzOffset(ms: number): UTCTimestamp {
  return ms as UTCTimestamp
}


export type TimelineTime = {
  time: number
}

export interface IFillGap<T, R, RTime extends R & TimelineTime = R & TimelineTime> {
  interval: intervalTimeMap
  getTime: (t: T) => number
  seed: R & TimelineTime
  source: T[]

  fillMap: (prev: RTime, next: T) => R
  fillGapMap?: (prev: RTime, next: T) => R
  squashMap?: (prev: RTime, next: T) => R
}


export function intervalListFillOrderMap<T, R, RTime extends R & TimelineTime = R & TimelineTime>({
  source, getTime, seed, interval,
  fillMap, squashMap = fillMap, fillGapMap = (prev, _next) => prev
}: IFillGap<T, R, RTime>) {



  const sortedSource = [...source].sort((a, b) => getTime(a) - getTime(b))

  const initialSourceTime = getTime(sortedSource[0])
  if (seed.time > initialSourceTime) {
    throw new Error(`inital source time: ${initialSourceTime} must be greater then seed time: ${seed.time}}`)
  }

  const seedSlot = Math.floor(seed.time / interval)
  const normalizedSeed = { ...seed, time: seedSlot * interval } as RTime

  const timeslotMap: { [k: number]: RTime } = {
    [seedSlot]: normalizedSeed
  }

  return sortedSource.reduce((timeline: RTime[], next: T) => {
    const lastIdx = timeline.length - 1
    const slot = Math.floor(getTime(next) / interval)
    const squashPrev = timeslotMap[slot]

    if (squashPrev) {
      const newSqush = { ...squashMap(squashPrev, next), time: squashPrev.time } as RTime
      timeslotMap[slot] = newSqush
      timeline.splice(lastIdx, 1, newSqush)
    } else {
      const prev = timeline[timeline.length - 1]

      const time = slot * interval
      const barSpan = (time - prev.time) / interval
      const barSpanCeil = barSpan - 1

      for (let index = 1; index <= barSpanCeil; index++) {
        const fillNext = fillGapMap(timeline[timeline.length - 1], next)
        const gapTime = interval * index
        const newTime = prev.time + gapTime
        const newTick = { ...fillNext, time: newTime } as RTime
        const newSlot = Math.floor(newTime / interval)

        timeslotMap[newSlot] ??= newTick
        timeline.push(newTick)
      }

      const lastTick = fillMap(prev, next)
      const item = { ...lastTick, time: time } as RTime

      timeslotMap[slot] = item
      timeline.push(item)
    }

    return timeline
  }, [normalizedSeed])
}


function defaultComperator<T>(queryParams: IRequestSortApi<T>) {
  return function (a: T, b: T) {
    return queryParams.direction === 'desc'
      ? Number(b[queryParams.selector]) - Number(a[queryParams.selector]) 
      : Number(a[queryParams.selector]) - Number(b[queryParams.selector])
  }
}

export function pagingQuery<T, ReqParams extends IRequestPagePositionApi & (IRequestSortApi<T> | {})>(
  queryParams: ReqParams,
  res: T[],
  customComperator?: (a: T, b: T) => number
): IRequestPageApi<T> {
  let list = res
  if ('selector' in queryParams) {
    const comperator = typeof customComperator === 'function'
      ? customComperator
      : defaultComperator(queryParams)

    list = res.sort(comperator)
  }

  const { pageSize, offset } = queryParams
  const page = list.slice(queryParams.offset, offset + pageSize)
  return { offset, page, pageSize }
}



export const unixTimestampNow = () => Math.floor(Date.now() / 1000)

export const getChainName = (chain: CHAIN) => NETWORK_METADATA[chain].chainName

export const getTxExplorerUrl = (chain: CHAIN, hash: string) => {
  return EXPLORER_URL[chain] + 'tx/' + hash
}

export function getAccountExplorerUrl(chain: CHAIN, account: string) {
  return EXPLORER_URL[chain] + "address/" + account
}

export function getDebankProfileUrl(account: string) {
  return `https://debank.com/profile/` + account
}


class WithAnimationFrame<T> {
  constructor(private afp: AnimationFrames, private source: Stream<T>) { }

  run(sink: Sink<T>, scheduler: Scheduler): Disposable {

    const frameSink = this.source.run(new WithAnimationFrameSink(this.afp, sink), scheduler)

    return frameSink
  }
}



class WithAnimationFrameSink<T> implements Sink<T> {
  latestPendingFrame = -1

  constructor(private afp: AnimationFrames, private sink: Sink<T>) { }

  event(time: number, value: T): void {

    if (this.latestPendingFrame > -1) {
      this.afp.cancelAnimationFrame(this.latestPendingFrame)
    }

    this.latestPendingFrame = this.afp.requestAnimationFrame(() => {
      this.latestPendingFrame = -1
      eventThenEnd(time, this.sink, value)
    })
  }

  end(): void {
    if (this.latestPendingFrame > -1) {
      this.afp.cancelAnimationFrame(this.latestPendingFrame)
    }
  }

  error(time: number, err: Error): void {
    this.end()
    this.sink.error(time, err)
  }
}

const eventThenEnd = <T>(requestTime: number, sink: Sink<T>, value: T) => {
  sink.event(requestTime, value)
}

export const drawWithinFrame = <T>(source: Stream<T>, afp: AnimationFrames = window): Stream<T> =>
  new WithAnimationFrame(afp, source)



export type StateStream<T> = {
  [P in keyof T]: Stream<T[P]>
}

export function replayState<A>(state: StateStream<A>): Stream<A> {
  return replayLatest(multicast(combineObject(state)))
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

interface ISwitchMapCurry2 {
  <T, R>(cb: (t: T) => Stream<R>, s: Stream<T>): Stream<R>
  <T, R>(cb: (t: T) => Stream<R>): (s: Stream<T>) => Stream<R>
}


function switchMapFn<T, R>(cb: (t: T) => Stream<R>, s: Stream<T>) {
  return switchLatest(map(cb, s))
}

export const switchMap: ISwitchMapCurry2 = curry2(switchMapFn)



export function getPositionKey(account: string, collateralToken: string, indexToken: string, isLong: boolean) {
  return keccak256(
    ["address", "address", "address", "bool"],
    [account, collateralToken, indexToken, isLong]
  )
}


export interface IPeriodRun<T> {
  actionOp: Op<number, Promise<T>>

  interval?: number
  startImmediate?: boolean
  recoverError?: boolean
}

export const filterNull = <T>(prov: Stream<T | null>) => filter((provider): provider is T => provider !== null, prov)


export const periodicRun = <T>({ actionOp, interval = 1000, startImmediate = true, recoverError = true }: IPeriodRun<T>): Stream<T> => {
  const tickDelay = at(interval, null)
  const tick = startImmediate ? merge(now(null), tickDelay) : tickDelay

  return O(
    constant(performance.now()),
    actionOp,
    awaitPromises,
    recoverError
      ? recoverWith(err => {
        console.error(err)

        return periodicRun({ interval: interval * 2, actionOp, recoverError, startImmediate: false })
      })
      : O(),
    continueWith(() => {
      return periodicRun({ interval, actionOp, recoverError, startImmediate: false, })
    }),
  )(tick)
}

export const switchFailedSources = <T>(sourceList: Stream<T>[], activeSource = 0): Stream<T> => {
  const source = sourceList[activeSource]
  return recoverWith((err) => {
    console.warn(err)
    const nextActive = activeSource + 1
    if (!sourceList[nextActive]) {
      console.warn(new Error('No sources left to recover with'))

      return empty()
    }

    return switchFailedSources(sourceList, nextActive)
  }, source)
}


export const timespanPassedSinceInvoke = (timespan: number) => {
  let lastTimePasses = unixTimestampNow()

  return () => {
    const nowTime = unixTimestampNow()
    const delta = nowTime - lastTimePasses
    if (delta > timespan) {
      lastTimePasses = nowTime
      return true
    }

    return false
  }
}

interface ICacheItem<T> {
  item: Promise<T>
  lifespanFn: () => boolean
}


export const cacheMap = (cacheMap: { [k: string]: ICacheItem<any> }) => <T>(key: string, lifespan: number, cacheFn: () => Promise<T>): Promise<T> => {
  const cacheEntry = cacheMap[key]

  if (cacheEntry && !cacheMap[key].lifespanFn()) {
    return cacheEntry.item
  } else {
    const lifespanFn = cacheMap[key]?.lifespanFn ?? timespanPassedSinceInvoke(lifespan)
    const newLocal = { item: cacheFn(), lifespanFn }
    cacheMap[key] = newLocal
    return cacheMap[key].item
  }
}



export function groupByMapMany<A, B extends string | symbol | number>(list: A[], getKey: (v: A) => B) {
  const map: { [P in B]: A[] } = {} as any

  list.forEach(item => {
    const key = getKey(item)

    map[key] ??= []
    map[key].push(item)
  })

  return map
}



export function groupByKey<A, B extends string | symbol | number>(list: A[], getKey: (v: A) => B) {
  return groupByKeyMap(list, getKey, (x) => x)
}

export function groupByKeyMap<A, B extends string | symbol | number, R>(list: A[], getKey: (v: A) => B, mapFn: (v: A) => R) {
  const gmap = {} as { [P in B]: R }

  list.forEach((item) => {
    const key = getKey(item)

    if (gmap[key]) {
      console.warn(new Error(`${groupByKey.name}() is overwriting property: ${String(key)}`))
    }

    gmap[key] = mapFn(item)
  })

  return gmap
}


export const createSubgraphClient = (opts: ClientOptions) => {

  const client = createClient(opts)

  return async <Data, Variables extends object = {}>(document: TypedDocumentNode<Data, Variables>, params: Variables, context?: Partial<OperationContext>): Promise<Data> => {
    const result = await client.query(document, params, context)
      .toPromise()

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result.data!
  }
}

export function getSafeMappedValue<T extends Object>(contractMap: T, prop: any, fallbackProp: keyof T): T[keyof T] {
  return prop in contractMap
    ? contractMap[prop as keyof T]
    : contractMap[fallbackProp]
}

export function getMappedValue<T extends Object>(contractMap: T, prop: any): T[keyof T] {

  if (!(prop in contractMap)) {
    throw new Error(`prop ${prop} does not exist in object`)
  }

  return contractMap[prop as keyof T]
}

export function easeInExpo(x: number) {
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10)
}



export function getTargetUsdgAmount(weight: bigint, usdgSupply: bigint, totalTokenWeights: bigint) {
  if (usdgSupply === 0n) {
    return 0n
  }

  return weight * usdgSupply / totalTokenWeights
}

export function getFeeBasisPoints(
  debtUsd: bigint,
  weight: bigint,

  amountUsd: bigint,
  feeBasisPoints: bigint,
  taxBasisPoints: bigint,
  increment: boolean,
  usdgSupply: bigint,
  totalTokenWeights: bigint
) {

  const nextAmount = increment
    ? debtUsd + amountUsd
    : amountUsd > debtUsd
      ? 0n
      : debtUsd - amountUsd

  const targetAmount = getTargetUsdgAmount(weight, usdgSupply, totalTokenWeights)

  if (targetAmount === 0n) {
    return feeBasisPoints
  }

  const initialDiff = debtUsd > targetAmount ? debtUsd - targetAmount : targetAmount - debtUsd
  const nextDiff = nextAmount > targetAmount ? nextAmount - targetAmount : targetAmount - nextAmount

  if (nextDiff < initialDiff) {
    const rebateBps = taxBasisPoints * initialDiff / targetAmount
    return rebateBps > feeBasisPoints ? 0n : feeBasisPoints - rebateBps
  }

  let averageDiff = (initialDiff + nextDiff) / 2n

  if (averageDiff > targetAmount) {
    averageDiff = targetAmount
  }

  const taxBps = taxBasisPoints * averageDiff / targetAmount

  return feeBasisPoints + taxBps
}

export function importGlobal<T extends { default: any }>(query: Promise<T>): Stream<T['default']> {
  let cache: T['default'] | null = null

  return {
    run(sink, scheduler) {
      if (cache === null) {
        fromPromise(query.then(res => {
          cache = (res as any).default
          sink.event(scheduler.currentTime(), cache)
        }))
      } else {
        sink.event(scheduler.currentTime(), cache)
      }

      return disposeNone()
    },
  }
}

