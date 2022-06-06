import { IAttributeBackground, IAttributeClothes, IAttributeBody, IAttributeExpression, IAttributeFaceAccessory, IAttributeHat, LabItemSale, MintRule } from "./types"


const labAttributeTuple = [IAttributeBackground, IAttributeClothes, IAttributeBody, IAttributeExpression, IAttributeFaceAccessory, IAttributeHat] as const

export const getLabItemTupleIndex = (itemId: number) => {
  const attrMap = itemId in IAttributeHat
    ? IAttributeHat : itemId in IAttributeBackground
      ? IAttributeBackground : itemId in IAttributeClothes
        ? IAttributeClothes : itemId in IAttributeFaceAccessory
          ? IAttributeFaceAccessory : null

  if (attrMap === null) {
    throw new Error(`item id: ${itemId} doesn't match any attribute`)
  }

  return labAttributeTuple.indexOf(attrMap)
}

export function saleMaxSupply(sale: LabItemSale): number {
  return sale.mintRuleList.reduce((seed, next) => seed + next.amount, 0)
}

export function saleLastDate(sale: LabItemSale): MintRule {
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
