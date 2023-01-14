import { $wrapNativeElement, style } from "@aelea/dom"
import { map } from "@most/core"
// @ts-ignore
import jazzicon from 'jazzicon'


export function $jazzicon(address: string, size = 24) {
  const sizePx = size + 'px'

  const cnt = parseInt(address.slice(2, 10), 16)
  const el = jazzicon(parseInt(sizePx), cnt)

  return $wrapNativeElement(el)(map(node => {
    const el: HTMLElement = node.element
    const svg = el.querySelector('svg')
    if (svg) {
      svg.setAttribute('width', sizePx)
      svg.setAttribute('height', sizePx)

      el.style.borderRadius = '50%'
    }
    return node
  }), style({ width: sizePx, minWidth: sizePx, height: sizePx, display: 'flex', position: 'relative' }))()
}

