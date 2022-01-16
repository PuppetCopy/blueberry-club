import { Behavior, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, $seperator, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { TREASURY_ARBITRUM, USD_PRECISION } from "@gambitdao/gbc-middleware"
import { intervalInMsMap, shortenAddress, formatFixed, ARBITRUM_CONTRACT, BASIS_POINTS_DIVISOR, IAccountQueryParamApi, ITimerange, intervalListFillOrderMap, expandDecimals } from "@gambitdao/gmx-middleware"
import { CHAIN, getAccountExplorerUrl, IWalletLink } from "@gambitdao/wallet-link"
import { combine, empty, fromPromise, map, multicast, switchLatest } from "@most/core"
import { $anchor, $teamMember } from "../elements/$common"
import { gmxGlpPriceHistory, IPricefeedHistory, IPriceFeedHistoryMap } from "../logic/query"

import { $tokenIconMap } from "../common/$icons"
import { $AssetDetails, readableNumber } from "../components/$AssetDetails"
import { ITreasuryStore } from "../types"
import { $StakingGraph } from "../components/$StakingGraph"
import { arbitrumContract, avalancheContract } from "../logic/stakingGraph"
import { Stream } from "@most/types"
import { IAssetBalance } from "../logic/contract"
import { latestTokenPriceMap } from "../logic/common"
import { $AccountPreview } from "../components/$AccountProfile"
import { $bagOfCoins } from "../elements/$icons"

const GRAPHS_INTERVAL = Math.floor(intervalInMsMap.MIN60 / 1000)

export interface ITreasury {
  walletLink: IWalletLink
  parentRoute: Route
  treasuryStore: state.BrowserStore<ITreasuryStore, "treasuryStore">
}



const $seperator2 = style({ backgroundColor: colorAlpha(pallete.foreground, .15) }, $seperator)

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



  const arbitrumStakingRewardsState = replayLatest(multicast(arbitrumContract.stakingRewards))
  const avalancheStakingRewardsState = replayLatest(multicast(avalancheContract.stakingRewards))


  const gmxPriceHistoryQuery = replayLatest(multicast(fromPromise(gmxGlpPriceHistory(queryParams))))

 


  const ethAsset: Stream<IAssetBalance> = combine((bn, priceMap) => ({ balance: bn.gmxInStakedGmxUsd, balanceUsd: bn.gmxInStakedGmxUsd * priceMap.gmx.value / USD_PRECISION }), arbitrumStakingRewardsState, latestTokenPriceMap)
  const gmxAsset: Stream<IAssetBalance> = combine((bn, priceMap) => ({ balance: bn.gmxInStakedGmx, balanceUsd: bn.gmxInStakedGmx * priceMap.gmx.value / USD_PRECISION }), arbitrumStakingRewardsState, latestTokenPriceMap)
  const glpArbiAsset: Stream<IAssetBalance> = combine((bn, priceMap) => ({ balance: bn.glpBalance, balanceUsd: expandDecimals(priceMap.glpArbitrum.value * bn.glpBalance / USD_PRECISION, 12) }), arbitrumStakingRewardsState, latestTokenPriceMap)
  const glpAvaxAsset: Stream<IAssetBalance> = combine((bn, priceMap) => ({ balance: bn.glpBalance, balanceUsd: expandDecimals(priceMap.glpArbitrum.value * bn.glpBalance / USD_PRECISION, 12) }), avalancheStakingRewardsState, latestTokenPriceMap)

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
      })({}),
      
      $node(),


      $column(layoutSheet.spacing, style({}))(
        $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Yielding Assets'),

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
              chain: CHAIN.ARBITRUM,
              asset: gmxAsset,
              priceChart: priceFeedHistoryInterval(map(feedMap => feedMap.gmx, gmxPriceHistoryQuery)),
              $distribution: switchLatest(map(({ totalGmxRewardsUsd, gmxAprTotalPercentage, bonusGmxTrackerRewards, bnGmxInFeeGmx, bonusGmxInFeeGmx, gmxAprForEthPercentage, gmxAprForEsGmxPercentage }) => {

                const multiplierPointsAmount = bonusGmxTrackerRewards + bnGmxInFeeGmx
                const boostBasisPoints = formatFixed(bnGmxInFeeGmx * BASIS_POINTS_DIVISOR / bonusGmxInFeeGmx, 2)
          
                return $column(layoutSheet.spacingSmall, style({ flex: 1, }))(
                  $metricEntry(`esGMX`, `${formatFixed(gmxAprForEsGmxPercentage, 2)}%`),
                  $metricEntry(`ETH`, `${formatFixed(gmxAprForEthPercentage, 2)}%`),
                  $metricEntry(`Compounding Bonus`, `${boostBasisPoints}%`),
                  $metricEntry(`Multiplier Points`, `${readableNumber(formatFixed(bnGmxInFeeGmx, 18))}`),
                )
              }, arbitrumStakingRewardsState)),
              $iconPath: $tokenIconMap[ARBITRUM_CONTRACT.GMX],
            })({}),
            
            $AssetDetails({
              label: 'GLP',
              symbol: 'GLP',
              chain: CHAIN.ARBITRUM,
              asset: glpArbiAsset,
              priceChart: priceFeedHistoryInterval(map(feedMap => feedMap.glpArbitrum, gmxPriceHistoryQuery)),
              $distribution: switchLatest(map(({ glpAprForEsGmxPercentage, glpAprForEthPercentage,   }) => {

                return $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
                  $metricEntry(`esGMX`, `${formatFixed(glpAprForEsGmxPercentage, 2)}%`),
                  $metricEntry(`ETH`, `${formatFixed(glpAprForEthPercentage, 2)}%`),
                // $metricEntry(`Multiplier Points`, `${readableNumber(formatFixed(bnGmxInFeeglp, 18))}`),
                )
              }, arbitrumStakingRewardsState)),
              $iconPath: $tokenIconMap[ARBITRUM_CONTRACT.GLP],
            })({}),
            $seperator2,
            $AssetDetails({
              label: 'GLP',
              symbol: 'GLP',
              chain: CHAIN.AVALANCHE,
              asset: glpAvaxAsset,
              priceChart: priceFeedHistoryInterval(map(feedMap => feedMap.glpAvalanche, gmxPriceHistoryQuery)),
              $distribution: switchLatest(map(({ glpAprForEsGmxPercentage, glpAprForEthPercentage,   }) => {

                return $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
                  $metricEntry(`esGMX`, `${formatFixed(glpAprForEsGmxPercentage, 2)}%`),
                  $metricEntry(`AVAX`, `${formatFixed(glpAprForEthPercentage, 2)}%`),
                // $metricEntry(`Multiplier Points`, `${readableNumber(formatFixed(bnGmxInFeeglp, 18))}`),
                )
              }, avalancheStakingRewardsState)),
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

      ),

      $node(),


      $column(layoutSheet.spacing)(
        $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Treasury Vaults'),
        $node(
          $text('Treasury is maintained and secured by a Multi-Signature using a 3/5 threshold allowing full control to perform actions like staking Compounding or Vesting, Asset Rebalancing and much more. powered by '),
          $anchor(style({ display: 'inline' }), attr({ href: 'https://gnosis.io/safe/' }))($text('Gnosis Safe')),
        ),
        
        $node(),

        $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
          $AccountPreview({
            address: '0xDe2DBb7f1C893Cc5E2f51CbFd2A73C8a016183a0',
          })({}),
          $anchor(attr({ href: getAccountExplorerUrl(CHAIN.ARBITRUM, '0xDe2DBb7f1C893Cc5E2f51CbFd2A73C8a016183a0') }))(
            $element('img')(attr({ src: `/assets/arbitrum.svg` }), style({ width: '28px', padding: '3px', borderRadius: '50%', backgroundColor: pallete.background }))()
          ),

          $node(style({ flex: 1 }))(),

          $row(layoutSheet.spacingBig)(
            $text(style({ color: pallete.foreground }))('Signers:'),
            $teamSigner({
              name :'xm92boi'
            }),
            $teamSigner({
              name :'0xAppodial'
            }),
            $teamSigner({
              name :'itburnzz'
            }),
            $teamSigner({
              name :'destructioneth'
            }),
            $teamSigner({
              name :'xdev_10'
            }),
          )
        ),

        $seperator2,

        $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
          $AccountPreview({
            address: '0x753b4769154fd100Ee763e927305D5b3131dBC8e',
          })({}),
          $anchor(attr({ href: getAccountExplorerUrl(CHAIN.AVALANCHE, '0x753b4769154fd100Ee763e927305D5b3131dBC8e') }))(
            $element('img')(attr({ src: `/assets/avalanche.svg` }), style({ width: '28px', padding: '3px', borderRadius: '50%', backgroundColor: pallete.background }))()
          ),

          $node(style({ flex: 1 }))(),

          $row(layoutSheet.spacingBig)(
            $text(style({ color: pallete.foreground }))('Signers:'),
            $teamSigner({
              name :'xm92boi'
            }),
            $teamSigner({
              name :'0xAppodial'
            }),
            $teamSigner({
              name :'itburnzz'
            }),
            $teamSigner({
              name :'B2F_zer'
            }),
            $teamSigner({
              name :'xdev_10'
            }),
          )
        ),


   
      ),
      
    )
  ]
})

export const $teamSigner = ({ name }: {name: string}) => $row(layoutSheet.spacingTiny, style({ alignItems: 'center', fontSize: screenUtils.isDesktopScreen ? '' : '65%' }))(
  $element('img')(style({ width: '20px', borderRadius: '22px' }), attr({ src: `https://unavatar.vercel.app/twitter/${name}`, }))(),
  $anchor(attr(({ href: `https://twitter.com/${name}` })), style({ fontWeight: 900, textDecoration: 'none', fontSize: '.75em' }))($text(`@${name}`)),
)


function priceFeedHistoryInterval(gmxPriceHistoryQuery: Stream<IPricefeedHistory[]>) {
  return map((feed) => {
    const oldestTick = feed[feed.length - 1]
    const seed = {
      time: oldestTick.timestamp,
      value: formatFixed(BigInt(oldestTick.c), 30)
    }

    const series = intervalListFillOrderMap({
      seed, getTime: a => a.timestamp,
      source: [...feed].sort((a, b) => a.timestamp - b.timestamp),
      interval: GRAPHS_INTERVAL,
      fillMap: (prev, next) => {
        return { time: next.timestamp, value: formatFixed(BigInt(next.c), 30) }
      },
    })

    const baselinePrice = formatFixed(BigInt(feed[0].c), 30)


    return { series, baselinePrice }
  }, gmxPriceHistoryQuery)
}

