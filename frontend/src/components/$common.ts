import { style, $text } from "@aelea/dom"
import { $column, layoutSheet, $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IAttributeMappings, IBerry } from "@gambitdao/gbc-middleware"
import { $txHashRef } from "../elements/$common"
import { $berryById, $labItem } from "../logic/common"

export const $berryTileId = (id: number, berry: IBerry | null = null, size = 65) => $column(style({ position: 'relative' }))(
  $berryById(id, berry, size),
  $text(style({ textAlign: 'left', paddingLeft: '3px', paddingTop: '1px', fontSize: '.55em', position: 'absolute', fontWeight: 'bold', color: '#000' }))(String(id))
)

export function $mintDet1ails(txHash: string, berriesAmount: number, ids: number[]) {

  return $column(layoutSheet.spacing)(
    $row(style({ placeContent: 'space-between' }))(
      $text(style({ color: pallete.positive }))(`Minted ${berriesAmount} ${IAttributeMappings[ids[0]]}`),
      $txHashRef(txHash)
    ),
    $row(style({ flexWrap: 'wrap' }))(...ids.map(tokenId => {     
      return $labItem(tokenId)
    })),
  )
}

