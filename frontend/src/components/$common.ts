import { style, $text } from "@aelea/dom"
import { $column, layoutSheet, $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { $txHashRef } from "../elements/$common"
import { $berryById } from "../logic/common"
import { IToken } from "../types"

export const $berryTileId = (id: number,) => $column(style({ position: 'relative' }))(
  $berryById(id),
  $text(style({ textAlign: 'left', paddingLeft: '3px', paddingTop: '1px', fontSize: '.55em', position: 'absolute', fontWeight: 'bold', color: '#000' }))(String(id))
)

export function $mintDetails(txHash: string, berriesAmount: number, ids: IToken[]) {
  return $column(layoutSheet.spacing)(
    $row(style({ placeContent: 'space-between' }))(
      $text(style({ color: pallete.positive }))(`Minted ${berriesAmount} Berries`),
      $txHashRef(txHash)
    ),
    $row(style({ flexWrap: 'wrap' }))(...ids.map(token => {
      const tokenId = Number(BigInt(token.id))

      return $berryTileId(tokenId)
    })),
  )
}
