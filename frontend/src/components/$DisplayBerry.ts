import { $svg, attr, $Node, $wrapNativeElement, style } from "@aelea/dom"
import { map, now, tap } from "@most/core"

import { IBerryDisplayTupleMap, berryPartsToSvg } from "@gambitdao/gbc-middleware"
import { $IntermediatePromise } from "@gambitdao/ui-components"
import { SvgPartsMap } from "@gambitdao/gbc-middleware"



export function $svgContent(content: string): $Node[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<g>${content}</g>`, "image/svg+xml")

  // @ts-ignore
  const firstNode = Array.from(doc.firstChild?.childNodes)

  // @ts-ignore
  return firstNode.map(node => $wrapNativeElement(node)())
}



export const $berry = (
  svgParts: SvgPartsMap,
  displayTuple: Partial<IBerryDisplayTupleMap>,
  size: string | number = 250
) => {
  const sizeNorm = typeof size === 'number' ? size + 'px' : size

  return $svg('svg')(
    style({ minWidth: sizeNorm, height: sizeNorm }),
    attr({ xmlns: 'http://www.w3.org/2000/svg', preserveAspectRatio: "xMidYMin meet", fill: 'none', viewBox: `0 0 1500 1500` })
  )(
    tap(async ({ element }) => {
      element.innerHTML = berryPartsToSvg(svgParts, displayTuple)
    })
  )()
}

export const $loadBerry = (
  attributeTuple: Partial<IBerryDisplayTupleMap>,
  size: string | number = 250
) => {

  const query = now(import("@gambitdao/gbc-middleware/src/mappings/svgParts").then(res => res.default))

  return $IntermediatePromise({
    query,
    $$done: map(svgBody => {
      return $berry(svgBody, attributeTuple, size)
    })
  })({})
}

