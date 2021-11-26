import { Behavior, combineArray, O } from "@aelea/core"
import { $element, $Node, $text, attr, component, style, styleInline } from "@aelea/dom"
import { $column, $icon, $Popover, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, fromPromise, map, multicast, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { CHAIN, IWalletLink } from "@gambitdao/wallet-link"
import { $walletConnectLogo } from "../common/$icons"
import * as wallet from "../common/wallets"
import { $ButtonPrimary } from "./form/$Button"
import { $caretDown } from "../elements/$icons"



export interface IIntermediateDisplay {
  $display: $Node
  walletLink: Stream<IWalletLink | null>
}

export const $IntermediateDisplay = (config: IIntermediateDisplay) => component((
  [connectPopover, connectPopoverTether]: Behavior<any, any>,
  [switchNetwork, switchNetworkTether]: Behavior<PointerEvent, IEthereumProvider>,
  [walletChange, walletChangeTether]: Behavior<PointerEvent, IEthereumProvider | null>,
) => {

  const accountChange = switchLatest(map(wallet => wallet ? wallet.account : now(null), config.walletLink))

  return [
    $column(
      switchLatest(
        awaitPromises(combineArray(async (account, walletLink, metamask, walletConnect) => {

          // no wallet connected, show connection flow
          if (!account || walletLink === null) {
            
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
                map(async () => walletConnect.enable()),
                awaitPromises,
                constant(walletConnect)
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
                    map(async () => metamask.enable()),
                    awaitPromises,
                    constant(metamask),
                  ),
                }),
                $walletConnectBtn
              )
              :$walletConnectBtn

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

          return switchLatest(
            combineArray((chain) => {

              if (
                // chain !== CHAIN.ARBITRUM
                chain !== 3 as any
              ) {
                return $ButtonPrimary({
                  $content: $text('Switch to Ropsten Network'),
                  // $content: $text('Switch to Arbitrum Network'),
                  // buttonOp: O(
                    
                    
                  // )
                })({
                  click: switchNetworkTether(
                    map(() => wallet.attemptToSwitchNetwork(walletLink.wallet, CHAIN.ARBITRUM)),
                    awaitPromises,
                    constant(walletLink.wallet)
                  )
                })
              }
                
              return config.$display
            }, multicast(walletLink.network))
          )
        }, accountChange, config.walletLink, wallet.metamask, wallet.walletConnect))
      ),
      
      switchLatest(map(empty, switchNetwork))
    ),

    {
      walletChange: multicast(walletChange)
    }
  ]
})



