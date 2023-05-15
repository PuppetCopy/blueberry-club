import { $Node, $wrapNativeElement, style, NodeComposeFn, $svg, attr } from "@aelea/dom"
import { tap } from "@most/core"
import { IBerryDisplayTupleMap, berryPartsToSvg } from "@gambitdao/gbc-middleware"
import { $column } from "@aelea/ui-components"



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
      tap((node) => {
        node.element.innerHTML = berryPartsToSvg(displayTuple)
        return node
      })
    )()
  )
}


