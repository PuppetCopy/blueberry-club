import { Behavior } from "@aelea/core"
import { $element, $text, attr, component, INode, nodeEvent, style } from "@aelea/dom"
import { $column, $row, screenUtils, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, snapshot, switchLatest } from "@most/core"
import { IEthereumProvider } from "eip1193-provider"
import { attemptToSwitchNetwork, IWalletLink } from "@gambitdao/wallet-link"
import { WALLET } from "../logic/provider"
import { $Link } from "@gambitdao/ui-components"
import { $seperator2 } from "../pages/common"
import { $DisconnectedWalletDisplay, $accountPreview } from "./$AccountProfile"
import { $IntermediateConnectPopover } from "./$ConnectAccount"
import { Route } from "@aelea/router"
import { $Dropdown, $defaultSelectContainer } from "./form/$Dropdown"
import { CHAIN, NETWORK_METADATA } from "../../../@gambitdao-gmx-middleware/src"
import { BrowserStore } from "../logic/store"



export interface IWalletDisplay {
  // $display: Op<string, $Node>
  walletLink: IWalletLink
  store: BrowserStore<"ROOT.v1.walletStore", WALLET | null>
  parentRoute: Route
}

export const $WalletProfile = (config: IWalletDisplay) => component((
  [profileLinkClick, profileLinkClickTether]: Behavior<any, any>,
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
  [changeChain, changeChainTethr]: Behavior<CHAIN.ARBITRUM | CHAIN.AVALANCHE>,
  [switchNetwork, switchNetworkTether]: Behavior<INode, CHAIN>,
) => {



  return [
    $row(style({ border: `2px solid ${pallete.horizon}`, borderRadius: '30px', minHeight: '30px' }))(

      $IntermediateConnectPopover({
        $button: profileLinkClickTether()(style({ cursor: 'pointer' }, $DisconnectedWalletDisplay())),
        walletLink: config.walletLink,
        walletStore: config.store,
        $display: map(address => {
          return $Link({
            route: config.parentRoute.create({ fragment: 'df2f23f' }),
            $content: $accountPreview({ address, showAddress: screenUtils.isDesktopScreen }),
            anchorOp: style({ minWidth: 0, overflow: 'hidden' }),
            url: `/p/wallet`,
          })({ click: routeChangeTether() })
        })
      })({
        walletChange: walletChangeTether()
      }),


      style({ backgroundColor: pallete.horizon, width: '2px', margin: '0px 0px 0px 10px' }, $seperator2),

      $Dropdown({
        value: {
          value: config.walletLink.network,
          $$option: map(option => {
            if (option === null) {
              return $text('?')
            }

            const chainName = NETWORK_METADATA[option].chainName

            return $row(
              switchNetworkTether(
                nodeEvent('click'),
                snapshot((w3p) => {
                  w3p ? attemptToSwitchNetwork(w3p, option).catch(error => {
                    alert(error.message)
                    console.error(error)
                    return error
                  }) : null


                  return option
                }, config.walletLink.walletChange)
              ),
              style({ alignItems: 'center', width: '100%' })
            )(
              $element('img')(attr({ src: `/assets/chain/${option}.svg` }), style({ width: '32px', padding: '3px 6px' }))(),
              $text(chainName)
            )
          }),
          $container: $defaultSelectContainer(style({ left: 'auto', right: 0, })),

          list: [
            // null,
            CHAIN.ARBITRUM,
            CHAIN.AVALANCHE,
          ] as CHAIN[],
        },
        $container: $column(style({ placeContent: 'center', position: 'relative' })),
        $selection: switchLatest(map(label => {
          return $element('img')(attr({ src: `/assets/chain/${label}.svg` }), style({ margin: '0 4px', width: '38px', cursor: 'pointer', padding: '3px 6px' }))()
        }, config.walletLink.network)),
      })({ select: changeChainTethr() }),
      switchLatest(map(empty, switchNetwork)), // side effect

    ),

    {
      walletChange,
      routeChange,
      switchNetwork,
      profileLinkClick
    }
  ]
})


