import { Behavior, O, Op } from "@aelea/core"
import { $node, $text, component, IBranch, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $row, $seperator, layoutSheet, screenUtils } from '@aelea/ui-components'
import { chain, empty, map, switchLatest } from '@most/core'
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { IClaim } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $AccountPreview } from "./$AccountProfile"
import { $IntermediateConnect } from "./$ConnectAccount"



interface MainMenu {
  parentRoute: Route
  containerOp?: Op<IBranch, IBranch>
  walletLink: Stream<IWalletLink | null>
  claimMap: Stream<Map<string, IClaim>>

  showAccount?: boolean
}

export const $MainMenu = ({ walletLink, parentRoute, containerOp = O(), claimMap, showAccount = true }: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [profileLinkClick, profileLinkClickTether]: Behavior<any, any>,
  [walletChange, walletChangeTether]: Behavior<any, IEthereumProvider | null>,

) => {

 
  return [
    $row(layoutSheet.spacingBig, style({ fontSize: '.9em', flex: 1, alignItems: 'center', placeContent: 'flex-end' }), containerOp)(


      $node(layoutSheet.spacingSmall, style({ display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column' }))(
        $text('Treasury: '),
        $row(layoutSheet.spacingSmall)(
          $text('GLP 0'),
          $seperator,
          $text('ETH 0'),
        )
      ),
      

      $node(style({ flex: 1 }))(),

      // $Link({ disabled: now(true), $content: $text('Marketplace(WIP)'), url: '/p/leaderboard', route: leaderboardRoute })({
      //   click: routeChangeTether()
      // }),
      // attr({ target: '_blank' })($tradeGMX),
      // showAccount ? style({ height: '20px' }, $seperator) : empty(),
      $IntermediateConnect({
        $display: $row(layoutSheet.spacing)(
          switchLatest(
            map(wallet => {
              if (wallet === null) {
                return empty()
              }
              
              return chain((wallet) => {
                return $AccountPreview({
                  address: wallet,
                })({ profileClick: O(profileLinkClickTether(), routeChangeTether()) })
              }, wallet.account)
            }, walletLink)
          )
        ),
        walletLink
      })({
        walletChange: walletChangeTether()
      }),



     
    ),


    { routeChange, walletChange }
  ]
})


