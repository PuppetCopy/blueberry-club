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


function padZero(str: string | number, len = 2) {
  const zeros = new Array(len).join('0')
  return (zeros + str).slice(-len)
}

export function invertColor(hex: string, bw = true) {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1)
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.')
  }
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  if (bw) {
    // https://stackoverflow.com/a/3943023/112731
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186
      ? '#000000'
      : '#FFFFFF'
  }

  
  // pad each with zeros and return
  return "#" + padZero((255 - r).toString(16)) + padZero((255 - g).toString(16)) + padZero((255 - b).toString(16))
}
