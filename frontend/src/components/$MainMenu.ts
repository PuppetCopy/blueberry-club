import { Behavior, combineArray, O, Op } from "@aelea/core"
import { $node, $text, attr, component, IBranch, nodeEvent, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $column, $icon, $Popover, $row, $seperator, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { pallete } from "@aelea/ui-components-theme"
import { IClaim } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import {  empty, map, switchLatest } from '@most/core'
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { $anchor } from "../elements/$common"
import { $discord, $moreDots, $twitter } from "../elements/$icons"
import { $AccountPreview } from "./$AccountProfile"
import { $IntermediateConnect } from "./$ConnectAccount"

export const $socialMediaLinks = $row(layoutSheet.spacingBig)(
  $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `1px solid ${pallete.message}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://discord.com/invite/cxjZYR4gQK' }))(
    $icon({ $content: $discord, width: '22px', viewBox: `0 0 32 32` })
  ),
  $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `1px solid ${pallete.message}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://twitter.com/GBlueberryClub' }))(
    $icon({ $content: $twitter, width: '21px', viewBox: `0 0 24 24` })
  )
)

interface MainMenu {
  parentRoute: Route
  containerOp?: Op<IBranch, IBranch>
  walletLink: IWalletLink
  claimMap: Stream<Map<string, IClaim>>
  walletStore: state.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">

  showAccount?: boolean
}

export const $MainMenu = ({ walletLink, parentRoute, containerOp = O(), walletStore, claimMap, showAccount = true }: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [profileLinkClick, profileLinkClickTether]: Behavior<any, any>,
  [walletChange, walletChangeTether]: Behavior<any, IEthereumProvider | null>,
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,

) => {

 
  const $treasury = $node(layoutSheet.spacingSmall, style({ display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column' }))(
    $text('Treasury: '),
    $row(layoutSheet.spacingSmall)(
      $text('GLP 0'),
      $seperator,
      $text('ETH 0')
    )
  )


  return [
    $row(layoutSheet.spacingBig, style({ fontSize: '.9em', flex: 1, alignItems: 'center', placeContent: 'flex-end' }), containerOp)(


      screenUtils.isDesktopScreen ? $treasury : empty(),
      

      $node(style({ flex: 1 }))(),

      screenUtils.isDesktopScreen ? $socialMediaLinks : empty(),


      // $Link({ disabled: now(true), $content: $text('Marketplace(WIP)'), url: '/p/leaderboard', route: leaderboardRoute })({
      //   click: routeChangeTether()
      // }),
      // attr({ target: '_blank' })($tradeGMX),
      // showAccount ? style({ height: '20px' }, $seperator) : empty(),
      

      screenUtils.isMobileScreen
        ? $Popover({
          dismiss: profileLinkClick,
          $$popContent: combineArray((_) => {
            return $column(layoutSheet.spacingBig)(
              $treasury,
              $socialMediaLinks
            )
          }, clickPopoverClaim),
        })(
          $row(clickPopoverClaimTether(nodeEvent('click')))(
            $icon({
              svgOps: style({
                border: `1px solid ${pallete.foreground}`,
                borderRadius: '50%',
                padding: '6px',
                cursor: 'pointer'
              }),
              width: '32px',
              $content: $moreDots,
              viewBox: '0 0 32 32'
            })
          )
        )({
        // overlayClick: clickPopoverClaimTether()
        })
        : empty(),

      $IntermediateConnect({
        walletStore,
        $display: $row(
          switchLatest(map((account) => {
            if (!account) {
              return empty()
            }
              
            return $AccountPreview({
              address: account,
            })({ profileClick: O(profileLinkClickTether(), routeChangeTether()) })
          }, walletLink.account))
        ),
        walletLink
      })({
        walletChange: walletChangeTether()
      }),

     
    ),


    { routeChange, walletChange }
  ]
})


