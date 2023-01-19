import { Behavior, combineArray, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { GBC_ADDRESS, BI_18_PRECISION, blueberrySubgraph } from "@gambitdao/gbc-middleware"
import { intervalTimeMap, formatFixed, ARBITRUM_ADDRESS, BASIS_POINTS_DIVISOR, getAccountExplorerUrl, TOKEN_SYMBOL, readableNumber, AVALANCHE_ADDRESS, IRequestTimerangeApi, IRequestAccountApi, gmxSubgraph, unixTimestampNow, getTxExplorerUrl, getDebankProfileUrl } from "@gambitdao/gmx-middleware"
import { CHAIN, IWalletLink } from "@gambitdao/wallet-link"
import { $alert, $anchor, $tokenIconMap } from "@gambitdao/ui-components"
import { awaitPromises, combine, empty, fromPromise, map, multicast, now, switchLatest, take } from "@most/core"
import { $responsiveFlex, $teamMember, ITeamMember } from "../elements/$common"
import { IAsset, ITreasuryStore } from "@gambitdao/gbc-middleware"
import { $StakingGraph } from "../components/$StakingGraph"
import { arbitrumContract, avalancheContract } from "../logic/gbcTreasury"
import { Stream } from "@most/types"
import { $AccountLabel, $accountPreview } from "../components/$AccountProfile"
import { $metricEntry, $seperator2 } from "./common"
import { BrowserStore } from "../logic/store"
import { $AssetDetails } from "../components/$AssetDetails"
import { $berryByToken } from "../logic/common"

const GRAPHS_INTERVAL = Math.floor(intervalTimeMap.HR4)

export interface ITreasury {
  walletLink: IWalletLink
  parentRoute: Route
  treasuryStore: BrowserStore<"ROOT.v1.treasuryStore", ITreasuryStore>
}




export const $Treasury = ({ walletLink, parentRoute, treasuryStore }: ITreasury) => component((
  [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
) => {


  // const queryParams: IRequestAccountApi & Partial<IRequestTimerangeApi> = {
  //   from: treasuryStore.getState().startedStakingGmxTimestamp || undefined,
  //   account: GBC_ADDRESS.TREASURY_ARBITRUM
  // }


  const arbitrumStakingRewards = replayLatest(multicast(arbitrumContract.stakingRewards))
  const avalancheStakingRewards = replayLatest(multicast(avalancheContract.stakingRewards))

  // const pricefeedQuery = replayLatest(multicast(fromPromise(gmxGlpPriceHistory(queryParams))))

  // const arbitrumYieldSourceMap = replayLatest(multicast(fromPromise(queryArbitrumRewards(queryParams))))
  // const avalancheYieldSourceMap = replayLatest(multicast(fromPromise(queryAvalancheRewards({ ...queryParams, account: GBC_ADDRESS.TREASURY_AVALANCHE }))))



  // const ethAsset: Stream<IAsset> = combine((bn, priceMap) => ({ balance: bn.gmxInStakedGmxUsd, balanceUsd: bn.gmxInStakedGmxUsd * priceMap.gmx.value / BI_18_PRECISION }), arbitrumStakingRewards, latestTokenPriceMap)
  // const gmxAsset: Stream<IAsset> = combine((bn, priceMap) => {
  //   return { balance: bn.gmxInStakedGmx, balanceUsd: bn.gmxInStakedGmx * priceMap.gmx.value / BI_18_PRECISION }
  // }, arbitrumStakingRewards, latestTokenPriceMap)
  // const glpArbiAsset: Stream<IAsset> = combine((bn, priceMap) => ({ balance: bn.glpBalance, balanceUsd: priceMap.glpArbitrum.value * bn.glpBalance / BI_18_PRECISION }), arbitrumStakingRewards, latestTokenPriceMap)
  // const glpAvaxAsset: Stream<IAsset> = combine((bn, priceMap) => ({ balance: bn.glpBalance, balanceUsd: priceMap.glpArbitrum.value * bn.glpBalance / BI_18_PRECISION }), avalancheStakingRewards, latestTokenPriceMap)



  //   const feeYieldClaim = combineArray((arbiStaking, avaxStaking) => [...avaxStaking, arbiStaking], arbitrumYieldSourceMap, avalancheYieldSourceMap)
  // const newLocal = take(1, latestTokenPriceMap)
  //   const yieldClaim = combineArray((arbiStaking, avaxStaking) => {
  //     // amountUsd from avalanche is not reflecting the real amount because the subraph's gmx price is 0
  //     // to fix this, we'll fetch arbitrum's price of GMX instead

  //     return [
  //       ...arbiStaking,
  //       ...avaxStaking
  //       // ...yieldFeeList,
  //     ]
  //   }, arbitrumYieldSourceMap, avalancheYieldSourceMap)


  const gmxArbitrumRS = gmxSubgraph.subgraphPricefeed(now({
    chain: CHAIN.ARBITRUM, from: 0, to: unixTimestampNow(), interval: GRAPHS_INTERVAL, tokenAddress: ARBITRUM_ADDRESS.GMX
  }))


  const glpArbitrumRS = gmxSubgraph.subgraphPricefeed(now({
    chain: CHAIN.ARBITRUM, from: 0, to: unixTimestampNow(), interval: GRAPHS_INTERVAL, tokenAddress: ARBITRUM_ADDRESS.GLP
  }))

  const glpAvalancheRS = gmxSubgraph.subgraphPricefeed(now({
    chain: CHAIN.AVALANCHE, from: 0, to: unixTimestampNow(), interval: GRAPHS_INTERVAL, tokenAddress: AVALANCHE_ADDRESS.GLP
  }))

  const members = [
    { name: 'xm92boi', size: 'small', title: "Founder & Designer", tokenId: 16 },
    { name: 'APP0D14L', size: 'small', title: "Marketing", tokenId: 11 },
    { name: 'itburnzz', size: 'small', title: "Dev", tokenId: 12 },
    { name: 'B2F_zer', size: 'small', title: "Pleb", tokenId: 22 },
    { name: 'defipleb', size: 'small', title: "Lab's Shakespeare", tokenId: 6762 },
    { name: 'xdev_10', size: 'small', title: "X", tokenId: 6 },
    { name: 'kingblockchain', size: 'small', title: "Marketing & Advocee", tokenId: 4825 },
  ]

  return [
    $column(layoutSheet.spacingBig)(

      //   $StakingGraph({
      //     sourceMap: [gmxArbitrumRS, glpArbitrumRS, glpAvalancheRS],
      //     // stakingYield: yieldClaim,
      //     arbitrumStakingRewards,
      //     avalancheStakingRewards,
      //     walletLink,
      //     priceFeedHistoryMap: pricefeedQuery,
      //     graphInterval: GRAPHS_INTERVAL,
      //   })({}),

      $node(),


      // $column(layoutSheet.spacing, style({}))(
      //   $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Yielding Assets'),

      //   $column(layoutSheet.spacing, style({ flex: 2 }))(
      //     screenUtils.isDesktopScreen
      //       ? $row(layoutSheet.spacingBig, style({ color: pallete.foreground, fontSize: '.75em' }))(
      //         $text(style({ flex: 1 }))('Holdings'),
      //         $row(layoutSheet.spacingBig, style({ flex: 3 }))(
      //           $text(style({ flex: 1 }))('Price History'),
      //           $text(style({ flex: 1, maxWidth: '300px' }))('Distribution')
      //         ),
      //       ) : empty(),
      //     $column(layoutSheet.spacingBig)(
      //       $AssetDetails({
      //         label: 'GMX',
      //         symbol: 'GMX',
      //         chain: CHAIN.ARBITRUM,
      //         asset: gmxAsset,
      //         priceChart: gmxArbitrumRS,
      //         $distribution: switchLatest(map(({ bnGmxInFeeGmx, bonusGmxInFeeGmx, gmxAprForEthPercentage, gmxAprForEsGmxPercentage }) => {
      //           const boostBasisPoints = formatFixed(bnGmxInFeeGmx * BASIS_POINTS_DIVISOR / bonusGmxInFeeGmx, 2)

      //           return $column(layoutSheet.spacingSmall, style({ flex: 1, }))(
      //             $metricEntry(`esGMX`, `${formatFixed(gmxAprForEsGmxPercentage, 2)}%`),
      //             $metricEntry(`ETH`, `${formatFixed(gmxAprForEthPercentage, 2)}%`),
      //             $metricEntry(`Compounding Bonus`, `${boostBasisPoints}%`),
      //             $metricEntry(`Compounding Multiplier`, `${readableNumber(formatFixed(bnGmxInFeeGmx, 18))}`),
      //           )
      //         }, arbitrumStakingRewards)),
      //         $iconPath: $tokenIconMap[TOKEN_SYMBOL.GMX],
      //       })({}),
      //       $seperator2,
      //       $AssetDetails({
      //         label: 'GLP',
      //         symbol: 'GLP',
      //         chain: CHAIN.ARBITRUM,
      //         asset: glpArbiAsset,
      //         priceChart: glpArbitrumRS,
      //         $distribution: switchLatest(map(({ glpAprForEsGmxPercentage, glpAprForEthPercentage, }) => {

      //           return $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
      //             $metricEntry(`esGMX`, `${formatFixed(glpAprForEsGmxPercentage, 2)}%`),
      //             $metricEntry(`ETH`, `${formatFixed(glpAprForEthPercentage, 2)}%`),
      //           )
      //         }, arbitrumStakingRewards)),
      //         $iconPath: $tokenIconMap[TOKEN_SYMBOL.GLP],
      //       })({}),
      //       $seperator2,
      //       $AssetDetails({
      //         label: 'GLP',
      //         symbol: 'GLP',
      //         chain: CHAIN.AVALANCHE,
      //         asset: glpAvaxAsset,
      //         priceChart: glpAvalancheRS,
      //         $distribution: switchLatest(map(({ glpAprForEsGmxPercentage, glpAprForEthPercentage, }) => {

      //           return $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
      //             $metricEntry(`esGMX`, `${formatFixed(glpAprForEsGmxPercentage, 2)}%`),
      //             $metricEntry(`AVAX`, `${formatFixed(glpAprForEthPercentage, 2)}%`),
      //           )
      //         }, avalancheStakingRewards)),
      //         $iconPath: $tokenIconMap[TOKEN_SYMBOL.GLP],
      //       })({}),
      //     ),
      //   ),
      // ),

      $node(),


      $column(layoutSheet.spacing)(
        $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Treasury Vaults'),
        $node(
          $text('The Treasury Vaults are secured using a Multi-Signature using a 4/7 threshold allowing full control to perform actions like Staking for yield, Asset Rebalancing and more. powered by '),
          $anchor(style({ display: 'inline' }), attr({ href: 'https://gnosis.io/safe/' }))($text('Gnosis Safe')),
        ),

        $node(),


        $row(layoutSheet.spacing, style({ alignItems: 'center', placeContent: 'center' }))(
          $row(layoutSheet.spacingSmall)(
            $anchor(attr({ href: getDebankProfileUrl(GBC_ADDRESS.TREASURY_ARBITRUM) }))(
              $element('img')(attr({ src: `/assets/chain/${CHAIN.ARBITRUM}.svg` }), style({ width: '38px', padding: '3px', borderRadius: '50%', backgroundColor: pallete.background }))(),
              $AccountLabel(GBC_ADDRESS.TREASURY_ARBITRUM),
            )
          ),

          $row(layoutSheet.spacingSmall)(
            $anchor(attr({ href: getDebankProfileUrl(GBC_ADDRESS.TREASURY_AVALANCHE) }))(
              $element('img')(attr({ src: `/assets/chain/${CHAIN.AVALANCHE}.svg` }), style({ width: '38px', padding: '3px', borderRadius: '50%', backgroundColor: pallete.background }))(),
              $AccountLabel(GBC_ADDRESS.TREASURY_AVALANCHE),
            )
          ),

        ),

        $seperator2,

        $row(layoutSheet.spacingBig)(
          $text(style({ color: pallete.foreground }))('Signers:'),
          switchLatest(map(res => {

            return $row(layoutSheet.spacingBig, style({ alignSelf: 'stretch', flex: 1, placeContent: 'space-evenly', flexWrap: 'wrap' }))(
              ...res.map((token, idx) => {
                const member = members[idx]

                return $teamMember({ ...member, token } as any)
              })
            )
          }, awaitPromises(blueberrySubgraph.tokenListSpecific(now(members.map(t => t.tokenId))))))
        )



      ),

    )
  ]
})




