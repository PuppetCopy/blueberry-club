import { Behavior } from "@aelea/core"
import { $element, attr, component, nodeEvent, style } from "@aelea/dom"
import { $row, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, switchLatest } from "@most/core"
import { CHAIN, IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { $anchor, $Link } from "@gambitdao/ui-components"
import { $seperator2 } from "../pages/common"
import { $disconnectedWalletDisplay, $discoverIdentityDisplay } from "./$AccountProfile"
import { $ConnectDropdown, $switchNetworkDropdown } from "./$ConnectAccount"
import { Route } from "@aelea/router"
import { IProfileActiveTab } from "../pages/$Profile"



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
    $row(style({ border: `2px solid ${pallete.horizon}`, borderRadius: '30px', width: '146px', height: '42px' }))(

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
          $discoverIdentityDisplay({ address: w3p.address })
        )

      }, config.walletLink.wallet)),


      style({ backgroundColor: pallete.horizon, width: '2px', margin: '0px 0px 0px 10px' }, $seperator2),

      $switchNetworkDropdown(
        config.walletLink,
        config.chainList,
        switchLatest(map(chainId => {
          return $element('img')(attr({ src: `/assets/chain/${chainId}.svg` }), style({ margin: '0 4px', width: '38px', cursor: 'pointer', padding: '3px 6px' }))()
        }, config.walletLink.network))
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


