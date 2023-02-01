import { Behavior, O } from "@aelea/core"
import { $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"

import { IWalletLink } from "@gambitdao/wallet-link"
import { saleDescriptionList, GBC_ADDRESS, getLatestSaleRule } from "@gambitdao/gbc-middleware"
import { $anchor } from "@gambitdao/ui-components"
import { $Mint } from "./$Mint"
import { $accountIconLink, $responsiveFlex } from "../../elements/$common"
import { $seperator2 } from "../common"
import { $logo } from "../../common/$icons"
import { $opensea } from "../../elements/$icons"


interface ILabStore {
  walletLink: IWalletLink
  parentRoute: Route
}

export const $LabStore = (config: ILabStore) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

) => {


  return [
    $column(layoutSheet.spacingBig)(

      $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
        $text(style({ fontWeight: 'bold', fontSize: '2.5em', textAlign: 'center' }))(screenUtils.isDesktopScreen ? 'Blueberry Lab Store' : 'Lab Store'),
        $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '678px' }))('You will find here the different items available to customize your GBC'),
      ),

      $node(style({ flex: 1 }))(),

      $column(layoutSheet.spacingBig, style({ justifyContent: 'space-between' }))(
        $responsiveFlex(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
          $text(style({ fontWeight: 'bold', fontSize: '1.8em' }))('Items'),

          $node(style({ flex: 1 }))(),

          $row(layoutSheet.spacing)(
            $accountIconLink(GBC_ADDRESS.LAB),
            $seperator2,
            $anchor(layoutSheet.spacingTiny, attr({ href: `https://opensea.io/collection/blueberry-lab-items` }))(
              $icon({
                $content: $opensea,
                viewBox: '0 0 32 32'
              }),
              $text('Lab Marketplace')
            ),
          ),
        ),

        $row(screenUtils.isDesktopScreen ? style({ gap: '50px', placeContent: 'space-between', flexWrap: 'wrap' }) : O(layoutSheet.spacingBig, style({ overflow: 'hidden', placeContent: 'space-evenly', flexWrap: 'wrap' })))(
          ...saleDescriptionList.map(sale => {

            const rule = getLatestSaleRule(sale)
            return $Mint(sale, rule, config.walletLink, config.parentRoute, changeRouteTether)

          })
        ),
      ),

      $node(),
    ),

    { changeRoute }
  ]
})


