import { intervalInMsMap } from "@gambitdao/gmx-middleware"

export interface IFillGap<T, R extends {time: number}> {
  interval: intervalInMsMap
  getTime: (t: T) => number
  seed: R
  source: T[]
  
  fillMap: (prev: R, next: T) => R
  fillGapMap: (prev: R, next: T) => R
  squashMap?: (prev: R, next: T) => R
}

// Thu Dec 16 2021 16:46:14 GMT+0200 (Israel Standard Time)
export function fillIntervalGap<T, R extends {time: number}>({ source, getTime, interval, seed, fillMap, fillGapMap, squashMap = fillGapMap }: IFillGap<T, R>) {
  return source.reduce(
    (timeline: R[], next: T) => {
      const lastIdx = timeline.length - 1
      const prev = timeline[lastIdx]
      let nextTime = prev.time

      const barSpan = (getTime(next) - prev.time) / interval

      if (barSpan > 1) {
        const barSpanCeil = Math.ceil(barSpan)

        for (let index = 1; index < barSpanCeil; index++) {
          nextTime = prev.time + interval * index
          const fillNext = fillGapMap(prev, next)
          timeline.push({ ...fillNext, time: nextTime })
        }
      }
    
      if (barSpan < 1) {
        timeline.splice(lastIdx, 1, { ...squashMap(prev, next), time: prev.time })
      } else {
        timeline.push(fillMap(prev, next))
      }

      return timeline
    },
    [seed]
  )
}
