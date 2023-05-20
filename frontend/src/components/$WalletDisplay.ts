import { Behavior } from "@aelea/core"
import { $element, $node, $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, switchLatest } from "@most/core"
import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { $alert, $anchor } from "@gambitdao/ui-components"
import { $seperator2 } from "../pages/common"
import { $disconnectedWalletDisplay, $discoverIdentityDisplay } from "./$AccountProfile"
import { $ConnectDropdown, $switchNetworkDropdown } from "./$ConnectAccount"
import { Route } from "@aelea/router"
import { IProfileActiveTab } from "../pages/$Profile"
import { $defaultBerry } from "./$DisplayBerry"
import { CHAIN } from "@gambitdao/const"
import { $alertTooltip } from "../pages/competition/$rules"



export interface IWalletDisplay {
  chainList: CHAIN[]
  walletLink: IWalletLink
  parentRoute: Route
}

export const $WalletDisplay = (config: IWalletDisplay) => component((
  [profileLinkClick, profileLinkClickTether]: Behavior<any, any>,
  [routeChange, routeChangeTether]: Behavior<any, string>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,
  [changeNetwork, changeNetworkTether]: Behavior<any, CHAIN>,
) => {


  return [
    $row(style({ border: `2px solid ${pallete.horizon}`, borderRadius: '30px', width: '146px', height: '42px', alignItems: 'center' }))(

      switchLatest(map(w3p => {
        if (w3p === null) {
          return $ConnectDropdown(
            profileLinkClickTether(nodeEvent('click'))(style({ cursor: 'pointer' }, $disconnectedWalletDisplay())),
            profileLinkClick
          )({
            walletChange: walletChangeTether()
          })
        }

        return $anchor(
          routeChangeTether(
            nodeEvent('click'),
            map(path => {
              const lastFragment = location.pathname.split('/').slice(-1)[0]
              const newPath = `/p/wallet/${lastFragment === 'trade' ? IProfileActiveTab.TRADING.toLowerCase() : IProfileActiveTab.BERRIES.toLowerCase()}`

              if (location.pathname !== newPath) {
                history.pushState(null, '', newPath)
              }

              return newPath
            })
          )
        )(
          $discoverIdentityDisplay({ address: w3p.account.address, $container: $defaultBerry(style({ minWidth: '38px' })) })
        )

      }, config.walletLink.wallet)),

      $node(style({ flex: 1 }))(),

      style({ backgroundColor: pallete.horizon, width: '2px' }, $seperator2),

      $switchNetworkDropdown(
        config.walletLink,
        config.chainList,
        switchLatest(map(wallet => {

          if (!wallet.chain) {
            return style({ cursor: 'pointer' })(
              $alert(empty())
            )
          }

          return $row(style({ padding: '0 8px', cursor: 'pointer' }))(
            $element('img')(attr({ src: `/assets/chain/${wallet.chain.id}.svg` }), style({ width: '26px' }))()
          )

          // return style({ zoom: 1.1 })($alertTooltip($text('www')))

        }, config.walletLink.wallet))
      )({
        changeNetwork: changeNetworkTether()
      })

    ),

    {
      walletChange,
      routeChange,
      changeNetwork,
      profileLinkClick
    }
  ]
})


