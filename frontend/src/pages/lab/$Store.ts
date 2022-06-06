import { Behavior, O, Tether } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { $labItem } from "../../logic/common"
import { LabItemSale, saleMaxSupply, saleDescriptionList, SaleType, saleLastDate } from "@gambitdao/gbc-middleware"
import { pallete } from "@aelea/ui-components-theme"
import { $Link } from "@gambitdao/ui-components"
import { empty, map } from "@most/core"
import { formatFixed, readableNumber, timeSince, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { getMintCount } from "../../logic/contract/sale"
import { mintLabelMap } from "../../logic/mappings/label"
import { $StoreItemPreview } from "./$StoreItem"



interface ILabStore {
  walletLink: IWalletLink
  parentRoute: Route
}

export const $LabStore = ({ walletLink, parentRoute }: ILabStore) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {
  

  return [
    $column(layoutSheet.spacingBig)(

      $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
        $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Blueberry Lab Store'),
        $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '678px' }))('You will find here the different items available to customize your GBC'),
      ),

      $column(layoutSheet.spacingBig, style({ justifyContent: 'space-between' }))(
        $text(style({ fontWeight: 'bold', fontSize: '1.8em' }))('Items'),
        $row(screenUtils.isDesktopScreen ? style({ gap: '50px', placeContent: 'center', flexWrap: 'wrap' }) : O(layoutSheet.spacingBig, style({ overflow: 'hidden', placeContent: 'space-evenly', flexWrap: 'wrap' })))(
          ...saleDescriptionList.map(item =>
            $StoreItemPreview(item, parentRoute, changeRouteTether)
          )
        ),
      ),

      $node(),
    ),

    { changeRoute }
  ]
})


