import { Behavior, combineArray } from "@aelea/core"
import { $Node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { blueberrySubgraph, saleDescriptionList } from "@gambitdao/gbc-middleware"
import { awaitPromises, empty, map, multicast, now, switchLatest } from "@most/core"
import { $responsiveFlex } from "../elements/$common"
import { $IntermediatePromise } from "@gambitdao/ui-components"
import { $accountPreview } from "../components/$AccountProfile"
import { $berryTileId } from "../components/$common"
import { $StakingGraph } from "../components/$StakingGraph"
import { CHAIN, IStake, TRADE_CONTRACT_MAPPING } from "@gambitdao/gmx-middleware"
import { Stream } from "@most/types"
import { connectGmxEarn } from "../logic/contract"
import { $labItem, getContractMapping } from "../logic/common"
import { JsonRpcProvider } from "@ethersproject/providers"
import { pallete } from "@aelea/ui-components-theme"
import { connectLab } from "../logic/contract/gbc"


export interface IProfile {
  provider: Stream<JsonRpcProvider>
  account: string
  parentRoute: Route
  stake: Stream<IStake[]>

  $actions?: $Node
}

export const $Profile = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
) => {

  const providerChain = awaitPromises(map(async p => (await p.getNetwork()).chainId as CHAIN, config.provider))

  const arbitrumContract = switchLatest(combineArray((provider, chain) => {

    const contractMapping = getContractMapping(TRADE_CONTRACT_MAPPING, chain)

    if (contractMapping === null) {
      return now(null)
    }

    return connectGmxEarn(now(provider), config.account, contractMapping).stakingRewards
  }, config.provider, providerChain))

  const lab = connectLab(config.provider)
  const ownedItems = lab.accountListBalance(saleDescriptionList.map(x => x.id))

  return [
    $column(layoutSheet.spacingBig)(
      $row(style({ flex: 1, alignItems: 'center', placeContent: 'space-between', marginBottom: '-55px', zIndex: 1 }))(
        $accountPreview({
          address: config.account,
          avatarSize: 150,
          labelSize: '2em'
        }),


        config.$actions || empty(),
      ),

      $responsiveFlex(
        $row(style({ flex: 1 }))(
          $StakingGraph({
            sourceList: config.stake,
            reward: multicast(arbitrumContract),
            provider: config.provider,
            // priceFeedHistoryMap: pricefeedQuery,
            // graphInterval: intervalTimeMap.HR4,
          })({}),
        ),
      ),


      $IntermediatePromise({
        query: blueberrySubgraph.owner(now({ id: config.account })),
        $$done: map(owner => {
          if (owner === null) {
            return null
          }

          return $responsiveFlex(layoutSheet.spacingBig)(
            $column(layoutSheet.spacingBig, style({ maxWidth: '550px', placeContent: 'center' }))(


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

      // $IntermediatePromise({
      //   query: blueberrySubgraph.owner(now({ id: config.account })),
      //   $$done: map(owner => {
      //     if (owner == null) {
      //       return $alert($text(style({ alignSelf: 'center' }))(`Connected account does not own any GBC's`))
      //     }

      //     return $row(layoutSheet.spacingSmall, style({ flexWrap: 'wrap' }))(...owner.ownedTokens.map(token => {
      //       return $berryTileId(token, 85)
      //     }))
      //   }),
      // })({}),

    ),

    {
      stake: map(chain => ({ chain, account: config.account }), providerChain),
      changeRoute,
    }
  ]
})


