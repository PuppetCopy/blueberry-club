import { Behavior, O } from "@aelea/core"
import { $Branch, $element, $Node, $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { $RouterAnchor, Route } from '@aelea/router'
import { $column, $icon, $row, layoutSheet, screenUtils } from '@aelea/ui-components'
import { pallete, theme } from "@aelea/ui-components-theme"
import { formatReadableUSD } from "@gambitdao/gmx-middleware"
import { CHAIN, IWalletLink, IWalletName, walletConnect } from "@gambitdao/wallet-link"
import { awaitPromises, constant, empty, map, multicast, now, switchLatest } from '@most/core'
import { $bagOfCoins, $caretDown, $stackedCoins } from "../elements/$icons"
import { $ButtonSecondary } from "./form/$Button"
import { totalWalletHoldingsUsd } from "../logic/gbcTreasury"
import { $Dropdown } from "./form/$Dropdown"
import { $bagOfCoinsCircle, $fileCheckCircle, $logo, $logoFull, $labLogo, $gmxLogo } from "../common/$icons"
import { $anchor, $discord, $gitbook, $github, $instagram, $Link, $moreDots, $twitter } from "@gambitdao/ui-components"
import { $Picker } from "../components/$ThemePicker"
import { dark, light } from "../common/theme"
import { Stream } from "@most/types"
import { $WalletDisplay } from "./$WalletDisplay"
import { $Popover } from "./$Popover"




interface MainMenu {
  chainList: CHAIN[]
  parentRoute: Route
  walletLink: IWalletLink

  showAccount?: boolean
}

export const $MainMenu = ({ walletLink, parentRoute, chainList, showAccount = true }: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<any, IWalletName>,

  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,
  [changeNetwork, changeNetworkTether]: Behavior<CHAIN, CHAIN>,

) => {

  const routeChangeMulticast = multicast(routeChange)


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
    $pageLink($bagOfCoins, map(x => {
      return formatReadableUSD(x)
    }, totalWalletHoldingsUsd)),
    $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' })
  )


  const $menuItemList = [
    // $Link({ $content: $pageLink($gmxLogo, 'Trade'), url: '/p/trade', disabled: now(true), route: parentRoute.create({ fragment: 'feefwefwe' }) })({
    //   // $Link({ $content: $pageLink($gmxLogo, 'Trade'), url: '/p/trade', disabled: now(false), route: parentRoute.create({ fragment: 'feefwefwe' }) })({
    //   click: routeChangeTether()
    // }),
    $Link({ $content: $pageLink($gmxLogo, 'Trading'), url: '/p/leaderboard', route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      click: routeChangeTether()
    }),
    $Link({ $content: $pageLink($labLogo, 'Lab'), url: '/p/lab', route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      click: routeChangeTether()
    }),
  ]


  const $treasuryLinks = [
    $Link({ $content: $govItem('Treasury', $bagOfCoinsCircle, 'GBC Community-Led Portfolio'), url: '/p/treasury', route: parentRoute })({
      click: routeChangeTether()
    }),
    $anchor(style({ textDecoration: 'none' }), attr({ href: 'https://snapshot.org/#/gbc-nft.eth' }))(
      $govItem('Governance', $fileCheckCircle, 'Treasury Governance, 1 GBC = 1 Voting Power')
    ),
  ]

  const $circleButtonAnchor = $anchor(
    style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, display: 'flex', borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' })
  )

  const $extraMenuPopover = $Popover({
    dismiss: routeChangeMulticast,
    $target: $circleButtonAnchor(
      $icon({
        svgOps: O(
          clickPopoverClaimTether(nodeEvent('click')),
          style({
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
    ),
    $popContent: map((_) => {
      return $column(layoutSheet.spacingBig, style({ marginTop: screenUtils.isMobileScreen ? '-40px' : '' }))(
        ...screenUtils.isMobileScreen
          ? [
            ...$menuItemList,
            ...$treasuryLinks
          ]
          : [],

        // ...screenUtils.isMobileScreen ? $menuItemList : [],
        $row(layoutSheet.spacingBig, style({ flexWrap: 'wrap', width: '210px' }))(
          $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://docs.blueberry.club/' }))(
            $icon({ $content: $gitbook, width: '22px', viewBox: `0 0 32 32` })
          ),
          $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://discord.com/invite/7ZMmeU3z9j' }))(
            $icon({ $content: $discord, width: '22px', viewBox: `0 0 32 32` })
          ),
          $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://twitter.com/GBlueberryClub' }))(
            $icon({ $content: $twitter, width: '22px', viewBox: `0 0 24 24` })
          ),
          $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://www.instagram.com/blueberryclub.eth' }))(
            $icon({ $content: $instagram, width: '18px', viewBox: `0 0 32 32` })
          ),
          $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://github.com/nissoh/blueberry-club' }))(
            $icon({ $content: $github, width: '22px', viewBox: `0 0 32 32` })
          ),
        ),

        $ButtonSecondary({
          $content: $Picker([light, dark])({})
        })({

        }),


        switchLatest(map(w3p => {
          if (w3p === null) {
            return empty()
          }

          return $ButtonSecondary({
            $content: $text('Disconnect Wallet')
          })({
            click: walletChangeTether(
              map(async xx => {
                const wp = w3p.provider.provider

                // Check if connection is already established
                if (wp === walletConnect) {
                  // create new session
                  await walletConnect.disconnect()
                }
              }),
              awaitPromises,
              constant(IWalletName.none),
            )
          })
        }, walletLink.wallet)),

      )
    }, clickPopoverClaim),
  })({
    // overlayClick: clickPopoverClaimTether()
  })


  return [
    $row(layoutSheet.spacingBig, style({ alignItems: 'center', placeContent: 'center', flex: 1, width: '100%', padding: '30px 0', zIndex: 1000, borderRadius: '12px' }))(
      $row(layoutSheet.spacingBig, style({ flex: 1, alignItems: 'center' }))(
        $RouterAnchor({ url: '/', route: parentRoute, $anchor: $element('a')($icon({ $content: theme.name === 'dark' ? $logo : $logoFull, width: '55px', viewBox: '0 0 32 32' })) })({
          click: routeChangeTether()
        }),

        screenUtils.isDesktopScreen
          ? $Dropdown({
            $selection: $treasuryStatus,
            value: {
              value: now(null),
              $$option: map(option => option),
              list: $treasuryLinks,
            }
          })({})
          : empty(),
      ),

      $row(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ flex: 1, alignItems: 'center', placeContent: 'center' }))(
        ...screenUtils.isDesktopScreen ? $menuItemList : [],
        $WalletDisplay({
          chainList,
          walletLink,
          parentRoute
        })({
          walletChange: walletChangeTether(),
          routeChange: routeChangeTether(),
          changeNetwork: changeNetworkTether(),
        }),
      ),

      $row(layoutSheet.spacingBig, style({ flex: 1, placeContent: 'flex-end' }))(
        $extraMenuPopover,

        ...screenUtils.isDesktopScreen ? [
          $circleButtonAnchor(attr({ href: 'https://docs.blueberry.club/' }))(
            $icon({ $content: $gitbook, width: '22px', viewBox: `0 0 32 32` })
          ),
          $circleButtonAnchor(attr({ href: 'https://discord.com/invite/7ZMmeU3z9j' }))(
            $icon({ $content: $discord, width: '22px', viewBox: `0 0 32 32` })
          ),
          $circleButtonAnchor(attr({ href: 'https://twitter.com/GBlueberryClub' }))(
            $icon({ $content: $twitter, width: '22px', viewBox: `0 0 24 24` })
          ),
          // $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://www.instagram.com/blueberryclub.eth' }))(
          //   $icon({ $content: $instagram, width: '18px', viewBox: `0 0 32 32` })
          // ),
          // $anchor(layoutSheet.displayFlex, style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://github.com/nissoh/blueberry-club' }))(
          //   $icon({ $content: $github, width: '22px', viewBox: `0 0 32 32` })
          // ),
        ] : []
      )

    ),

    { routeChange: routeChangeMulticast, walletChange, changeNetwork }
  ]
})


