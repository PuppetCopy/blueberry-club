import { style, $text, stylePseudo } from "@aelea/dom"
import { $column, layoutSheet, $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IAttributeMappings, IToken, LAB_CHAIN } from "@gambitdao/gbc-middleware"
import { $defaultTableRowContainer, $defaultVScrollContainer, $Table, $txHashRef, TableOption } from "@gambitdao/ui-components"
import { $card } from "../elements/$common"
import { $berryByToken, $labItem } from "../logic/common"

export const $berryTileId = (token: IToken, size = 65) => $column(style({ position: 'relative' }))(
  style({ borderRadius: `${size / 10}px` }, $berryByToken(token, size)),
  $text(style({ textAlign: 'left', paddingLeft: '3px', paddingTop: '1px', color: '#fff', textShadow: '0px 0px 5px black', fontSize: '.55em', position: 'absolute', fontWeight: 'bold' }))(String(token.id))
)

export const $CardTable = <T, FilterState>(config: TableOption<T, FilterState>) => $Table({
  $container: $card(style({ padding: "0", gap: 0 })),
  scrollConfig: {
    $container: $defaultVScrollContainer(style({ gap: '1px' })),
  },
  $bodyRowContainer: $defaultTableRowContainer(
    stylePseudo(':last-child', { borderRadius: '0 0 20px 20px' }),
    style({ background: pallete.background, margin: '0 1px', borderBottom: `1px solid ${pallete.horizon}` })
  ),
  ...config
})

export function $mintDet1ails(txHash: string, berriesAmount: number, ids: number[]) {

  return $column(layoutSheet.spacing)(
    $row(style({ placeContent: 'space-between' }))(
      $text(style({ color: pallete.positive }))(`Minted ${berriesAmount} ${IAttributeMappings[ids[0]]}`),
      $txHashRef(txHash, LAB_CHAIN)
    ),
    $row(style({ flexWrap: 'wrap' }))(...ids.map(tokenId => {
      return $labItem(tokenId)
    })),
  )
}

