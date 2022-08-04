import { Behavior, combineArray, O, Op } from "@aelea/core"
import { $Branch, $element, $Node, $text, attr, component, IBranch, nodeEvent, style } from "@aelea/dom"
import { $RouterAnchor, Route } from '@aelea/router'
import { $column, $icon, $Popover, $row, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { pallete, theme } from "@aelea/ui-components-theme"
import { formatReadableUSD, IClaim } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { constant, empty, map, now, switchLatest } from '@most/core'
import { IEthereumProvider } from "eip1193-provider"
import { WALLET } from "../logic/provider"
import { $bagOfCoins, $caretDown, $stackedCoins } from "../elements/$icons"
import { $accountPreview, $walletAccountDisplay } from "./$AccountProfile"
import { $IntermediateConnectPopover } from "./$ConnectAccount"
import { $ButtonSecondary } from "./form/$Button"
import { totalWalletHoldingsUsd } from "../logic/gbcTreasury"
import { $Dropdown, $defaultSelectContainer } from "./form/$Dropdown"
import { $bagOfCoinsCircle, $fileCheckCircle, $logo, $logoFull, $labLogo, $gmxLogo } from "../common/$icons"
import { $anchor, $discord, $gitbook, $github, $instagram, $Link, $moreDots, $twitter } from "@gambitdao/ui-components"
import { $seperator2 } from "../pages/common"
import { $Picker } from "../components/$ThemePicker"
import { dark, light } from "../common/theme"
import { Stream } from "@most/types"




interface MainMenu {
  parentRoute: Route
  containerOp?: Op<IBranch, IBranch>
  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">

  showAccount?: boolean
}

export const $MainMenu = ({ walletLink, parentRoute, containerOp = O(), walletStore, showAccount = true }: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [profileLinkClick, profileLinkClickTether]: Behavior<any, any>,
  [walletChange, walletChangeTether]: Behavior<any, IEthereumProvider | null>,
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,

) => {


  const $govItem = (label: string, $iconPath: $Node, description: string) => $row(layoutSheet.spacing)(
    $icon({ $content: $iconPath, width: '36px', svgOps: style({ minWidth: '36px' }), viewBox: '0 0 32 32' }),
    $column(layoutSheet.spacingTiny)(
      $text(label),
      $text(style({ color: pallete.foreground, fontSize: '.75em' }))(description)
    )
  )



  const $pageLink = ($iconPath: $Branch<SVGPathElement>, text: string | Stream<string>) => $row(style({ alignItems: 'center', cursor: 'pointer' }))(
    $icon({ $content: $iconPath, width: '16px', fill: pallete.middleground, svgOps: style({ minWidth: '36px' }), viewBox: '0 0 32 32' }),
    $text(text)
  )

  const $treasuryStatus = $row(style({ alignItems: 'center', cursor: 'pointer' }))(
    $pageLink($bagOfCoins, map(x => formatReadableUSD(x, { maximumFractionDigits: 0 }), totalWalletHoldingsUsd)),
    $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' })
  )


  const $menuItemList = [
    $Link({ $content: $pageLink($labLogo, 'Lab'), url: '/p/lab', route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      click: routeChangeTether()
    }),
    $Link({ $content: $pageLink($stackedCoins, 'Leaderboard'), disabled: now(true), url: '/p/leaderboard', route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      click: routeChangeTether()
    }),
    $Link({ $content: $pageLink($gmxLogo, 'Trade'), url: '/p/trade', disabled: now(true), route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      click: routeChangeTether()
    }),
  ]


  const $treasuryLinks = [
    $Link({ $content: $govItem('Treasury', $bagOfCoinsCircle, 'GBC Community-Led Portfolio'), url: '/p/treasury', route: parentRoute })({
      click: routeChangeTether()
    }),
    $anchor(style({ textDecoration: 'none' }), attr({ href: 'https://snapshot.org/#/gbc-nft.eth', target: '_blank' }))(
      $govItem('Governance', $fileCheckCircle, 'Treasury Governance, 1 GBC = 1 Voting Power')
    ),
  ]

  return [
    $row(layoutSheet.spacingBig, style({ alignItems: 'center', placeContent: 'center', flex: 1, width: '100%', padding: '30px 0', zIndex: 1000, borderRadius: '12px' }))(
      screenUtils.isDesktopScreen ? $row(layoutSheet.spacingBig, style({ flex: 1, alignItems: 'center' }))(
        $RouterAnchor({ url: '/', route: parentRoute, $anchor: $element('a')($icon({ $content: theme.name === 'dark' ? $logo : $logoFull, width: '55px', viewBox: '0 0 32 32' })) })({
          click: routeChangeTether()
        }),

        $Dropdown({
          $selection: $treasuryStatus,
          value: {
            value: now(null),
            $container: $defaultSelectContainer(style({ minWidth: '300px' })),
            $$option: map(option => option),
            list: $treasuryLinks,
          }
        })({}),
      ) : empty(),
      $row(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ fontSize: '.9em', flex: 1, alignItems: 'center', placeContent: 'center' }), containerOp)(

        ...$menuItemList,

        $Popover({
          // dismiss: profileLinkClick,
          $$popContent: combineArray((_) => {
            return $column(layoutSheet.spacingBig)(
              ...screenUtils.isMobileScreen
                ? $treasuryLinks
                : [],

              // ...screenUtils.isMobileScreen ? $menuItemList : [],
              $row(layoutSheet.spacingBig, style({ flexWrap: 'wrap', width: '210px' }))(
                $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://discord.com/invite/7ZMmeU3z9j' }))(
                  $icon({ $content: $discord, width: '22px', viewBox: `0 0 32 32` })
                ),
                $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://docs.blueberry.club/' }))(
                  $icon({ $content: $gitbook, width: '22px', viewBox: `0 0 32 32` })
                ),
                $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://twitter.com/GBlueberryClub' }))(
                  $icon({ $content: $twitter, width: '22px', viewBox: `0 0 24 24` })
                ),
                $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://www.instagram.com/blueberryclub.eth' }))(
                  $icon({ $content: $instagram, width: '18px', viewBox: `0 0 32 32` })
                ),
                $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://github.com/nissoh/blueberry-club' }))(
                  $icon({ $content: $github, width: '22px', viewBox: `0 0 32 32` })
                ),
              ),
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
              }),

              $Picker([light, dark])({}),
            )
          }, clickPopoverClaim),
        })(
          $row(style({ border: `2px solid ${pallete.horizon}`, borderRadius: '30px' }))(
            $icon({
              svgOps: O(
                clickPopoverClaimTether(nodeEvent('click')),
                style({
                  marginLeft: '3px',
                  padding: '6px',
                  cursor: 'pointer',
                  alignSelf: 'center',
                  transform: 'rotate(90deg)',
                })
              ),
              width: '32px',
              $content: $moreDots,
              viewBox: '0 0 32 32'
            }),

            style({ backgroundColor: pallete.horizon, width: '2px', margin: '0px 10px 0 0' }, $seperator2),

            $IntermediateConnectPopover({
              $button: profileLinkClickTether()(style({ cursor: 'pointer' }, $walletAccountDisplay())),
              walletLink,
              walletStore,
              $display: map(address => {
                return $Link({
                  route: parentRoute.create({ fragment: 'df2f23f' }),
                  $content: $accountPreview({ address, showAddress: screenUtils.isDesktopScreen }),
                  anchorOp: style({ minWidth: 0, overflow: 'hidden' }),
                  url: `/p/wallet`,
                })({ click: routeChangeTether() })
              })
            })({
              walletChange: walletChangeTether()
            }),

          ),
        )({
          // overlayClick: clickPopoverClaimTether()
        }),

      ),
      screenUtils.isDesktopScreen
        ? $row(style({ flex: 1, placeContent: 'flex-end' }))(
          $row(layoutSheet.spacingBig)(
            $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://discord.com/invite/7ZMmeU3z9j' }))(
              $icon({ $content: $discord, width: '22px', viewBox: `0 0 32 32` })
            ),
            $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://docs.blueberry.club/' }))(
              $icon({ $content: $gitbook, width: '22px', viewBox: `0 0 32 32` })
            ),
            $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://twitter.com/GBlueberryClub' }))(
              $icon({ $content: $twitter, width: '22px', viewBox: `0 0 24 24` })
            ),
            // $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://www.instagram.com/blueberryclub.eth' }))(
            //   $icon({ $content: $instagram, width: '18px', viewBox: `0 0 32 32` })
            // ),
            // $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://github.com/nissoh/blueberry-club' }))(
            //   $icon({ $content: $github, width: '22px', viewBox: `0 0 32 32` })
            // ),
          ))
        : empty()

    ),



    { routeChange, walletChange }
  ]
})


