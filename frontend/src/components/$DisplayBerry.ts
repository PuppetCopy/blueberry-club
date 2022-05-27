import { $svg, attr, $Node, $wrapNativeElement, style } from "@aelea/dom"
import { map, now, tap } from "@most/core"

import {
  IAttributeBody, IAttributeHat,
  IAttributeClothes, IBerryDisplayTupleMap } from "@gambitdao/gbc-middleware"
import { $IntermediatePromise } from "@gambitdao/ui-components"
import { SvgPartsMap } from "../logic/mappings/svgParts"



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
  [background, clothes, body, expression, faceAccessory, hat]: Partial<IBerryDisplayTupleMap>,
  size: string | number = 250
) => {
  const sizeNorm = typeof size === 'number' ?  size + 'px' : size

  return $svg('svg')(
    style({ minWidth: sizeNorm, height: sizeNorm }),
    attr({ xmlns: 'http://www.w3.org/2000/svg', preserveAspectRatio: "xMidYMin meet", fill: 'none', viewBox: `0 0 1500 1500` })
  )(
    tap(async ({ element }) => {
      element.innerHTML = `
        ${background ? svgParts[0][background] : '' }
        ${svgParts[1][clothes ? clothes : IAttributeClothes.NUDE]}
        ${svgParts[2][body ? body : IAttributeBody.BLUEBERRY]}
        ${expression ? svgParts[3][expression] : ''}
        ${faceAccessory ? svgParts[4][faceAccessory] : ''}
        ${svgParts[5][hat ? hat : IAttributeHat.NUDE]}
      `
    })
  )()
}

export const $loadBerry = (
  attributeTuple: Partial<IBerryDisplayTupleMap>,
  size: string | number = 250
) => {

  const query = now(import("../logic/mappings/svgParts").then(({ "default": svgParts }) => svgParts))

  return $IntermediatePromise({
    query,
    $$done: map(svgBody => {
      return $berry(svgBody, attributeTuple, size)
    })
  })({})
}

