import { SaleType, TraitAppearanceValue } from "./types"

export const attributeIndexToLabel: TraitAppearanceValue[] = ['Background', 'Clothes', 'Body', 'Expression', 'Face Accessory', 'Hat']

export const mintLabelMap = {
  [SaleType.Public]: 'Public',
  [SaleType.holder]: 'Holder',
  [SaleType.whitelist]: 'Whitelist',
}
