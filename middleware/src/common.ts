import { IAttributeBackground, IAttributeClothes, IAttributeBody, IAttributeExpression, IAttributeFaceAccessory, IAttributeHat, LabItemSaleDescription, LabItemSaleGbcWhitelistDescription, LabItemSalePermissionedWhitelistDescription, LabSaleWhitelistDescription, LabItemSalePublicDescription } from "./types"


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


export function hasWhitelistSale<T extends LabSaleWhitelistDescription>(sale: T | LabItemSalePublicDescription): sale is T {
  return 'whitelistStartDate' in sale
}
