import { Behavior } from "@aelea/core"
import { $text, component } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet } from "@aelea/ui-components"

import { CHAIN, IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { map } from "@most/core"
import { IAccountStakingStore } from "@gambitdao/gbc-middleware"
import { $ButtonPrimary, $ButtonSecondary } from "../components/form/$Button"
import { $labItem } from "../logic/common"
import { BrowserStore } from "../logic/store"
import { $IntermediateConnectButton } from "../components/$ConnectAccount"
import { IRequestAccountApi, IRequestAccountTradeListApi, IRequestPageApi, IStake, ITradeOpen, ITradeSettled } from "@gambitdao/gmx-middleware"
import { $Profile } from "./$Profile"
import { Stream } from "@most/types"
import { $Link, $anchor } from "@gambitdao/ui-components"


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
            $actions: $Link({
              $content: $anchor(
                $ButtonSecondary({
                  
                  $content: $text('Wardrobe')
                })({}),
              ),
              url: '/p/wardrobe', route: config.parentRoute
            })({
              click: changeRouteTether()
            }),
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
