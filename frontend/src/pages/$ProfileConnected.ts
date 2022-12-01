import { Behavior } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { saleDescriptionList } from "@gambitdao/gbc-middleware"

import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { map, multicast, never, now, switchLatest } from "@most/core"
import { $responsiveFlex } from "../elements/$common"
import { queryOwnerV2 } from "../logic/query"
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
import { CHAIN } from "@gambitdao/gmx-middleware"


export interface IAccount {
  walletLink: IWalletLink
  parentRoute: Route
  chainList: CHAIN[]
  accountStakingStore: BrowserStore<"ROOT.v1.treasuryStore", IAccountStakingStore>
}

export const $ProfileConnected = (config: IAccount) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [changeNetwork, changeNetworkTether]: Behavior<CHAIN, CHAIN>,
  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,
) => {


  return [
    $responsiveFlex(layoutSheet.spacingBig)(

      $row(layoutSheet.spacingBig, style({ width: '100%', placeContent: 'center' }))(


        $IntermediateConnectButton({
          chainList: config.chainList,
          walletLink: config.walletLink,
          $$display: map(w3p => {
            const lab = connectLab(config.walletLink)
            const ownedItems = lab.accountListBalance(saleDescriptionList.map(x => x.id))

            return $IntermediatePromise({
              query: now(queryOwnerV2(w3p.address)),
              $$done: map(owner => {
                if (owner === null) {
                  return null
                }

                return $responsiveFlex(layoutSheet.spacingBig)(
                  $column(layoutSheet.spacingBig, style({ maxWidth: '550px', placeContent: 'center' }))(
                    $responsiveFlex(layoutSheet.spacing, style({ alignItems: 'center' }))(
                      $accountPreview({
                        labelSize: '2em',
                        avatarSize: 130,
                        address: w3p.address
                      }),

                      $node(style({ flex: 1 }))(),

                      $Link({
                        $content: $anchor(
                          $ButtonSecondary({
                            $content: $text('Customize my GBC')
                          })({}),
                        ),
                        url: '/p/wardrobe', route: config.parentRoute
                      })({
                        click: changeRouteTether()
                      }),
                    ),

                    $node(style({ flex: 1 }))(),


                    $row(layoutSheet.spacingSmall, style({ flexWrap: 'wrap', placeContent: 'center' }))(...owner.ownedTokens.map(token => {
                      return $berryTileId(token, 85)
                    })),



                    $row(
                      $text('Items'),

                      // switchLatest(map(items => {
                      //   return $Popover({
                      //     $$popContent: map(_ => $TransferItems(items.filter(x => x.amount > 0))({}), clickTransferItems),

                      //   })(
                      //     $ButtonSecondary({ $content: $text('Transfer') })({
                      //       click: clickTransferItemsTether()
                      //     })
                      //   )({})
                      // }, ownedItems))

                    ),


                    switchLatest(map(items => {
                      return $row(layoutSheet.spacing, style({ flexWrap: 'wrap' }))(
                        ...items.filter(item => item.amount > 0).map(item => {
                          return $row(style({ position: 'relative' }))(
                            $text(style({ position: 'absolute', top: '1px', right: '4px', fontSize: '.75em', fontWeight: 'bold', color: pallete.background }))(
                              item.amount + 'x'
                            ),
                            $labItem(item.id, 97)
                          )
                        })
                      )
                    }, ownedItems))

                  ),
                )
              })
            })({})
          })
        })({
          changeNetwork: changeNetworkTether(),
          walletChange: walletChangeTether()
        }),


      )

    ),

    { changeRoute, changeNetwork, walletChange }
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
