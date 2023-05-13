import { Behavior, Op } from "@aelea/core"
import { $Node, $element, $node, $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { CHAIN, NETWORK_METADATA } from "@gambitdao/const"
import { filterNull } from "@gambitdao/gmx-middleware"
import { IWalletLink, IWalletName, IWalletclient, metamaskQuery, parseError, walletConnect } from "@gambitdao/wallet-link"
import { awaitPromises, constant, empty, fromPromise, map, now, snapshot, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { EIP1193Provider, WalletClient } from "viem"
import { $bagOfCoinsCircle, $walletConnectLogo } from "../common/$icons"
import { $caretDown } from "../elements/$icons"
import { $Popover } from "./$Popover"
import { $ButtonPrimary, $ButtonSecondary } from "./form/$Button"
import { IButtonCore } from "./form/$ButtonCore"
import { $Dropdown } from "./form/$Dropdown"


// https://eips.ethereum.org/EIPS/eip-3085
export async function attemptToSwitchNetwork(metamask: EIP1193Provider, chain: CHAIN) {
  if (!('request' in metamask)) {
    return console.error('External Provider does not contain request() method')
  }

  try {
    // check if the chain to connect to is installed
    await metamask.request!({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + chain.toString(16) }], // chainId must be in hexadecimal numbers
    })
  } catch (error: any) {
    if (!NETWORK_METADATA[chain]) {
      throw new Error(`Could not add metamask network, chainId ${chain} is not supported`)
    }
    // This error code indicates that the chain has not been added to MetaMask
    // if it is not, then install it into the user MetaMask
    if (error.code === 4902) {
      try {
        await metamask.request!({
          method: 'wallet_addEthereumChain',
          params: [
            NETWORK_METADATA[chain]
          ],
        })
      } catch (addError: any) {
        throw parseError(addError)
      }
    }

    throw parseError(error)
  }
}


export const $WalletLogoMap = {
  [IWalletName.metamask]: $element('img')(attr({ src: '/assets/metamask-fox.svg' }), style({ width: '24px' }))(),
  [IWalletName.walletConnect]: $row(style({ margin: '1px', backgroundColor: '#3B99FC', padding: '2px', borderRadius: '6px' }))(
    $icon({ viewBox: '0 0 32 32', width: '18px', fill: 'white', $content: $walletConnectLogo })
  ),
  [IWalletName.none]: $icon({ viewBox: '0 0 32 32', width: '18px', fill: 'white', $content: $bagOfCoinsCircle, }),
}


export interface IConnectWalletPopover {
  chainList: CHAIN[]
  walletLink: IWalletLink

  $$display: Op<IWalletclient, $Node>
  primaryButtonConfig?: Partial<IButtonCore>
}




export const $IntermediateConnectButton = (config: IConnectWalletPopover) => component((
  [clickOpenPopover, clickOpenPopoverTether]: Behavior<any, any>,
  [changeNetwork, changeNetworkTether]: Behavior<any, CHAIN>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,
) => {


  return [
    switchLatest(map((w3p) => {

      // no wallet connected, show connection flow
      if (w3p === null) {
        return $ConnectDropdown(
          $ButtonPrimary({
            $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $text('Connect Wallet'),
              $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '16px', fill: pallete.background, svgOps: style({ marginTop: '2px' }) }),
            ),
            ...config.primaryButtonConfig

          })({
            click: clickOpenPopoverTether()
          }),
          clickOpenPopover
        )({
          walletChange: walletChangeTether()
        })
      }


      const isCompatibleChain = config.chainList.some(c => c === w3p.chain.id)

      if (isCompatibleChain) {
        return switchLatest(config.$$display(now(w3p)))
      }

      const fstChain = config.chainList[0]

      if (config.chainList.length > 1) {
        return $switchNetworkDropdown(config.walletLink, config.chainList,
          $ButtonPrimary({
            $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $text('Switch Network'),
              $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '16px', fill: pallete.background, svgOps: style({ marginTop: '2px' }) }),
            ),
            ...config.primaryButtonConfig
          })({})
        )({
          changeNetwork: changeNetworkTether()
        })
      }


      return $ButtonPrimary({
        $content: $row(layoutSheet.spacingSmall)(
          $text(`Switch to ${NETWORK_METADATA[fstChain].chainName}`),
          $element('img')(attr({ src: `/assets/chain/${fstChain}.svg` }), style({ width: '20px' }))(),
        ),
        ...config.primaryButtonConfig
      })({
        click: changeNetworkTether(
          // constant(fstChain)
          snapshot(async (wallet) => {
            if (wallet) {
              const switchRequest = wallet.switchChain({ id: fstChain })
              await switchRequest.catch(error => {
                alert(error.message)
                console.error(error)
                return Promise.reject('unable to switch network')
              })
            }

            return fstChain
          }, config.walletLink.wallet),
          awaitPromises
        )
      })

    }, config.walletLink.wallet)),

    {
      walletChange, changeNetwork
    }
  ]
})




export const $ConnectDropdown = ($trigger: $Node, clickOpenPopover: Stream<any>) => component((
  [walletChange, walletChangeTether]: Behavior<PointerEvent, IWalletName>,
) => {

  return [
    $Popover({
      $target: $trigger,
      $container: $node(style({ margin: 'auto' })),
      $popContent: map(() => {
        return $column(layoutSheet.spacing)(
          switchLatest(map(metamask => {
            if (!metamask) {
              return empty()
            }

            return $ButtonSecondary({
              $content: $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                $WalletLogoMap[IWalletName.metamask],
                $text('Connect Metamask')
              )
            })({
              click: walletChangeTether(
                map(() => metamask.request({ method: 'eth_requestAccounts' })),
                awaitPromises,
                constant(IWalletName.metamask)
              ),
            })
          }, fromPromise(metamaskQuery))),
          $ButtonSecondary({
            $content: $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
              $WalletLogoMap[IWalletName.walletConnect],
              $text('Wallet-Connect'),
            )
          })({
            click: walletChangeTether(
              map(() => walletConnect.request({ method: 'eth_requestAccounts' })),
              awaitPromises,
              constant(IWalletName.walletConnect),
            )
          })
        )
      }, clickOpenPopover)
    })({}),

    {
      walletChange
    }
  ]
})


