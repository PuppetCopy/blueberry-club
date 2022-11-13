import { map, periodic } from "@most/core"
import { intervalTimeMap } from "./constant"
import { unixTimestampNow } from "./utils"


const intervals = [
  { label: 'year', seconds: intervalTimeMap.MONTH * 12 },
  { label: 'month', seconds: intervalTimeMap.MONTH },
  { label: 'day', seconds: intervalTimeMap.HR24 },
  { label: 'hr', seconds: intervalTimeMap.MIN * 60 },
  { label: 'min', seconds: intervalTimeMap.MIN },
  { label: 'sec', seconds: intervalTimeMap.SEC }
] as const

export function timeSince(time: number) {
  const timeDelta = Math.abs(unixTimestampNow() - time)
  const intervalIdx = intervals.findIndex(i => i.seconds < timeDelta)
  // const grade = intervals.indexOf(interval as any)

  if (!intervalIdx) {
    return 'now'
  }

  const fst = intervals[intervalIdx]
  const count1 = Math.floor(timeDelta / fst.seconds)

  const snd = intervals[intervalIdx + 1]
  const count2 = count1 * fst.seconds


  return `${count1} ${fst.label}${count1 !== 1 ? 's' : ''} ${Math.floor((timeDelta - fst.seconds) / snd.seconds)} ${snd.label} `
}


export const everySec = map(unixTimestampNow, periodic(1000))

export const displayDate = (unixTime: number) => {
  return `${new Date(unixTime * 1000).toDateString()} ${new Date(unixTime * 1000).toLocaleTimeString()}`
}

export const countdown = (targetDate: number) => {
  return map(now => countdownFn(targetDate, now), everySec)
}

export function countdownFn(targetDate: number, now: number) {
  const distance = targetDate - now

  const days = Math.floor(distance / (60 * 60 * 24))
  const hours = Math.floor((distance % (60 * 60 * 24)) / (60 * 60))
  const minutes = Math.floor((distance % (60 * 60)) / 60)
  const seconds = Math.floor(distance % 60)

  return `${days ? days + "d " : ''} ${hours ? hours + "h " : ''} ${minutes ? minutes + "m " : ''} ${seconds ? seconds + "s " : ''}`
}
