import { Behavior, combineArray } from "@aelea/core"
import { $element, $Node, $text, attr, component, style } from "@aelea/dom"
import { $column, $icon, $Popover, $row, layoutSheet, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, fromPromise, map, multicast, skipRepeats, snapshot, switchLatest, tap } from "@most/core"
import { IEthereumProvider } from "eip1193-provider"
import { CHAIN, IWalletLink, attemptToSwitchNetwork } from "@gambitdao/wallet-link"
import { $walletConnectLogo } from "../common/$icons"
import * as wallet from "../common/wallets"
import { $ButtonPrimary } from "./form/$Button"
import { $caretDown } from "../elements/$icons"



export interface IIntermediateDisplay {
  $display: $Node
  walletLink: IWalletLink
  walletStore: state.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}

export const $IntermediateConnect = (config: IIntermediateDisplay) => component((
  [connectPopover, connectPopoverTether]: Behavior<any, any>,
  [switchNetwork, switchNetworkTether]: Behavior<PointerEvent, any>,
  [walletChange, walletChangeTether]: Behavior<PointerEvent, IEthereumProvider | null>,
) => {

  const noAccount = skipRepeats(map(x => x === null || x === undefined, tap(console.log, config.walletLink.account)))

  return [
    $row(
      switchLatest(
        combineArray((metamask, walletProvider, noAccount) => {

          // no wallet connected, show connection flow
          if (noAccount || walletProvider === null) {
            
            const $walletConnectBtn = $ButtonPrimary({
              $content: $row(layoutSheet.spacing)(
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
                  await wallet.walletConnect.enable()

                  return wallet.walletConnect
                }),
                awaitPromises,
                src => config.walletStore.store(src, constant('walletConnect')),
              )
            })

            const $connectButtonOptions = metamask
              ? $column(layoutSheet.spacing)(
                $ButtonPrimary({
                  $content: $row(layoutSheet.spacing)(
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
                    src => config.walletStore.store(src, constant('metamask')),
                  ),
                }),
                $walletConnectBtn
              )
              : $walletConnectBtn

            return $Popover({
              $$popContent: constant($connectButtonOptions, connectPopover)
            })(
              $ButtonPrimary({
                $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                  $text('Connect Wallet'),
                  $icon({ $content: $caretDown, width: '13px', fill: pallete.background, svgOps: style({ marginTop: '2px' }), viewBox: '0 0 7.84 3.81' }),
                ), buttonOp: style({})
              })({
                click: connectPopoverTether(),
              })
            )({})
    
          }

          return $column(
            switchLatest(
              map((chain) => {

                if (
                // chain !== CHAIN.ARBITRUM
                  chain !== CHAIN.ETH_ROPSTEN
                ) {
                  return $ButtonPrimary({
                    $content: $text('Switch to Ropsten TestNet'),
                  // $content: $text('Switch to Arbitrum Network'),
                  })({
                    click: switchNetworkTether(
                      snapshot(wallet => wallet ? attemptToSwitchNetwork(wallet, CHAIN.ETH_ROPSTEN) : null, config.walletLink.wallet),
                    )
                  })
                }
                
                return config.$display
              }, config.walletLink.network)
            )
          )
        }, fromPromise(wallet.metamaskQuery), config.walletLink.provider, noAccount)
      ),
      
      switchLatest(map(empty, switchNetwork))
    ),

    {
      walletChange: multicast(walletChange)
    }
  ]
})



