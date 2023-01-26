import { style, $text, stylePseudo } from "@aelea/dom"
import { $column, layoutSheet, $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IAttributeMappings, IToken, LAB_CHAIN } from "@gambitdao/gbc-middleware"
import { $defaultTableRowContainer, $defaultVScrollContainer, $infoLabeledValue, $spinner, $Table, $txHashRef, TableOption } from "@gambitdao/ui-components"
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
    //         background: #171b1f;
    //     align-items: center;
    //     flex: 1;
    //     place-content: center;
    // }
    // constructed stylesheet
    // .•62 {
    //     display: flex;
    //     flex-direction: row-reverse;
    //     gap: 4px;
    //     font-size: 13.2px;
    //     padding: 16px 0px;
    //     margin: 0px 1px;
    $loader: style({ placeContent: 'center', borderRadius: '0 0 20px 20px', borderBottom: `1px solid ${pallete.horizon}`, margin: '0 1px', background: pallete.background, flexDirection: 'row-reverse', padding: '16px 0' })(
      $infoLabeledValue(
        'Loading',
        style({ margin: '' })(
          $spinner
        )
      )
    )
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

