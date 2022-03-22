import { $svg, attr, $Node, $wrapNativeElement, style, $element, $Branch } from "@aelea/dom"
import { map, now, tap } from "@most/core"

import {
  IAttributeBody, IAttributeHat,
  IAttributeClothes, IBerryDisplayTupleMap, IAttributeExpression
} from "@gambitdao/gbc-middleware"
import { $IntermediatePromise } from "@gambitdao/ui-components"



export function $svgContent(content: string): $Node[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<g>${content}</g>`, "image/svg+xml")

  // @ts-ignore
  const firstNode = Array.from(doc.firstChild?.childNodes)

  // @ts-ignore
  return firstNode.map(node => $wrapNativeElement(node)())
}



export const $displayBerry = (
  [background, clothes, body, expression, faceAccessory, hat]: Partial<IBerryDisplayTupleMap>,
  size = 250,
  displayAsImage = false
) => {

  const svgBodyQuery = import("../logic/mappings/svgParts").then(({ "default": svgParts }) => `
    ${background ? svgParts[0][background] : '' }
    ${svgParts[1][clothes ? clothes : IAttributeClothes.NUDE]}
    ${svgParts[2][body ? body : IAttributeBody.BLUEBERRY]}
    ${svgParts[3][expression ? expression : IAttributeExpression.HAPPY]}
    ${faceAccessory ? svgParts[4][faceAccessory] : ''}
    ${svgParts[5][hat ? hat : IAttributeHat.NUDE]}
  `)

  const dims = style({ minWidth: size + 'px', height: size + 'px' })
  const query = now(svgBodyQuery)


  return $IntermediatePromise({
    query,
    $done: map(svgBody => {

      return displayAsImage
        ? $element('img')(tap(({ element }) => {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 1500 1500">${svgBody}</svg>`
          const blob = new Blob([svg], { type: 'image/svg+xml' })
          const url = URL.createObjectURL(blob)


          element.src = url
          element.onload = () => {
            const canvas = document.createElement("canvas")

            const w = element.clientWidth * 2
            const h = element.clientWidth * 2

            canvas.style.display = 'none'
            canvas.width = w
            canvas.height = h

            canvas.getContext("2d")?.drawImage(element, 0, 0, w, h)
            const imgURL = canvas.toDataURL('image/webp', 1)
            element.src = imgURL
            element.onload = null
          }

        }), dims)()
        : $svg('svg')(attr({ xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: `0 0 1500 1500` }), dims)(
          tap(async ({ element }) => {
            element.innerHTML = svgBody
          })
        )() as $Branch
    })
  })({})
}

