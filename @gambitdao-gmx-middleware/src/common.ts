import { map, periodic } from "@most/core"
import { intervalInMsMap } from "./constant"
import { unixTimestampNow } from "./utils"


const intervals = [
  { label: 'year', seconds: intervalInMsMap.MONTH * 12 },
  { label: 'month', seconds: intervalInMsMap.MONTH },
  { label: 'day', seconds: intervalInMsMap.HR24 },
  { label: 'hour', seconds: intervalInMsMap.MIN * 60 },
  { label: 'minute', seconds: intervalInMsMap.MIN },
  { label: 'second', seconds: intervalInMsMap.SEC }
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
