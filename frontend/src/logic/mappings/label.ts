import { SaleType } from "@gambitdao/gbc-middleware"


export const attributeIndexToLabel = ['Background', 'Clothes', 'Body', 'Expression', 'Face Accessory', 'Hat']

export const mintLabelMap = {
  [SaleType.Public]: 'Public',
  [SaleType.holderWhitelist]: 'Holder',
  [SaleType.whitelist]: 'Private',
}