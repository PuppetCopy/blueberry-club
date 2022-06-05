import { style, $text } from "@aelea/dom"
import { $column, layoutSheet, $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IAttributeMappings, IToken, USE_CHAIN } from "@gambitdao/gbc-middleware"
import { $txHashRef } from "@gambitdao/ui-components"
import { $berryByToken, $labItem } from "../logic/common"

export const $berryTileId = (token: IToken, size = 65) => $column(style({ position: 'relative' }))(
  style({ borderRadius: `${size / 10}px` }, $berryByToken(token, size)),
  $text(style({ textAlign: 'left', paddingLeft: '3px', paddingTop: '1px', color: '#fff', textShadow: '0px 0px 5px black', fontSize: '.55em', position: 'absolute', fontWeight: 'bold' }))(String(token.id))
)

export function $mintDet1ails(txHash: string, berriesAmount: number, ids: number[]) {

  return $column(layoutSheet.spacing)(
    $row(style({ placeContent: 'space-between' }))(
      $text(style({ color: pallete.positive }))(`Minted ${berriesAmount} ${IAttributeMappings[ids[0]]}`),
      $txHashRef(txHash, USE_CHAIN)
    ),
    $row(style({ flexWrap: 'wrap' }))(...ids.map(tokenId => {
      return $labItem(tokenId)
    })),
  )
}

