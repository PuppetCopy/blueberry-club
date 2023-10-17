import { Behavior, O } from "@aelea/core"
import { $Branch, $element, $Node, $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { $RouterAnchor, Route } from '@aelea/router'
import { $column, $icon, $row, layoutSheet, screenUtils } from '@aelea/ui-components'
import { pallete, theme } from "@aelea/ui-components-theme"
import { formatReadableUSD } from "@gambitdao/gmx-middleware"
import { IWalletLink, IWalletName, walletConnect } from "@gambitdao/wallet-link"
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
import { CHAIN } from "@gambitdao/const"
import { $circleButtonAnchor } from "../elements/$common"




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
    $Link({ $content: $pageLink($gmxLogo, 'Trade'), url: '/p/trade', route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      // $Link({ $content: $pageLink($gmxLogo, 'Trade'), url: '/p/trade', disabled: now(false), route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      click: routeChangeTether()
    }),
    $Link({ $content: $pageLink($stackedCoins, 'Leaderboard'), url: '/p/leaderboard', route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      click: routeChangeTether()
    }),
    $Link({ $content: $pageLink($labLogo, 'Lab'), url: '/p/lab', route: parentRoute.create({ fragment: 'feefwefwe' }) })({
      click: routeChangeTether()
    }),
  ]

  return [
    $row(layoutSheet.spacingBig, style({ alignItems: 'center', placeContent: 'center', flex: 1, width: '100%', padding: '30px 0', zIndex: 1000, borderRadius: '12px' }))(
      $row(layoutSheet.spacingBig, style({ flex: 1, alignItems: 'center' }))(
        $anchor(attr({ href: 'https://www.findgbc.com' }))(
          $icon({ $content: theme.name === 'dark' ? $logo : $logoFull, width: '55px', viewBox: '0 0 32 32' })
        ),
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
        ...screenUtils.isDesktopScreen ? [
          $ButtonSecondary({
            $content: $Picker([light, dark])({})
          })({})
        ] : []
      )
    ),

    { routeChange: routeChangeMulticast, walletChange, changeNetwork }
  ]
})


