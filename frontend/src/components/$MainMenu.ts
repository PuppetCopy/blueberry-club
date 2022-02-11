import { Behavior, combineArray, O, Op } from "@aelea/core"
import { $Node, $node, $text, attr, component, IBranch, nodeEvent, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $caretDown, $column, $icon, $Popover, $row, $seperator, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { pallete } from "@aelea/ui-components-theme"
import { formatReadableUSD, IClaim } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import {  constant, empty, map, now, switchLatest } from '@most/core'
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { WALLET } from "../logic/provider"
import { $anchor } from "../elements/$common"
import { $discord, $moreDots, $twitter } from "../elements/$icons"
import { $AccountPreview } from "./$AccountProfile"
import { $IntermediateConnect } from "./$ConnectAccount"
import { $ButtonSecondary } from "./form/$Button"
import { totalWalletHoldingsUsd } from "../logic/gbcTreasury"
import { $Dropdown } from "./form/$Dropdown"
import { $bagOfCoinsCircle, $fileCheckCircle } from "../common/$icons"
import { $Link } from "./$Link"

export const $socialMediaLinks = $row(layoutSheet.spacingBig)(
  $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.middleground}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://discord.com/invite/cxjZYR4gQK' }))(
    $icon({ $content: $discord, width: '22px', viewBox: `0 0 32 32` })
  ),
  $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.middleground}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://twitter.com/GBlueberryClub' }))(
    $icon({ $content: $twitter, width: '21px', viewBox: `0 0 24 24` })
  )
)

interface MainMenu {
  parentRoute: Route
  containerOp?: Op<IBranch, IBranch>
  walletLink: IWalletLink
  claimMap: Stream<Map<string, IClaim>>
  walletStore: state.BrowserStore<WALLET, "walletStore">

  showAccount?: boolean
}

export const $MainMenu = ({ walletLink, parentRoute, containerOp = O(), walletStore, claimMap, showAccount = true }: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [profileLinkClick, profileLinkClickTether]: Behavior<any, any>,
  [walletChange, walletChangeTether]: Behavior<any, IEthereumProvider | null>,
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,

) => {

  const $treasury = $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
    $text('Treasury: '),
    switchLatest(map(x => $text('$' + formatReadableUSD(x)), totalWalletHoldingsUsd)),
    $icon({ $content: $caretDown, width: '13px', svgOps: style({ marginTop: '6px', marginLeft: '4px' }), viewBox: '0 0 32 32' }),
  )

  const $govItem = (label: string, $iconPath: $Node, description: string) => $row(layoutSheet.spacing)(
    $icon({ $content: $iconPath, width: '36px', svgOps: style({ minWidth: '36px' }), viewBox: '0 0 32 32' }),
    $column(layoutSheet.spacingTiny)(
      $text(label),
      $text(style({ color: pallete.foreground, fontSize:'.75em' }))(description)
    )
  )

  const $treasuryMenuItem = $Link({ $content: $govItem('Treasury', $bagOfCoinsCircle, 'GBC Community-Led Portfolio'), url: '/p/treasury', route: parentRoute })({
    click: routeChangeTether()
  })
  const $govMenuItem = $anchor(style({ textDecoration:'none' }), attr({ href: 'https://snapshot.org/#/gbc-nft.eth', target:'_blank' }))(
    $govItem('Governance', $fileCheckCircle, 'Treasury Governance, 1 GBC = 1 Voting Power')
  )


  return [
    $row(layoutSheet.spacingBig, style({ fontSize: '.9em', flex: 1, alignItems: 'center', placeContent: 'flex-end' }), containerOp)(
      $Dropdown({
        value: now(null),
        // disabled: accountChange,
        // $noneSelected: $text('Choose Amount'),
        $selection: map(amount => $treasury),
        select: {
          $container: $column(layoutSheet.spacingTiny, style({ minWidth:'400px' })),
          $option: map(option => option),
          options: [
            $treasuryMenuItem,
            $govMenuItem,
          ],
        }
      })({
        
      }),
      

      $node(style({ flex: 1 }))(),

      screenUtils.isDesktopScreen ? $socialMediaLinks : empty(),

      $Popover({
        dismiss: profileLinkClick,
        $$popContent: combineArray((_) => {
          return $column(layoutSheet.spacingBig)(
            screenUtils.isMobileScreen ? $socialMediaLinks : empty(),
            $ButtonSecondary({
              $content: $text('Change Wallet')
            })({
              click: walletChangeTether(
                map(pe => {
                  pe.preventDefault()
                  pe.stopImmediatePropagation()
                }),
                // awaitPromises,
                constant(null)
              )
            })
          )
        }, clickPopoverClaim),
      })(
        $IntermediateConnect({
          walletStore,
          $display: $row(
            switchLatest(map((account) => {
              if (!account) {
                return empty()
              }
              
              return $row(style({ border: `2px solid ${pallete.middleground}`, borderLeft: 0, borderRadius: '30px' }))(
                $AccountPreview({
                  address: account,
                })({ profileClick: O(profileLinkClickTether(), routeChangeTether()) }),
                style({ marginLeft: '6px', backgroundColor: pallete.middleground, width: '2px' }, $seperator),
                $icon({
                  svgOps: O(
                    clickPopoverClaimTether(nodeEvent('click')),
                    style({
                      padding: '6px',
                      cursor: 'pointer',
                      alignSelf: 'center',
                      marginRight: '6px',
                      transform: 'rotate(90deg)',
                    })
                  ),
                  width: '32px',
                  $content: $moreDots,
                  viewBox: '0 0 32 32'
                }),
              )
            }, walletLink.account))
          ),
          walletLink
        })({
          walletChange: walletChangeTether()
        }),
      )({
        // overlayClick: clickPopoverClaimTether()
      }),


     
    ),


    { routeChange, walletChange }
  ]
})


