import { Behavior, Op } from "@aelea/core"
import { $Node, $element, $text, attr, component, nodeEvent, style } from "@aelea/dom"
import { $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { CHAIN, NETWORK_METADATA } from "@gambitdao/const"
import { $alertContainer, $alertIcon } from "@gambitdao/ui-components"
import { IWalletName, parseError } from "@gambitdao/wallet-link"
import { awaitPromises, empty, map, mergeArray, now, snapshot, switchLatest, tap } from "@most/core"
import { Stream } from "@most/types"
import { Address, Chain, getNetwork } from "@wagmi/core"
import { EIP1193Provider } from "viem"
import { $bagOfCoinsCircle, $walletConnectLogo } from "../common/$icons"
import { $caretDown } from "../elements/$icons"
import { IWalletConnected, network, wallet, web3Modal } from "../wallet/walletLink"
import { $ButtonPrimary, $ButtonSecondary } from "./form/$Button"
import { IButtonCore } from "./form/$ButtonCore"



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
  $$display: Op<IWalletConnected, $Node>
  primaryButtonConfig?: Partial<IButtonCore>
}




export const $IntermediateConnectButton = (config: IConnectWalletPopover) => component((
  [clickOpenPopover, clickOpenPopoverTether]: Behavior<any, any>,
) => {


  return [
    switchLatest(map(w3p => {
      const address = w3p.account.address
      // no wallet connected, show connection flow
      if (!address) {
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
        )({})
      }


      if (w3p.network === null) {
        return $SwitchNetworkDropdown(true)({})
      }

      return switchLatest(config.$$display(now({ address, network: w3p.network })))


    }, wallet)),

    {
    }
  ]
})


export const $SwitchNetworkDropdown = (showLabel = false) => component((
  [changeNetwork, changeNetworkTether]: Behavior<any, any>,
) => {

  return [
    switchLatest(snapshot((_, network) => {

      if (network === null) {
        return $alertContainer(changeNetworkTether(
          nodeEvent('click'),
          tap(async () => {
            await web3Modal.openModal({ route: 'SelectNetwork' })

            return CHAIN.BSC
          }),
        ), style({ padding: '0 8px', cursor: 'pointer' }))(
          $icon({
            $content: $alertIcon, viewBox: '0 0 24 24', width: '26px',
            svgOps: style({ fill: pallete.negative, padding: '3px', filter: 'drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 1px)' })
          }),
          showLabel ? $text(`${getNetwork().chain?.name} is not supported`) : empty()
        )
      }

      const $container = network === null ? $alertContainer : $row

      return $container(changeNetworkTether(
        nodeEvent('click'),
        tap(async () => {
          await web3Modal.openModal({ route: 'SelectNetwork' })

          return CHAIN.BSC
        }),
      ), style({ padding: '0 8px', cursor: 'pointer' }))(
        $element('img')(attr({ src: `/assets/chain/${network.id}.svg` }), style({ width: '26px' }))(),
      )

      // return style({ zoom: 1.1 })($alertTooltip($text('www')))

    }, mergeArray([now(null), changeNetwork]), network)),

    {
    }
  ]
})


export const $ConnectDropdown = ($trigger: $Node, clickOpenPopover: Stream<any>) => component((
  [walletChange, walletChangeTether]: Behavior<PointerEvent, any>,
) => {





  return [
    $ButtonSecondary({
      $content: $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
        $WalletLogoMap[IWalletName.walletConnect],
        $text('Wallet-Connect'),
      )
    })({
      click: walletChangeTether(
        map(async () => {

          await web3Modal.openModal()

          // const connectResult = await connect({
          //   connector: walletConnectConnector,
          // })

          return 'connectResult'
          // walletConnect.request({ method: 'eth_requestAccounts' })
        }),
        awaitPromises,
        // constant(IWalletName.walletConnect),
      )
    }),

    {
      walletChange
    }
  ]
})


