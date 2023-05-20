import { Behavior } from "@aelea/core"
import { $node, component, nodeEvent, style } from "@aelea/dom"
import { $row } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, map, mergeArray, now, snapshot, switchLatest } from "@most/core"
import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { $anchor } from "@gambitdao/ui-components"
import { $seperator2 } from "../pages/common"
import { $disconnectedWalletDisplay, $discoverIdentityDisplay } from "./$AccountProfile"
import { Route } from "@aelea/router"
import { IProfileActiveTab } from "../pages/$Profile"
import { $defaultBerry } from "./$DisplayBerry"
import { CHAIN } from "@gambitdao/const"
import { account, web3Modal } from "../wallet/walletLink"
import { $SwitchNetworkDropdown } from "./$ConnectAccount"


export interface IWalletDisplay {
  chainList: CHAIN[]
  parentRoute: Route
}

export const $WalletDisplay = (config: IWalletDisplay) => component((
  [profileLinkClick, profileLinkClickTether]: Behavior<any, any>,
  [routeChange, routeChangeTether]: Behavior<any, string>,
  [walletChange, walletChangeTether]: Behavior<any, string>,
) => {



  return [
    $row(style({ backgroundColor: `${pallete.background}`, borderRadius: '30px', width: '146px', height: '42px', alignItems: 'center' }))(

      switchLatest(snapshot((_, accountResult) => {
        if (!accountResult.address) {
          return walletChangeTether(
            nodeEvent('click'),
            map(async () => {
              await web3Modal.openModal()
              return IWalletName.walletConnect
            }),
            awaitPromises
          )(
            style({ cursor: 'pointer' }, $disconnectedWalletDisplay())
          )
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
          $discoverIdentityDisplay({ address: accountResult.address, $container: $defaultBerry(style({ minWidth: '38px' })) })
        )

      }, mergeArray([now(null), walletChange]), account)),

      $node(style({ flex: 1 }))(),

      style({ backgroundColor: pallete.horizon, width: '2px' }, $seperator2),

      style({ alignSelf: 'stretch', borderRadius: '0 100px 100px 0' })(
        $SwitchNetworkDropdown()({})
      )

    ),

    {
      routeChange,
      profileLinkClick
    }
  ]
})


