import { Behavior, O } from "@aelea/core"
import { $Branch, $Node, $element, $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { $RouterAnchor, Route } from '@aelea/router'
import { $column, $icon, $row, layoutSheet, screenUtils } from '@aelea/ui-components'
import { pallete } from "@aelea/ui-components-theme"
import { CHAIN } from "@gambitdao/const"
import { $Link, $anchor, $discord, $gitbook, $github, $instagram, $moreDots, $twitter } from "@gambitdao/ui-components"
import { IWalletName } from "@gambitdao/wallet-link"
import { awaitPromises, constant, empty, map, multicast, switchLatest } from '@most/core'
import { Stream } from "@most/types"
import { $bagOfCoinsCircle, $fileCheckCircle, $gmxLogo, $puppetLogo } from "../common/$icons"
import { dark, light } from "../common/theme"
import { $Picker } from "../components/$ThemePicker"
import { $stackedCoins } from "../elements/$icons"
import { $Popover } from "./$Popover"
import { $WalletDisplay } from "./$WalletDisplay"
import { $ButtonSecondary } from "./form/$Button"
import { disconnect } from "@wagmi/core"
import { walletLink } from "../wallet"


interface MainMenu {
  chainList: CHAIN[]
  parentRoute: Route
  showAccount?: boolean
}

export const $MainMenu = ({ parentRoute, chainList, showAccount = true }: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,
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



  const $menuItemList = [
    $Link({ $content: $pageLink($gmxLogo, 'Trade'), url: '/p/trade', route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      // $Link({ $content: $pageLink($gmxLogo, 'Trade'), url: '/p/trade', disabled: now(false), route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      click: routeChangeTether()
    }),
    $Link({ $content: $pageLink($stackedCoins, 'Leaderboard'), url: '/p/leaderboard', route: parentRoute.create({ fragment: 'feefwefwe' }) })({
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


        switchLatest(map(wallet => {
          if (wallet === null) {
            return empty()
          }

          return $ButtonSecondary({
            $content: $text('Disconnect Wallet')
          })({
            click: walletChangeTether(
              map(async xx => {
                const walletName = wallet.name

                // Check if connection is already established
                if (walletName === IWalletName.walletConnect) {
                  await disconnect()
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

    $row(layoutSheet.spacingBig, style({ padding: '14px', height: '100px', alignItems: 'center', placeContent: 'space-between' }))(
      $row(layoutSheet.spacingBig, style({ alignItems: 'center', flex: 1 }))(
        $RouterAnchor({ url: '/', route: parentRoute, $anchor: $element('a')($icon({ $content: $puppetLogo, width: '45px', viewBox: '0 0 32 32' })) })({
          click: routeChangeTether()
        }),
        // $extraMenuPopover,
      ),

      $row(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ flex: 1, alignItems: 'center', placeContent: 'center' }))(
        $WalletDisplay({
          chainList,
          parentRoute
        })({
          routeChange: routeChangeTether(),
        }),

        ...screenUtils.isDesktopScreen ? $menuItemList : [],
      ),

      $row(layoutSheet.spacingBig, style({ placeContent: 'flex-end', flex: 1 }))(
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

    { routeChange: routeChangeMulticast }
  ]
})


