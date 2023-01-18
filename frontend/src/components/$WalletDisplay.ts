import { Behavior } from "@aelea/core"
import { $element, attr, component, nodeEvent, style } from "@aelea/dom"
import { $row, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, switchLatest } from "@most/core"
import { CHAIN, IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { $Link } from "@gambitdao/ui-components"
import { $seperator2 } from "../pages/common"
import { $disconnectedWalletDisplay, $discoverIdentityDisplay } from "./$AccountProfile"
import { $ConnectDropdown, $switchNetworkDropdown } from "./$ConnectAccount"
import { Route } from "@aelea/router"



export interface IWalletDisplay {
  chainList: CHAIN[]
  walletLink: IWalletLink
  parentRoute: Route
}

export const $WalletDisplay = (config: IWalletDisplay) => component((
  [profileLinkClick, profileLinkClickTether]: Behavior<any, any>,
  [routeChange, routeChangeTether]: Behavior<string, string>,
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

        return $Link({
          route: config.parentRoute.create({ fragment: 'df2f23f' }),
          $content: $discoverIdentityDisplay({ address: w3p.address }),
          anchorOp: style({ minWidth: 0, overflow: 'hidden' }),
          url: `/p/wallet`,
        })({ click: routeChangeTether() })

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


