import { intervalInMsMap } from "@gambitdao/gmx-middleware"

export interface IFillGap<T, R extends {time: number}> {
  interval: intervalInMsMap
  getTime: (t: T) => number
  seed: R
  source: T[]
  
  fillMap: (prev: R, next: T) => R
  squashMap?: (prev: R, next: T) => R
}

// Thu Dec 16 2021 16:46:14 GMT+0200 (Israel Standard Time)
export function fillIntervalGap<T, R extends {time: number}>({ source, getTime, interval, seed, fillMap, squashMap = fillMap }: IFillGap<T, R>) {
  return source.reduce(
    (timeline: R[], next: T) => {
      const lastIdx = timeline.length - 1
      const prev = timeline[lastIdx]
      const barSpan = (getTime(next) - prev.time) / interval

      if (barSpan > 1) {
        const barSpanCeil = Math.ceil(barSpan)
        let fillNext = prev
        for (let index = 1; index < barSpanCeil; index++) {
          fillNext = fillMap(fillNext, next)
          timeline.push({ ...fillNext, time: prev.time + interval * index })
        }
      } else {
        timeline.splice(lastIdx, 1, { ...squashMap(prev, next), time: prev.time })
      }

      return timeline
    },
    [seed]
  )
}
