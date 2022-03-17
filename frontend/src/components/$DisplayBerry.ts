import { component, $svg, attr, $Node, $wrapNativeElement, style } from "@aelea/dom"
import { tap } from "@most/core"

import {
  IAttributeBody, IAttributeHat,
  IAttributeClothes, IBerryDisplayTupleMap, IAttributeExpression
} from "@gambitdao/gbc-middleware"



export function $svgContent(content: string): $Node[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<g>${content}</g>`, "image/svg+xml")

  // @ts-ignore
  const firstNode = Array.from(doc.firstChild?.childNodes)

  // @ts-ignore
  return firstNode.map(node => $wrapNativeElement(node)())
}



export const $DisplayBerry = (
  [background, clothes, body, expression, faceAccessory, hat]: Partial<IBerryDisplayTupleMap>,
  size = '250px',
) => component(() => {
  const svgPartsQuery = import("../logic/mappings/svgParts")
  return [

    $svg('svg')(
      attr({ xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: `0 0 1500 1500` }),
      style({ minWidth: size, height: size })
    )(
      tap(async ({ element }) => {
        const svgParts = (await svgPartsQuery).default

        element.innerHTML = `
        ${background ? svgParts.background[background] : '' }
        ${svgParts.clothes[clothes ? clothes : IAttributeClothes.NUDE]}
        ${svgParts.body[body ? body : IAttributeBody.BLUEBERRY]}
        ${svgParts.expression[expression ? expression : IAttributeExpression.HAPPY]}
        ${faceAccessory ? svgParts.faceAccessory[faceAccessory] : ''}
        ${svgParts.hat[hat ? hat : IAttributeHat.NUDE]}
      `
      })
    )()
  ]
})
