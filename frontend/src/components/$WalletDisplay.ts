import { Behavior, combineArray } from "@aelea/core"
import { $element, $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { $column, $row, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, map, multicast, snapshot, switchLatest } from "@most/core"
import { attemptToSwitchNetwork, IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { $Link } from "@gambitdao/ui-components"
import { $seperator2 } from "../pages/common"
import { $disconnectedWalletDisplay, $accountPreview } from "./$AccountProfile"
import { $IntermediateConnectPopover } from "./$ConnectAccount"
import { Route } from "@aelea/router"
import { $Dropdown, $defaultSelectContainer } from "./form/$Dropdown"
import { CHAIN, NETWORK_METADATA } from "@gambitdao/gmx-middleware"



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
    $row(style({ border: `2px solid ${pallete.horizon}`, borderRadius: '30px', minHeight: '30px' }))(

      $IntermediateConnectPopover({
        $button: profileLinkClickTether()(style({ cursor: 'pointer' }, $disconnectedWalletDisplay())),
        walletLink: config.walletLink,
        chainList: config.chainList,
        forceNetworkChange: false,
        $$display: map(w3p => {

          return $Link({
            route: config.parentRoute.create({ fragment: 'df2f23f' }),
            $content: $accountPreview({ address: w3p.address, showAddress: screenUtils.isDesktopScreen }),
            anchorOp: style({ minWidth: 0, overflow: 'hidden' }),
            url: `/p/wallet`,
          })({ click: routeChangeTether() })
        })
      })({
        walletChange: walletChangeTether(),
        changeNetwork: changeNetworkTether()
      }),

      style({ backgroundColor: pallete.horizon, width: '2px', margin: '0px 0px 0px 10px' }, $seperator2),

      $Dropdown({
        value: {
          value: config.walletLink.network,
          $$option: map(chain => {
            if (chain === null) {
              return $text('?')
            }

            const network = NETWORK_METADATA[chain]

            return $row(
              changeNetworkTether(
                nodeEvent('click'),
                constant(chain)
                // snapshot(async (wallet) => {
                //   if (wallet) {
                //     const externalProvider = wallet.provider.provider
                //     await attemptToSwitchNetwork(externalProvider, chain).catch(error => {
                //       alert(error.message)
                //       console.error(error)
                //       return Promise.reject('unable to switch network')
                //     })
                //   }

                //   return chain
                // }, config.walletLink.wallet),
                // awaitPromises,
                // multicast
              ),
              style({ alignItems: 'center', width: '100%' })
            )(
              $element('img')(attr({ src: `/assets/chain/${chain}.svg` }), style({ width: '32px', padding: '3px 6px' }))(),
              $text(network.chainName)
            )
          }),
          $container: $defaultSelectContainer(style({ left: 'auto', right: 0, })),

          list: config.chainList,
        },
        $container: $column(style({ placeContent: 'center', position: 'relative' })),
        $selection: switchLatest(map(provider => {
          return $element('img')(attr({ src: `/assets/chain/${provider.network.chainId}.svg` }), style({ margin: '0 4px', width: '38px', cursor: 'pointer', padding: '3px 6px' }))()
        }, config.walletLink.provider)),
      })({}),
    ),

    {
      walletChange,
      routeChange,
      changeNetwork,
      profileLinkClick
    }
  ]
})


