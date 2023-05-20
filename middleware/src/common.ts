import { unixTimestampNow } from "@gambitdao/gmx-middleware"
import { IAttributeBackground, IAttributeClothes, IAttributeBody, IAttributeExpression, IAttributeFaceAccessory, IAttributeHat, LabItemSale, MintRule, SvgPartsMap, IBerryDisplayTupleMap, IAttributeBadge } from "./types.js"
import { svgParts } from "./mappings/svgParts.js"
export const labAttributeTuple = [IAttributeBackground, IAttributeClothes, IAttributeBody, IAttributeExpression, IAttributeFaceAccessory, IAttributeHat, IAttributeBadge] as const

export const getLabItemTupleIndex = (itemId: number) => {
  const attrMap = itemId in IAttributeHat
    ? IAttributeHat : itemId in IAttributeBackground
      ? IAttributeBackground : itemId in IAttributeClothes
        ? IAttributeClothes : itemId in IAttributeFaceAccessory
          ? IAttributeFaceAccessory : itemId in IAttributeExpression
            ? IAttributeExpression : itemId in IAttributeBadge
              ? IAttributeBadge : null

  if (attrMap === null) {
    throw new Error(`item id: ${itemId} doesn't match any attribute`)
  }

  return labAttributeTuple.indexOf(attrMap)
}

export function saleMaxSupply(sale: LabItemSale): bigint {
  return sale.mintRuleList.reduce((seed, next) => seed + next.supply, 0n)
}

export function isSaleWithinTimeRange(rule: MintRule): boolean {
  const { start, finish } = rule
  const now = unixTimestampNow()
  return now > start && now < finish
}

export function getLatestSaleRule(sale: LabItemSale): MintRule {
  const l = sale.mintRuleList.length

  if (!l) {
    throw new Error('Sale contain no mint rules')
  }

  let match = sale.mintRuleList[0]

  if (l === 1) {
    return match
  }

  for (let index = 1; index < l; index++) {
    const element = sale.mintRuleList[index]
    if (element.start > match.start) {
      match = element
    }
  }

  return match
}

export const berrySvg = (tuple: Partial<IBerryDisplayTupleMap>) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin meet" fill="none" viewBox="0 0 1500 1500">${berryPartsToSvg(tuple)}</svg>`
}

export const berryPartsToSvg = ([background, clothes, body, expression, faceAccessory, hat, badge]: Partial<IBerryDisplayTupleMap>,) => {
  return `
    ${background ? svgParts[0][background] : ''}
    ${svgParts[1][clothes ? clothes : IAttributeClothes.NUDE]}
    ${svgParts[2][body ? body : IAttributeBody.BLUEBERRY]}
    ${expression ? svgParts[3][expression] : ''}
    ${faceAccessory ? svgParts[4][faceAccessory] : ''}
    ${svgParts[5][hat ? hat : IAttributeHat.NUDE]}
    ${badge ? svgParts[6][badge] : ''}
  `
}