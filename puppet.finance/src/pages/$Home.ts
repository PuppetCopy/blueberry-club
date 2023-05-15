import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, layoutSheet, screenUtils } from "@aelea/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $alert, $anchor, $Link } from "@gambitdao/ui-components"

import {
  ITreasuryStore
} from "@gambitdao/gbc-middleware"
import { $ButtonSecondary } from "../components/form/$Button"
import { BrowserStore } from "../logic/store"



export interface ITreasury {
  parentRoute: Route
  treasuryStore: BrowserStore<"ROOT.v1.treasuryStore", ITreasuryStore>
}





export const $Home = (config: ITreasury) => component((
  [routeChanges, linkClickTether]: Behavior<any, string>,
) => {




  return [
    $column(style(screenUtils.isDesktopScreen ? { gap: '125px' } : { gap: '90px' }))(



      $column(style({ alignItems: 'center', gap: '26px' }))(
        // $icon({ $content: $logo, width: '100px', viewBox: '0 0 32 32' }),

        $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
          $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Treasury'),
          $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))(`Yield is used to support GBC's underlaying value through our products`),
        ),

        style({ alignSelf: 'center' })(
          $alert($text(`Treasury graph is out of sync due to new upcomming changes, stay tuned for a whole new overhaul`))
        ),

        $node(),


        $Link({
          $content: $anchor(
            $ButtonSecondary({
              $content: $text('Treasury Page')
            })({})
          ),
          url: '/p/treasury', route: config.parentRoute.create({ fragment: 'fefe' })
        })({
          click: linkClickTether()
        }),
      ),


    ),

    {
      routeChanges
    }
  ]
})





