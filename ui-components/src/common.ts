import { intervalTimeMap } from "@gambitdao/gmx-middleware"

export function getPricefeedVisibleColumns(maxColumns: number, from: number, to: number) {
  const delta = to - from

  const interval = maxColumns < delta / intervalTimeMap.DAY7
    ? intervalTimeMap.DAY7 : maxColumns < delta / intervalTimeMap.HR24
      ? intervalTimeMap.HR24 : maxColumns < delta / intervalTimeMap.HR4
        ? intervalTimeMap.HR4 : maxColumns < delta / intervalTimeMap.MIN60
          ? intervalTimeMap.MIN60 : maxColumns < delta / intervalTimeMap.MIN15
            ? intervalTimeMap.MIN15 : intervalTimeMap.MIN5
  
  return interval
}