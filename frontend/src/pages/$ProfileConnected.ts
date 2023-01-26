import { Behavior, combineArray } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"

import { CHAIN, IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { awaitPromises, map, now, switchLatest } from "@most/core"
import { IAccountStakingStore, LAB_CHAIN } from "@gambitdao/gbc-middleware"
import { $ButtonPrimary, $ButtonSecondary, $defaultButtonSecondary, $defaultMiniButtonSecondary } from "../components/form/$Button"
import { $labItem } from "../logic/common"
import { BrowserStore } from "../logic/store"
import { $IntermediateConnectButton } from "../components/$ConnectAccount"
import { IRequestAccountApi, IRequestAccountTradeListApi, IRequestPageApi, IStake, ITradeOpen, ITradeSettled } from "@gambitdao/gmx-middleware"
import { $Profile } from "./$Profile"
import { Stream } from "@most/types"
import { $Link, $anchor, $IntermediateTx } from "@gambitdao/ui-components"
import { $labLogo } from "../common/$icons"
import { pallete } from "@aelea/ui-components-theme"
import { $caretDown } from "../elements/$icons"
import { $Popover } from "../components/$Popover"
import { $discoverIdentityDisplay } from "../components/$AccountProfile"
import { ContractTransaction } from "@ethersproject/contracts"
import { connectLab } from "../logic/contract/gbc"


export interface IAccount {
  walletLink: IWalletLink
  parentRoute: Route
  chainList: CHAIN[]
  accountStakingStore: BrowserStore<"ROOT.v1.treasuryStore", IAccountStakingStore>
  accountTradeList: Stream<Promise<IRequestPageApi<ITradeSettled>>>
  accountOpenTradeList: Stream<Promise<ITradeOpen[]>>
  stake: Stream<IStake[]>
}

export const $ProfileConnected = (config: IAccount) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [changeNetwork, changeNetworkTether]: Behavior<CHAIN, CHAIN>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,
  [requestStake, requestStakeTether]: Behavior<IRequestAccountApi, IRequestAccountApi>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<IRequestAccountTradeListApi, IRequestAccountTradeListApi>,
  [requestAccountOpenTradeList, requestAccountOpenTradeListTether]: Behavior<IRequestAccountApi, IRequestAccountApi>,

  [clickSetIdentityPopover, clickSetIdentityPopoverTether]: Behavior<any, any>,
  [setMainBerry, setMainBerryTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,

) => {


  return [
    $column(layoutSheet.spacingBig)(

      $IntermediateConnectButton({
        chainList: config.chainList,
        walletLink: config.walletLink,
        $$display: map(w3p => {

          return $Profile({
            ...config,
            parentUrl: "/p/wallet/",
            accountTradeList: config.accountTradeList,
            walletLink: config.walletLink,
            account: w3p.address,
            $accountDisplay: $Popover({
              $target: $row(layoutSheet.spacing, style({ flex: 1, alignItems: 'center', placeContent: 'center', zIndex: 1 }))(
                $discoverIdentityDisplay({
                  address: w3p.address,
                  avatarSize: 100,
                  labelSize: '1.5em'
                }),
                $column(layoutSheet.spacing)(
                  $ButtonSecondary({
                    $container: $defaultMiniButtonSecondary,
                    $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
                      $icon({ $content: $labLogo, width: '16px', fill: pallete.middleground, viewBox: '0 0 32 32' }),
                      $text('Set Identity'),
                      // $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px' }), viewBox: '0 0 32 32' }),
                    )
                  })({
                    click: clickSetIdentityPopoverTether()
                  }),
                  $Link({
                    $content: $anchor(
                      $ButtonSecondary({
                        $container: $defaultMiniButtonSecondary,
                        $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
                          $icon({ $content: $labLogo, width: '16px', fill: pallete.middleground, viewBox: '0 0 32 32' }),
                          $text('Wardrobe')
                        )
                      })({}),
                    ),
                    url: '/p/wardrobe', route: config.parentRoute
                  })({
                    click: changeRouteTether()
                  })
                ),
                
              ),
              $popContent: map(() => {
                const connect = connectLab(config.walletLink.provider)


                return $column(
                  
                  // switchLatest(awaitPromises(combineArray(async (contract, berry) => {
                  //   const mainId = account ? (await contract.getDataOf(account).catch(() => null))?.tokenId.toNumber() : null
                  //   const disabled = now(berry === null || berry?.id === w3p.address)

                  //   return $ButtonSecondary({ $content: $text(`Set PFP`), disabled })({
                  //     click: setMainBerryTether(map(async () => {
                  //       return (await contract.chooseMain(berry!.id))
                  //     }))
                  //   })
                  // }, connect.profile.contract, selectedBerry))),

                  $IntermediateTx({
                    chain: LAB_CHAIN,
                    query: setMainBerry
                  })({}),
                )
              }, clickSetIdentityPopover)
            })({}),
          })({
            requestAccountTradeList: requestAccountTradeListTether(),
            requestAccountOpenTradeList: requestAccountOpenTradeListTether(),
            stake: requestStakeTether(),
            changeRoute: changeRouteTether()
          })
        })
      })({
        changeNetwork: changeNetworkTether(),
        walletChange: walletChangeTether()
      })
    ),

    { changeRoute, changeNetwork, walletChange, requestStake, requestAccountTradeList, requestAccountOpenTradeList }
  ]
})



export const $TransferItems = (items: { id: number, amount: number }[]) => component((
  [selection, selectionTether]: Behavior<any, any>
) => {

  return [
    $column(
      $row(...items.map(item => {

        return $row(
          $labItem(item.id, 50)
        )
      })),

      // $DropMultiSelect({
      //   value: now([]),
      //   $chip: $defaultChip(style({ padding: 0, overflow: 'hidden' })),
      //   $$chip: map(item => {

      //     return $row(style({ alignItems: 'center', gap: '8px', color: pallete.message }))(
      //       style({ borderRadius: '50%' }, $labItem(item.id, 50)),
      //       $text(String(item.id)),
      //     )
      //   }),
      //   selectDrop: {
      //     $container: $defaultSelectContainer(style({ padding: '10px', flexWrap: 'wrap', width: '100%', maxHeight: '400px', overflow: 'auto', flexDirection: 'row' })),
      //     $$option: map((item) => {

      //       return style({ cursor: 'pointer' }, $labItem(item.id, 50))
      //     }),
      //     list: items
      //   }
      // })({
      //   selection: selectionTether()
      // }),

      $ButtonPrimary({
        $content: $text('Send')
      })({})
    )


  ]
})
