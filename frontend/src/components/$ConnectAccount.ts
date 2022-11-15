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
import { LAB_CHAIN } from "@gambitdao/gbc-middleware"
import { WALLET } from "../logic/provider"
import { NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import { $caretDown } from "../elements/$icons"
import { BrowserStore } from "../logic/store"




export interface IConnectWalletPopover {
  $$display: Op<string, $Node>
  walletLink: IWalletLink
  walletStore: BrowserStore<"ROOT.v1.walletStore", WALLET | null>
  $button: $Node

  ensureNetwork?: boolean
}

export interface IIntermediateDisplay {
  $$display: Op<string, $Node>
  walletLink: IWalletLink
  walletStore: BrowserStore<"ROOT.v1.walletStore", WALLET | null>

  ensureNetwork?: boolean

  $connectLabel?: $Node

  $container?: NodeComposeFn<$Node>
}

export const $IntermediateConnectButton = ({
  $$display,
  walletLink,
  walletStore,
  $container,
  ensureNetwork = true,
  $connectLabel = $text('Connect Wallet')
}: IIntermediateDisplay) => component((
  [switchNetwork, switchNetworkTether]: Behavior<Promise<any>, Promise<any>>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
) => {


  return [
    ($container || $row)(
      $IntermediateConnectPopover({
        ensureNetwork,
        $button: $ButtonPrimary({
          $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $connectLabel,
            $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '16px', fill: pallete.background, svgOps: style({ marginTop: '2px' }) }),
          )
        })({}),
        $$display,
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


export const $IntermediateConnectPopover = ({ $$display: $display, walletLink, walletStore, $button, ensureNetwork = false }: IConnectWalletPopover) => component((
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
            src => walletStore.store(src, map(value => {

              return {
                store: WALLET.walletConnect,
                value: value
              }
            })),
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
                src => {
                  return walletStore.store(src, map(value => {
                    return {
                      store: WALLET.metamask,
                      value: value
                    }
                  }))
                },
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

      return ensureNetwork ? $column(
        switchLatest(map(empty, switchNetwork)), // side effect
        switchLatest(map((chain) => {
          if (chain !== LAB_CHAIN) {
            return $ButtonPrimary({
              buttonOp: style({ alignSelf: 'flex-start' }),
              $content: $text(`Switch to ${NETWORK_METADATA[LAB_CHAIN].chainName}`),
            })({
              click: switchNetworkTether(
                snapshot(async wallet => {
                  return wallet ? attemptToSwitchNetwork(wallet, LAB_CHAIN).catch(error => {
                    alert(error.message)
                    console.error(error)
                    return error
                  }) : null
                }, walletLink.walletChange),
                multicast
              )
            })
          }

          return switchLatest($display(now(account)))
        }, walletLink.network))
      ) : switchLatest($display(now(account)))
    }, fromPromise(wallet.metamaskQuery), walletLink.provider, noAccount)),

    {
      walletChange, switchNetwork
    }
  ]
})


