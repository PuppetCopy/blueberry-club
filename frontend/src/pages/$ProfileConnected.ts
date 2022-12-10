import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { blueberrySubgraph, saleDescriptionList } from "@gambitdao/gbc-middleware"

import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { map, never, now, switchLatest } from "@most/core"
import { $responsiveFlex } from "../elements/$common"
import { IAccountStakingStore } from "@gambitdao/gbc-middleware"
import { $anchor, $IntermediatePromise, $Link } from "@gambitdao/ui-components"
import { $accountPreview } from "../components/$AccountProfile"
import { $berryTileId } from "../components/$common"
import { $ButtonPrimary, $ButtonSecondary } from "../components/form/$Button"
import { $labItem } from "../logic/common"
import { pallete } from "@aelea/ui-components-theme"
import { BrowserStore } from "../logic/store"
import { connectLab } from "../logic/contract/gbc"
import { $IntermediateConnectButton } from "../components/$ConnectAccount"
import { CHAIN, IAccountParamApi, IStake } from "@gambitdao/gmx-middleware"
import { $Profile } from "./$Profile"
import { Stream } from "@most/types"


export interface IAccount {
  walletLink: IWalletLink
  parentRoute: Route
  chainList: CHAIN[]
  accountStakingStore: BrowserStore<"ROOT.v1.treasuryStore", IAccountStakingStore>
  stake: Stream<IStake[]>
}

export const $ProfileConnected = (config: IAccount) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [changeNetwork, changeNetworkTether]: Behavior<CHAIN, CHAIN>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,
  [requestStake, requestStakeTether]: Behavior<IAccountParamApi, IAccountParamApi>,
) => {


  return [
    $responsiveFlex(layoutSheet.spacingBig)(

      $row(layoutSheet.spacingBig, style({ width: '100%', placeContent: 'center' }))(


        $IntermediateConnectButton({
          chainList: config.chainList,
          walletLink: config.walletLink,
          $$display: map(w3p => {
 
            return $Profile({
              provider: now(w3p.provider),
              account: w3p.address,
              ...config,
            })({
              stake: requestStakeTether()
            })
          })
        })({
          changeNetwork: changeNetworkTether(),
          walletChange: walletChangeTether()
        }),


      )

    ),

    { changeRoute, changeNetwork, walletChange, requestStake }
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
