import { Behavior, combineArray, Op } from "@aelea/core"
import { $element, $Node, $text, attr, component, NodeComposeFn, nodeEvent, style } from "@aelea/dom"
import { $column, $icon, $Popover, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, fromPromise, map, multicast, now, skipRepeats, snapshot, switchLatest } from "@most/core"
import { IEthereumProvider } from "eip1193-provider"
import { IWalletLink, attemptToSwitchNetwork } from "@gambitdao/wallet-link"
import { $walletConnectLogo } from "../common/$icons"
import * as wallet from "../logic/provider"
import { $ButtonPrimary, $ButtonSecondary } from "./form/$Button"
import { WALLET } from "../logic/provider"
import { CHAIN, NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import { $caretDown } from "../elements/$icons"
import { BrowserStore } from "../logic/store"
import { $Dropdown, $defaultSelectContainer } from "./form/$Dropdown"




export interface IConnectWalletPopover {
  chainList: CHAIN[]
  $$display: Op<string, $Node>
  walletLink: IWalletLink
  walletStore: BrowserStore<"ROOT.v1.walletStore", WALLET | null>
  $button: $Node

  ensureNetwork?: boolean
}

export interface IIntermediateDisplay {
  chainList: CHAIN[]
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
  $connectLabel = $text('Connect Wallet'),
  chainList
}: IIntermediateDisplay) => component((
  [switchNetwork, switchNetworkTether]: Behavior<Promise<any>, Promise<any>>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
) => {


  return [
    ($container || $row)(
      $IntermediateConnectPopover({
        chainList,
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


export const $IntermediateConnectPopover = (config: IConnectWalletPopover) => component((
  [clickOpenPopover, clickOpenPopoverTether]: Behavior<any, any>,
  [switchNetwork, switchNetworkTether]: Behavior<any, Promise<any>>,
  [walletChange, walletChangeTether]: Behavior<PointerEvent, IEthereumProvider | null>,
) => {
  const noAccount = skipRepeats(config.walletLink.account)


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
            src => config.walletStore.store(src, map(value => {

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
                  return config.walletStore.store(src, map(value => {
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
          clickOpenPopoverTether(nodeEvent('click'))(config.$button)
        )({})

      }

      return config.ensureNetwork ? $column(
        switchLatest(map(empty, switchNetwork)), // side effect
        switchLatest(map((chain) => {

          const isCompatibleChain = config.chainList.some(c => c === chain)

          if (isCompatibleChain) {
            return switchLatest(config.$$display(now(account)))
          }

          const fstChain = config.chainList[0]

          if (config.chainList.length > 1) {
            return $Dropdown({
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
                      snapshot(async (w3p) => {
                        w3p ? await attemptToSwitchNetwork(w3p, option).catch(error => {
                          alert(error.message)
                          console.error(error)
                          return error
                        }) : null


                        return option
                      }, config.walletLink.walletChange),
                      multicast
                    ),
                    style({ alignItems: 'center', width: '100%' })
                  )(
                    $element('img')(attr({ src: `/assets/chain/${option}.svg` }), style({ width: '32px', padding: '3px 6px' }))(),
                    $text(chainName)
                  )
                }),
                $container: $defaultSelectContainer(style({ left: 'auto', right: 0, })),
                list: config.chainList,
              },
              $container: $column(style({ placeContent: 'center', position: 'relative' })),
              $selection: $ButtonPrimary({
                $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                  $text('Choose Network'),
                  $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '16px', fill: pallete.background, svgOps: style({ marginTop: '2px' }) }),
                )
              })({}),
            })({})
            
          }

          return $ButtonPrimary({
            buttonOp: style({ alignSelf: 'flex-start' }),
            $content: $row(layoutSheet.spacingSmall)(
              $text(`Switch to ${NETWORK_METADATA[fstChain].chainName}`),
              $element('img')(attr({ src: `/assets/chain/${fstChain}.svg` }), style({ width: '20px' }))(),
            ),
          })({
            click: switchNetworkTether(
              snapshot(async wallet => {
                return wallet ? attemptToSwitchNetwork(wallet, fstChain).catch(error => {
                  alert(error.message)
                  console.error(error)
                  return error
                }) : null
              }, config.walletLink.walletChange),
              multicast
            )
          })
        }, config.walletLink.network))
      ) : switchLatest(config.$$display(now(account)))
    }, fromPromise(wallet.metamaskQuery), config.walletLink.provider, noAccount)),

    {
      walletChange, switchNetwork
    }
  ]
})


