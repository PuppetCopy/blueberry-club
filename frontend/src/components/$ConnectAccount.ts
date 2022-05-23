import { Behavior, combineArray, Op } from "@aelea/core"
import { $element, $Node, $text, attr, component, NodeComposeFn, nodeEvent, style } from "@aelea/dom"
import { $column, $icon, $Popover, $row, layoutSheet, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, fromPromise, map, multicast, now, skipRepeats, snapshot, switchLatest } from "@most/core"
import { IEthereumProvider } from "eip1193-provider"
import { IWalletLink, attemptToSwitchNetwork } from "@gambitdao/wallet-link"
import { $walletConnectLogo } from "../common/$icons"
import * as wallet from "../logic/provider"
import { $ButtonPrimary, $ButtonSecondary } from "./form/$Button"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { WALLET } from "../logic/provider"
import { NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import { $caretDown } from "../elements/$icons"




export interface IConnectWalletPopover {
  $display: Op<string, $Node>
  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">

  $button: $Node
}
export interface IIntermediateDisplay {
  $display: Op<string, $Node>
  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">

  $container?: NodeComposeFn<$Node>
}

export const $IntermediateConnectButton = ({ $display, walletLink, walletStore, $container }: IIntermediateDisplay) => component((
  [switchNetwork, switchNetworkTether]: Behavior<Promise<any>, Promise<any>>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
) => {


  return [
    ($container || $row)(
      $IntermediateConnectPopover({
        $button: $ButtonPrimary({
          $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $text('Connect Wallet'),
            $icon({ $content: $caretDown, width: '13px', fill: pallete.background, svgOps: style({ marginTop: '2px' }) }),
          )
        })({}),
        $display,
        walletLink,
        walletStore
      })({
        switchNetwork: switchNetworkTether(),
        walletChange: walletChangeTether(),
      }),
    ),

    {
      walletChange: multicast(walletChange), switchNetwork
    }
  ]
})


export const $IntermediateConnectPopover = ({ $display, walletLink, walletStore, $button }: IConnectWalletPopover) => component((
  [clickOpenPopover, clickOpenPopoverTether]: Behavior<any, any>,
  [switchNetwork, switchNetworkTether]: Behavior<PointerEvent, Promise<any>>,
  [walletChange, walletChangeTether]: Behavior<PointerEvent, IEthereumProvider | null>,
) => {
  const noAccount = skipRepeats(walletLink.account)


  return [
    switchLatest(combineArray((metamask, walletProvider, account) => {

      // no wallet connected, show connection flow
      if (!account || walletProvider === null) {
        const $walletConnectBtn = $ButtonSecondary({
          $content: $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
            $row(style({ margin: '1px', backgroundColor: '#3B99FC', padding: '2px', borderRadius: '6px' }))(
              $icon({
                viewBox: '0 0 32 32',
                width: '18px',
                fill: 'white',
                $content: $walletConnectLogo,
              })
            ),
            $text('Wallet-Connect'),
          ), buttonOp: style({})
        })({
          click: walletChangeTether(
            map(async () => {
              await wallet.walletConnect.request({ method: 'eth_requestAccounts' })
              return wallet.walletConnect
            }),
            awaitPromises,
            src => walletStore.store(src, constant(WALLET.walletConnect)),
          )
        })

        const $connectButtonOptions = metamask
          ? $column(layoutSheet.spacing)(
            $ButtonSecondary({
              $content: $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                $element('img')(attr({ src: '/assets/metamask-fox.svg' }), style({ width: '24px' }))(),
                $text('Connect Metamask')
              ), buttonOp: style({})
            })({
              click: walletChangeTether(
                map(async () => {
                  const metamaskProivder = await wallet.metamaskQuery

                  if (metamaskProivder) {
                    await metamaskProivder.request({ method: 'eth_requestAccounts' })

                    return metamaskProivder
                  }

                  throw new Error('Could not find metmask')
                }),
                awaitPromises,
                src => walletStore.store(src, constant(WALLET.metamask)),
              ),
            }),
            $walletConnectBtn
          )
          : $walletConnectBtn

        return $Popover({
          $$popContent: constant($connectButtonOptions, clickOpenPopover)
        })(
          clickOpenPopoverTether(nodeEvent('click'))($button)
        )({})
    
      }

      return $column(
        switchLatest(map(empty, switchNetwork)), // side effect
        switchLatest(map((chain) => {
          if (chain !== USE_CHAIN) {
            return $ButtonPrimary({
              buttonOp: style({ alignSelf: 'flex-start' }),
              $content: $text(`Switch to ${NETWORK_METADATA[USE_CHAIN].chainName}`),
            })({
              click: switchNetworkTether(
                snapshot(async wallet => {
                  return wallet ? attemptToSwitchNetwork(wallet, USE_CHAIN).catch(error => {
                    alert(error.message)
                    console.error(error)
                    return error
                  }) : null
                }, walletLink.wallet),
              )
            })
          }
                
          return switchLatest($display(now(account)))
        }, walletLink.network))
      )
    }, fromPromise(wallet.metamaskQuery), walletLink.provider, noAccount)),

    {
      walletChange: multicast(walletChange), switchNetwork
    }
  ]
})


