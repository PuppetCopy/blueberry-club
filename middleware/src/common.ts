import { IAttributeLabBackground, IAttributeLabClothes, IAttributeBody, IAttributeExpression, IAttributeLabFaceAccessory, IAttributeLabHat } from "./types"


const labAttributeTuple = [IAttributeLabBackground, IAttributeLabClothes, IAttributeBody, IAttributeExpression, IAttributeLabFaceAccessory, IAttributeLabHat] as const

export const getLabItemTupleIndex = (itemId: number) => {
  const attrMap = itemId in IAttributeLabHat
    ? IAttributeLabHat : itemId in IAttributeLabBackground
      ? IAttributeLabBackground : itemId in IAttributeLabClothes
        ? IAttributeLabClothes : itemId in IAttributeLabFaceAccessory
          ? IAttributeLabFaceAccessory : null

  if (attrMap === null) {
    throw new Error(`item id: ${itemId} doesn't match any attribute`)
  }

  return labAttributeTuple.indexOf(attrMap)
}


