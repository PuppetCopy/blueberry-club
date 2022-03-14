import { component, $svg, attr, $Node, $wrapNativeElement, style } from "@aelea/dom"
import { tap } from "@most/core"
import svgParts from "../logic/mappings/svgParts"
import {
  IAttributeBody, IAttributeHat,
  IAttributeClothes, IBerryDisplayTupleMap
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
) => component(() => [
  $svg('svg')(
    attr({ xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: `0 0 1500 1500` }),
    style({ minWidth: size, height: size })
  )(
    tap(({ element }) => {

      element.innerHTML = `
        ${background ? svgParts.background[background] : '' }
        ${svgParts.clothes[clothes ? clothes : IAttributeClothes.NUDE]}
        ${svgParts.body[body ? body : IAttributeBody.BLUEBERRY]}
        ${expression ? svgParts.expression[expression] : ''}
        ${faceAccessory ? svgParts.faceAccessory[faceAccessory] : ''}
        ${svgParts.hat[hat ? hat : IAttributeHat.NUDE]}
      `
    })
  )()
])
