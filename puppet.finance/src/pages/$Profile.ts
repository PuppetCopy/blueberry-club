import { Behavior, combineArray, O, replayLatest } from "@aelea/core"
import { $Node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, layoutSheet } from "@aelea/ui-components"
import { CHAIN } from "@gambitdao/const"
import {
  getClientNativeTokenUsd,
  getGmxPriceUsd,
  getSafeMappedValue,
  gmxSubgraph,
  IRequestAccountTradeListApi,
  readableDate, timeSince,
  TRADE_CONTRACT_MAPPING,
  unixTimestampNow,
} from "@gambitdao/gmx-middleware"
import { $infoTooltipLabel, $openPositionPnlBreakdown, $PnlValue, $riskLiquidator, $sizeDisplay, $TradePnl } from "@gambitdao/ui-components"
import { $ButtonToggle, $defaulButtonToggleContainer } from "@gambitdao/ui-components/src/$ButtonToggle"
import { awaitPromises, combine, map, mergeArray, multicast, now, switchLatest } from "@most/core"
import { Address } from "viem"
import { $CardTable } from "../components/$common"
import { connectGmxEarn } from "../logic/contract"
import * as tradeReader from "../logic/contract/trade"
import { fadeIn } from "../transitions/enter"
import { walletLink } from "../wallet"
import { $Index } from "./competition/$Leaderboard"



export enum IProfileActiveTab {
  TRADING = 'Trading',
  BERRIES = 'Berries',
  LAB = "Lab",
  IDENTITY = "Identity"
}

export interface IProfile {
  account: Address
  parentUrl: string
  parentRoute: Route

  $accountDisplay: $Node
}

const $title = $text(style({ fontWeight: 'bold', fontSize: '1.55em' }))

export const $Profile = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileActiveTab, IProfileActiveTab>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<number, IRequestAccountTradeListApi>,
) => {

  // activeTab: Stream<IProfileActiveTab>

  const accountOpenTradeList = gmxSubgraph.accountOpenTradeList(
    map(chain => {
      return {
        account: config.account,
        chain: chain.chain!.id,
      }
    }, walletLink.network)
  )

  const clientNativeTokenPrice = getClientNativeTokenUsd(walletLink.publicClient)
  const clientGmxPrice = replayLatest(multicast(getGmxPriceUsd(walletLink.publicClient, clientNativeTokenPrice)))


  const arbitrumContract = switchLatest(combineArray((provider, chain) => {
    const contractMapping = getSafeMappedValue(TRADE_CONTRACT_MAPPING, chain, CHAIN.ARBITRUM)

    if (contractMapping === null) {
      return now(null)
    }

    return connectGmxEarn(now(provider), config.account, clientGmxPrice, contractMapping).stakingRewards
  }, walletLink.publicClient, walletLink.network))


  return [

    $column(layoutSheet.spacingBig, style({ width: '100%', maxWidth: '550px', margin: '0 auto', alignItems: 'center' }))(
      config.$accountDisplay,

      $ButtonToggle({
        $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
        selected: mergeArray([selectProfileMode, now(location.pathname.split('/').slice(-1)[0] === IProfileActiveTab.BERRIES.toLowerCase() ? IProfileActiveTab.BERRIES : IProfileActiveTab.TRADING)]),
        options: [
          IProfileActiveTab.BERRIES,
          IProfileActiveTab.TRADING,
          // IProfileActiveTab.WARDROBE,
        ],
        $$option: map(option => {
          return $text(option)
        })
      })({ select: selectProfileModeTether() }),


      $column(layoutSheet.spacingBig, style({ width: '100%' }))(
        fadeIn(
          $column(layoutSheet.spacingBig, style({ flex: 1 }))(
            $title('Open Positions'),
            $CardTable({
              dataSource: awaitPromises(accountOpenTradeList),
              columns: [
                {
                  $head: $text('Time'),
                  columnOp: O(style({ maxWidth: '60px' })),

                  $$body: map((req) => {
                    const isKeeperReq = 'ctx' in req

                    const timestamp = isKeeperReq ? unixTimestampNow() : req.timestamp

                    return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
                      $text(timeSince(timestamp) + ' ago'),
                      $text(readableDate(timestamp)),
                    )
                  })
                },
                {
                  $head: $text('Entry'),
                  columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
                  $$body: map((pos) => {
                    return $Index(pos)
                  })
                },
                {
                  $head: $column(style({ textAlign: 'right' }))(
                    $text(style({ fontSize: '.75em' }))('Collateral'),
                    $text('Size'),
                  ),
                  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
                  $$body: map(pos => {
                    const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))

                    return $riskLiquidator(pos, positionMarkPrice)
                  })
                },
                {
                  $head: $text('PnL'),
                  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
                  $$body: map((pos) => {
                    const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
                    const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

                    return $infoTooltipLabel(
                      $openPositionPnlBreakdown(pos, cumulativeFee, positionMarkPrice),
                      $TradePnl(pos, cumulativeFee, positionMarkPrice)
                    )
                  })
                },
              ],
            })({}),
            $title('Settled Positions'),
            $CardTable({
              dataSource: awaitPromises(gmxSubgraph.accountTradeList(
                map(network => ({ chain: network.chain!.id, account: config.account }), walletLink.network)
              )),
              columns: [
                {
                  $head: $text('Time'),
                  columnOp: O(style({ maxWidth: '60px' })),

                  $$body: map((req) => {
                    const isKeeperReq = 'ctx' in req

                    const timestamp = isKeeperReq ? unixTimestampNow() : req.settledTimestamp

                    return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
                      $text(timeSince(timestamp) + ' ago'),
                      $text(readableDate(timestamp)),
                    )
                  })
                },
                {
                  $head: $text('Entry'),
                  columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
                  $$body: map((pos) => {
                    return $Index(pos)
                  })
                },
                {
                  $head: $column(style({ textAlign: 'right' }))(
                    $text(style({ fontSize: '.75em' }))('Collateral'),
                    $text('Size'),
                  ),
                  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
                  $$body: map(pos => {
                    return $sizeDisplay(pos)
                  })
                },
                {
                  $head: $text('PnL'),
                  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
                  $$body: map((pos) => {
                    return $PnlValue(pos.realisedPnl - pos.fee)
                  })
                },
              ],
            })({
              scrollIndex: requestAccountTradeListTether(
                combine((chain, pageIndex) => {
                  return {
                    account: config.account,
                    chain: chain.chain!.id,
                    offset: pageIndex * 20,
                    pageSize: 20,
                  }
                }, walletLink.network)
              )
            }),
          ),
        )

        // router.match(config.parentRoute.create({ fragment: IProfileActiveTab.WARDROBE.toLowerCase() }))(
        //   fadeIn(
        //     $Wardrobe({ chainList: [CHAIN.ARBITRUM], walletLink: config.walletLink, parentRoute: config.parentRoute })({
        //       changeRoute: changeRouteTether(),
        //       changeNetwork: changeNetworkTether(),
        //       walletChange: walletChangeTether(),
        //     })
        //   )
        // ),



        // $responsiveFlex(
        //   $row(style({ flex: 1 }))(
        //     $StakingGraph({
        //       sourceList: config.stake,
        //       stakingInfo: multicast(arbitrumContract),
        //       walletLink: config.walletLink,
        //       // priceFeedHistoryMap: pricefeedQuery,
        //       // graphInterval: intervalTimeMap.HR4,
        //     })({}),
        //   ),
        // ),

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

    ),

    {
      changeRoute: mergeArray([
        changeRoute,
        map(mode => {
          const pathName = config.parentUrl + mode.toLowerCase()
          if (location.pathname !== pathName) {
            history.pushState(null, '', pathName)
          }

          return pathName
        }, selectProfileMode)
      ])
    }
  ]
})


