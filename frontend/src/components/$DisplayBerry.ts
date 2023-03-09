import { $Node, $wrapNativeElement, style, NodeComposeFn, $svg, attr } from "@aelea/dom"
import { combine } from "@most/core"
import { IBerryDisplayTupleMap, berryPartsToSvg } from "@gambitdao/gbc-middleware"
import { $column } from "@aelea/ui-components"
import { importGlobal } from "@gambitdao/gmx-middleware"



export const svgParts = importGlobal(import("@gambitdao/gbc-middleware/src/mappings/svgParts"))

export function $svgContent(content: string): $Node[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<g>${content}</g>`, "image/svg+xml")

  // @ts-ignore
  const firstNode = Array.from(doc.firstChild?.childNodes)

  // @ts-ignore
  return firstNode.map(node => $wrapNativeElement(node)())
}


export const $defaultBerry = $column(style({
  // placeSelf: 'flex-start'
  minWidth: '85px',
  width: '100%',
  aspectRatio: '1 / 1',
  borderRadius: '8px',
  overflow: 'hidden'
}))

export const $berry = (
  displayTuple: Partial<IBerryDisplayTupleMap>,
  $container: NodeComposeFn<$Node> = $defaultBerry
) => {

  return $container(
    $svg('svg')(
      attr({ xmlns: 'http://www.w3.org/2000/svg', preserveAspectRatio: "xMidYMin meet", fill: 'none', viewBox: `0 0 1500 1500` })
    )(
      combine((parts, node) => {
        node.element.innerHTML = berryPartsToSvg(parts, displayTuple)
        return node
      }, svgParts)
    )()
  )
}

// export const $loadBerry = (
//   attributeTuple: Partial<IBerryDisplayTupleMap>,
//   size: string | number = 250
// ) => {

//   const query = now(import("@gambitdao/gbc-middleware/src/mappings/svgParts").then(res => res.default))

//   return $IntermediatePromise({
//     query,
//     $$done: map(svgBody => {
//       return $berry(svgBody, attributeTuple, size)
//     })
//   })({})
// }

