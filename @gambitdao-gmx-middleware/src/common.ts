import { map, periodic } from "@most/core"
import { intervalTimeMap } from "./constant"
import { unixTimestampNow } from "./utils"


const intervals = [
  { label: 'year', seconds: intervalTimeMap.MONTH * 12 },
  { label: 'month', seconds: intervalTimeMap.MONTH },
  { label: 'day', seconds: intervalTimeMap.HR24 },
  { label: 'hour', seconds: intervalTimeMap.MIN * 60 },
  { label: 'minute', seconds: intervalTimeMap.MIN },
  { label: 'second', seconds: intervalTimeMap.SEC }
] as const

export function timeSince(time: number) {
  const timeDelta = Math.abs(unixTimestampNow() - time)
  const interval = intervals.find(i => i.seconds < timeDelta)

  if (!interval) {
    return ''
  }

  const count = Math.floor(timeDelta / interval.seconds)
  return `${count} ${interval.label}${count !== 1 ? 's' : ''}`
}


const everySec = map(Date.now, periodic(1000))

export const countdown = (targetDate: number) => {
  return map(now => countdownFn(targetDate, now), everySec)
}

export function countdownFn(targetDate: number, now: number) {
  const distance = targetDate - now

  const days = Math.floor(distance / (1000 * 60 * 60 * 24))
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((distance % (1000 * 60)) / 1000)

  return `${days ? days + "d " : ''} ${hours ? hours + "h " : ''} ${minutes ? minutes + "m " : ''} ${seconds ? seconds + "s " : ''}`
}
