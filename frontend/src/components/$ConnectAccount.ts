import { Behavior, combineArray, Op } from "@aelea/core"
import { $element, $Node, $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, fromPromise, map, mergeArray, now, snapshot, switchLatest, take, tap } from "@most/core"
import { attemptToSwitchNetwork, IWalletLink, IWalletName, IWalletState, metamaskQuery, walletConnect } from "@gambitdao/wallet-link"
import { $walletConnectLogo } from "../common/$icons"
import { $ButtonPrimary, $ButtonSecondary } from "./form/$Button"
import { CHAIN, NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import { $caretDown } from "../elements/$icons"
import { $Dropdown, $defaultSelectContainer } from "./form/$Dropdown"
import { $Popover } from "./$Popover"




export interface IConnectWalletPopover {
  chainList: CHAIN[]
  walletLink: IWalletLink

  $$display: Op<IWalletState, $Node>
  $button: $Node

  forceNetworkChange?: boolean
}

export interface IIntermediateDisplay {
  chainList: CHAIN[]
  $$display: Op<IWalletState, $Node>
  walletLink: IWalletLink

  forceNetworkChange?: boolean
}

export const $IntermediateConnectButton = ({
  $$display,
  walletLink,
  forceNetworkChange = true,
  chainList
}: IIntermediateDisplay) => $IntermediateConnectPopover({
  chainList,
  forceNetworkChange,
  $button: $ButtonPrimary({
    $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      $text('Connect Wallet'),
      $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '16px', fill: pallete.background, svgOps: style({ marginTop: '2px' }) }),
    )
  })({}),
  $$display,
  walletLink
})


export const $IntermediateConnectPopover = (config: IConnectWalletPopover) => component((
  [clickOpenPopover, clickOpenPopoverTether]: Behavior<any, any>,
  [changeNetwork, changeNetworkTether]: Behavior<any, CHAIN>,
  [walletChange, walletChangeTether]: Behavior<PointerEvent, IWalletName>,
) => {


  return [
    switchLatest(combineArray((metamask, w3p) => {

      // no wallet connected, show connection flow
      if (w3p === null) {
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
          )
        })({
          click: walletChangeTether(
            map(() => walletConnect.request({ method: 'eth_requestAccounts' })),
            awaitPromises,
            constant(IWalletName.walletConnect),
          )
        })

        const $connectButtonOptions = metamask
          ? $column(layoutSheet.spacing)(
            $ButtonSecondary({
              $content: $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                $element('img')(attr({ src: '/assets/metamask-fox.svg' }), style({ width: '24px' }))(),
                $text('Connect Metamask')
              )
            })({
              click: walletChangeTether(
                map(() => metamask.request({ method: 'eth_requestAccounts' })),
                awaitPromises,
                constant(IWalletName.metamask)
              ),
            }),
            $walletConnectBtn
          )
          : $walletConnectBtn

        return $Popover({
          $popContent: constant($connectButtonOptions, clickOpenPopover)
        })(
          clickOpenPopoverTether(nodeEvent('click'))(config.$button)
        )({})

      }


      const isCompatibleChain = config.chainList.some(c => c === w3p.chain)

      if (!config.forceNetworkChange || isCompatibleChain) {
        return switchLatest(config.$$display(now(w3p)))
      }

      const fstChain = config.chainList[0]

      if (config.chainList.length > 1) {
        return $Dropdown({
          value: {
            value: now(w3p.chain),
            $$option: map(option => {
              if (option === null) {
                return $text('?')
              }

              const chainName = NETWORK_METADATA[option].chainName

              return $row(
                changeNetworkTether(
                  nodeEvent('click'),
                  constant(option)
                  // snapshot(async (wallet) => {
                  //   if (wallet) {
                  //     const externalProvider = wallet.provider.provider
                  //     await attemptToSwitchNetwork(externalProvider, option).catch(error => {
                  //       alert(error.message)
                  //       console.error(error)
                  //       return Promise.reject('unable to switch network')
                  //     })
                  //   }

                  //   return option
                  // }, config.walletLink.wallet),
                  // awaitPromises
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
        $content: $row(layoutSheet.spacingSmall)(
          $text(`Switch to ${NETWORK_METADATA[fstChain].chainName}`),
          $element('img')(attr({ src: `/assets/chain/${fstChain}.svg` }), style({ width: '20px' }))(),
        ),
      })({
        click: changeNetworkTether(
          constant(fstChain)
          // snapshot(async (wallet) => {
          //   if (wallet) {
          //     const externalProvider = wallet.provider.provider
          //     await attemptToSwitchNetwork(externalProvider, fstChain).catch(error => {
          //       alert(error.message)
          //       console.error(error)
          //       return Promise.reject('unable to switch network')
          //     })
          //   }

          //   return fstChain
          // }, config.walletLink.wallet),
          // awaitPromises
        )
      })

    }, fromPromise(metamaskQuery), config.walletLink.wallet)),

    {
      walletChange, changeNetwork
    }
  ]
})


