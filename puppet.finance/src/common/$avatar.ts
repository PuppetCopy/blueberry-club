import { $Node, NodeComposeFn, style } from "@aelea/dom"
import { $row } from "@aelea/ui-components"
import { tap } from "@most/core"
// @ts-ignore
import jazzicon from 'jazzicon'
import { Address } from "viem"

export interface IJazzicon {
  address: Address
  $container?: NodeComposeFn<$Node>
}

export const $defaultProfileContainer = $row(style({ minWidth: '38px', aspectRatio: '1 / 1' }))

export function $jazzicon({
  address,
  $container = $defaultProfileContainer
}: IJazzicon) {

  const cnt = parseInt(address.slice(2, 10), 16)

  return $container(
    tap(node => {
      const size = parseInt(`${node.style!.minWidth}`)
      const el = jazzicon(size, cnt)

      node.element.appendChild(el)
    })
    // $wrapNativeElement(el)(map(node => {
    //   const el: HTMLElement = node.element
    //   const svg = el.querySelector('svg')
    //   if (svg) {
    //     svg.setAttribute('width', sizePx)
    //     svg.setAttribute('height', sizePx)

    //     el.style.borderRadius = '50%'
    //   }
    //   return node
    // }), style({ width: sizePx, minWidth: sizePx, height: sizePx, display: 'flex', position: 'relative' }))
  )()
}

