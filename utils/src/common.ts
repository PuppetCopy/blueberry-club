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
  const timeDelta = unixTimestampNow() - time
  const interval = intervals.find(i => i.seconds < timeDelta)

  if (!interval) {
    return ''
  }
    
  const count = Math.floor(timeDelta / interval.seconds)
  return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`
}