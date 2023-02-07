import { $Node, $wrapNativeElement, style, NodeComposeFn, $svg, attr } from "@aelea/dom"
import { combine, fromPromise } from "@most/core"

import { IBerryDisplayTupleMap, berryPartsToSvg } from "@gambitdao/gbc-middleware"
import { Stream } from "@most/types"
import { disposeNone } from "@most/disposable"
import { $column } from "@aelea/ui-components"


function importGlobal<T extends { default: any }>(query: Promise<T>): Stream<T['default']> {

  let cache: T['default'] | null = null

  return {
    run(sink, scheduler) {
      if (cache === null) {
        fromPromise(query.then(res => {
          cache = (res as any).default
          sink.event(scheduler.currentTime(), cache)
        }))
      } else {
        sink.event(scheduler.currentTime(), cache)
      }

      return disposeNone()
    },
  }
}

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

