import { Behavior, replayLatest } from "@aelea/core"
import { $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, $seperator, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { TREASURY_ARBITRUM, USD_PRECISION } from "@gambitdao/gbc-middleware"
import { intervalInMsMap, shortenAddress, formatFixed, ARBITRUM_CONTRACT, BASIS_POINTS_DIVISOR, IAccountQueryParamApi, ITimerange, intervalListFillOrderMap, expandDecimals } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { combine, empty, fromPromise, map, multicast, switchLatest } from "@most/core"
import { $anchor } from "../elements/$common"
import { gmxGlpPriceHistory } from "../logic/query"

import { $tokenIconMap } from "../common/$icons"
import { $AssetDetails, readableNumber } from "../components/$AssetDetails"
import { ITreasuryStore } from "../types"
import { $StakingGraph } from "../components/$StakingGraph"
import { treasuryContract } from "../logic/stakingGraph"
import { Stream } from "@most/types"
import { IAssetBalance } from "../logic/contract"
import { latestTokenPriceMap } from "../logic/common"

const GRAPHS_INTERVAL = Math.floor(intervalInMsMap.MIN60 / 1000)

export interface ITreasury {
  walletLink: IWalletLink
  parentRoute: Route
  treasuryStore: state.BrowserStore<ITreasuryStore, "treasuryStore">
}





export const $Treasury = ({ walletLink, parentRoute, treasuryStore }: ITreasury) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
) => {

  const treasuryRef = $anchor(attr({ href: 'https://arbiscan.io/address/0xDe2DBb7f1C893Cc5E2f51CbFd2A73C8a016183a0' }), style({ fontSize: '.75em' }))(
    $text(shortenAddress('0xDe2DBb7f1C893Cc5E2f51CbFd2A73C8a016183a0'))
  )


  const queryParams: IAccountQueryParamApi & Partial<ITimerange> = {
    from: treasuryStore.state.startedStakingGmxTimestamp || undefined,
    account: TREASURY_ARBITRUM
  }



  const stakingRewardsState = replayLatest(multicast(treasuryContract.stakingRewards))


  const gmxPriceHistoryQuery = replayLatest(multicast(fromPromise(gmxGlpPriceHistory(queryParams))))

  const gmxPriceInterval = map(({ gmx }) => {
    const oldestTick = gmx[gmx.length - 1]
    const seed = {
      time: oldestTick.timestamp,
      value: formatFixed(BigInt(oldestTick.c), 30)
    }

    const series = intervalListFillOrderMap({
      seed, getTime: a => a.timestamp,
      source: [...gmx].sort((a, b) => a.timestamp - b.timestamp),
      interval: GRAPHS_INTERVAL,
      fillMap: (prev, next) => {
        return { time: next.timestamp, value: formatFixed(BigInt(next.c), 30) }
      },
    })

    const baselinePrice = formatFixed(BigInt(gmx[0].c), 30)


    return { series, baselinePrice }
  }, gmxPriceHistoryQuery)

  const glpPriceInterval = map(({ glp }) => {
    const oldestTick = glp[glp.length - 1]
    const seed = {
      time: oldestTick.timestamp,
      value: formatFixed(oldestTick.c, 18)
    }
    const series = intervalListFillOrderMap({
      seed, getTime: a => a.timestamp,
      source: glp,
      interval: GRAPHS_INTERVAL,
      fillMap: (prev, next) => {
        const time = Number(next.id)
        const value = formatFixed(next.c, 30)
        return { time, value }
      },
    })

    const baselinePrice = formatFixed(glp[0].c, 30)

    return { series, baselinePrice }
  }, gmxPriceHistoryQuery)


  


  const ethAsset: Stream<IAssetBalance> = combine((bn, priceMap) => ({ balance: bn.gmxInStakedGmxUsd, balanceUsd: bn.gmxInStakedGmxUsd * priceMap.gmx.value / USD_PRECISION }), stakingRewardsState, latestTokenPriceMap)
  const gmxAsset: Stream<IAssetBalance> = combine((bn, priceMap) => ({ balance: bn.gmxInStakedGmx, balanceUsd: bn.gmxInStakedGmx * priceMap.gmx.value / USD_PRECISION }), stakingRewardsState, latestTokenPriceMap)
  const glpAsset: Stream<IAssetBalance> = combine((bn, priceMap) => ({ balance: bn.glpBalance, balanceUsd: expandDecimals(priceMap.glp.value * bn.glpBalance / USD_PRECISION, 12) }), stakingRewardsState, latestTokenPriceMap)

  const $metricEntry = (label: string, value: string) => $row(style({ fontSize: '.75em', alignItems: 'center' }))(
    $text(style({ color: pallete.foreground, flex: 1 }))(label),
    $text(style({ fontWeight: 'bold' }))(value),
  )

  return [
    $column(layoutSheet.spacingBig)(

      // $column(style({ placeContent:'center', alignItems: 'center' }))(
      //   $text(style({ fontSize: '2em', fontWeight: 'bold' }))('Treasury'),
      //   $text(style({ fontSize: '.75em', color: pallete.foreground }))('WORK IN PROGRESS')
      // ),

      $StakingGraph({
        from: 0,
        walletLink,
        priceFeedHistoryMap: gmxPriceHistoryQuery,
        graphInterval: intervalInMsMap.MIN60,
      })({ }),

      $column(layoutSheet.spacing, style({}))(
        $column(layoutSheet.spacing, style({ flex: 2 }))(
          screenUtils.isDesktopScreen
            ? $row(layoutSheet.spacingBig, style({ color: pallete.foreground, fontSize: '.75em' }))(
              $text(style({ flex: 1 }))('Holdings'),
              $row(layoutSheet.spacingBig, style({ flex: 3 }))(
                $text(style({ flex: 1 }))('Price History'),
                $text(style({ flex: 1, maxWidth: '300px' }))('Distribution')
              ),
            ) : empty(),
          $column(layoutSheet.spacingBig)(
            $AssetDetails({
              label: 'GMX',
              symbol: 'GMX',
              asset: gmxAsset,
              priceChart: gmxPriceInterval,
              $distribution: switchLatest(map(({ totalGmxRewardsUsd, gmxAprTotalPercentage, bonusGmxTrackerRewards, bnGmxInFeeGmx, bonusGmxInFeeGmx, gmxAprForEthPercentage, gmxAprForEsGmxPercentage }) => {

                const multiplierPointsAmount = bonusGmxTrackerRewards + bnGmxInFeeGmx
                const boostBasisPoints = formatFixed(bnGmxInFeeGmx * BASIS_POINTS_DIVISOR / bonusGmxInFeeGmx, 2)
          
                return $column(layoutSheet.spacingSmall, style({ flex: 1, }))(
                  $metricEntry(`esGMX`, `${formatFixed(gmxAprForEsGmxPercentage, 2)}%`),
                  $metricEntry(`ETH`, `${formatFixed(gmxAprForEthPercentage, 2)}%`),
                  $metricEntry(`Age Boost`, `${boostBasisPoints}%`),
                  $metricEntry(`Multiplier Points`, `${readableNumber(formatFixed(bnGmxInFeeGmx, 18))}`),
                )
              }, stakingRewardsState)),
              $iconPath: $tokenIconMap[ARBITRUM_CONTRACT.GMX],
            })({}),
            style({ backgroundColor: colorAlpha(pallete.foreground, .15) }, $seperator),
            $AssetDetails({
              label: 'GLP',
              symbol: 'GLP',
              asset: glpAsset,
              priceChart: glpPriceInterval,
              $distribution: switchLatest(map(({ glpAprForEsGmxPercentage, glpAprForEthPercentage,   }) => {

                return $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
                  $metricEntry(`esGMX`, `${formatFixed(glpAprForEsGmxPercentage, 2)}%`),
                  $metricEntry(`ETH`, `${formatFixed(glpAprForEthPercentage, 2)}%`),
                // $metricEntry(`Multiplier Points`, `${readableNumber(formatFixed(bnGmxInFeeglp, 18))}`),
                )
              }, stakingRewardsState)),
              $iconPath: $tokenIconMap[ARBITRUM_CONTRACT.GLP],
            })({}),
          ),
        ),


        // $responsiveFlex(
        //   $column(
        //     $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
        //       $element('img')(style({}), attr({ width: '28px', src: '/assets/arbitrum.svg', }))(),
        //       $text('Arbitrum Signers')
        //     ),

        //     $Table2<ITransfer>({
        //       dataSource: map(md => {
        //         return md.transfers
        //       }, token),
        //       cellOp: style({ alignItems: 'center' }),
        //       columns: [
        //         {
        //           $head: $text('From'),
        //           $body: map(x => $accountRef(x.from.id))
        //         },
        //         {
        //           $head: $text('To'),
        //           $body: map(x => $accountRef(x.to.id))
        //         },
        //         {
        //           $head: $text('Txn'),
        //           $body: map(x => {
        //             const time = Number(BigInt(x.timestamp))
        //             const dateStr = new Date(Math.floor(time * 1000)).toLocaleDateString()

        //             const timeAgo = timeSince(time)

        //             return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
        //               $txnIconLink(x.transactionHash),
        //               $column(
        //                 $text(style({ fontSize: '.75em' }))(`${timeAgo}`),
        //                 $text(`${dateStr}`),
        //               ),
        //             )
        //           })
        //         },
        //       ]
        //     })({})
        //   )

        // )

      )
      
    )
  ]
})




