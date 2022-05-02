import { intervalInMsMap } from "@gambitdao/gmx-middleware"

export function getPricefeedVisibleColumns(maxColumns: number, from: number, to: number) {
  const delta = to - from

  const interval = maxColumns < delta / intervalInMsMap.DAY7
    ? intervalInMsMap.DAY7 : maxColumns < delta / intervalInMsMap.HR24
      ? intervalInMsMap.HR24 : maxColumns < delta / intervalInMsMap.HR4
        ? intervalInMsMap.HR4 : maxColumns < delta / intervalInMsMap.MIN60
          ? intervalInMsMap.MIN60 : intervalInMsMap.MIN15
  
  return interval
}