// import { Behavior, combineArray, replayLatest } from "@aelea/core"
// import { $element, $node, $text, attr, component, style } from "@aelea/dom"
// import { Route } from "@aelea/router"
// import { $column, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
// import { pallete } from "@aelea/ui-components-theme"
// import { GBC_ADDRESS, BI_18_PRECISION } from "@gambitdao/gbc-middleware"
// import { intervalTimeMap, formatFixed, ARBITRUM_ADDRESS, BASIS_POINTS_DIVISOR, IAccountQueryParamApi, ITimerangeParamApi, CHAIN, getAccountExplorerUrl, TOKEN_SYMBOL, readableNumber, AVALANCHE_ADDRESS } from "@gambitdao/gmx-middleware"
// import { IWalletLink } from "@gambitdao/wallet-link"
// import { $anchor, $tokenIconMap } from "@gambitdao/ui-components"
// import { combine, empty, fromPromise, map, multicast, switchLatest, take } from "@most/core"
// import { $responsiveFlex } from "../elements/$common"
// import { queryArbitrumRewards, queryAvalancheRewards } from "../logic/query"
// import { IAsset, ITreasuryStore } from "@gambitdao/gbc-middleware"
// import { $StakingGraph } from "../components/$StakingGraph"
// import { arbitrumContract, avalancheContract } from "../logic/gbcTreasury"
// import { Stream } from "@most/types"
// import { $berryById, priceFeedHistoryInterval } from "../logic/common"
// import { $accountPreview } from "../components/$AccountProfile"
// import { $metricEntry, $seperator2 } from "./common"
// import { BrowserStore } from "../logic/store"
// import { $AssetDetails } from "../components/$AssetDetails"

// const GRAPHS_INTERVAL = Math.floor(intervalTimeMap.HR4)

// export interface ITreasury {
//   walletLink: IWalletLink
//   parentRoute: Route
//   treasuryStore: BrowserStore<"ROOT.v1.treasuryStore", ITreasuryStore>
// }




// export const $Treasury = ({ walletLink, parentRoute, treasuryStore }: ITreasury) => component((
//   [trasnferPopup, trasnferPopupTether]: Behavior<any, any>,
// ) => {


//   const queryParams: IAccountQueryParamApi & Partial<ITimerangeParamApi> = {
//     from: treasuryStore.getState().startedStakingGmxTimestamp || undefined,
//     account: GBC_ADDRESS.TREASURY_ARBITRUM
//   }


//   const arbitrumStakingRewards = replayLatest(multicast(arbitrumContract.stakingRewards))
//   const avalancheStakingRewards = replayLatest(multicast(avalancheContract.stakingRewards))

//   const pricefeedQuery = replayLatest(multicast(fromPromise(gmxGlpPriceHistory(queryParams))))

//   const arbitrumYieldSourceMap = replayLatest(multicast(fromPromise(queryArbitrumRewards(queryParams))))
//   const avalancheYieldSourceMap = replayLatest(multicast(fromPromise(queryAvalancheRewards({ ...queryParams, account: GBC_ADDRESS.TREASURY_AVALANCHE }))))



//   const ethAsset: Stream<IAsset> = combine((bn, priceMap) => ({ balance: bn.gmxInStakedGmxUsd, balanceUsd: bn.gmxInStakedGmxUsd * priceMap.gmx.value / BI_18_PRECISION }), arbitrumStakingRewards, latestTokenPriceMap)
//   const gmxAsset: Stream<IAsset> = combine((bn, priceMap) => {
//     return { balance: bn.gmxInStakedGmx, balanceUsd: bn.gmxInStakedGmx * priceMap.gmx.value / BI_18_PRECISION }
//   }, arbitrumStakingRewards, latestTokenPriceMap)
//   const glpArbiAsset: Stream<IAsset> = combine((bn, priceMap) => ({ balance: bn.glpBalance, balanceUsd: priceMap.glpArbitrum.value * bn.glpBalance / BI_18_PRECISION }), arbitrumStakingRewards, latestTokenPriceMap)
//   const glpAvaxAsset: Stream<IAsset> = combine((bn, priceMap) => ({ balance: bn.glpBalance, balanceUsd: priceMap.glpArbitrum.value * bn.glpBalance / BI_18_PRECISION }), avalancheStakingRewards, latestTokenPriceMap)



//   const feeYieldClaim = combineArray((arbiStaking, avaxStaking) => [...avaxStaking, arbiStaking], arbitrumYieldSourceMap, avalancheYieldSourceMap)
//   // const newLocal = take(1, latestTokenPriceMap)
//   const yieldClaim = combineArray((arbiStaking, avaxStaking) => {
//     // amountUsd from avalanche is not reflecting the real amount because the subraph's gmx price is 0
//     // to fix this, we'll fetch arbitrum's price of GMX instead

//     return [
//       ...arbiStaking,
//       ...avaxStaking
//       // ...yieldFeeList,
//     ]
//   }, arbitrumYieldSourceMap, avalancheYieldSourceMap)


//   const gmxArbitrumRS = priceFeedHistoryInterval(
//     GRAPHS_INTERVAL,
//     map(feedMap => feedMap.gmx, pricefeedQuery),
//     map(staking => staking.filter(s => s.tokenAdress === ARBITRUM_ADDRESS.GMX || s.tokenAdress === ARBITRUM_ADDRESS.ES_GMX), arbitrumYieldSourceMap)
//   )

//   const glpArbitrumRS = priceFeedHistoryInterval(
//     GRAPHS_INTERVAL,
//     map(feedMap => feedMap.glpArbitrum, pricefeedQuery),
//     map(staking => staking.filter(s => s.tokenAdress === ARBITRUM_ADDRESS.GLP), arbitrumYieldSourceMap)
//   )

//   const glpAvalancheRS = priceFeedHistoryInterval(
//     GRAPHS_INTERVAL,
//     map(feedMap => feedMap.glpAvalanche, pricefeedQuery),
//     map(staking => staking.filter(s => s.tokenAdress === AVALANCHE_ADDRESS.GLP), avalancheYieldSourceMap)
//   )


//   return [
//     $column(layoutSheet.spacingBig)(

//     //   $StakingGraph({
//     //     sourceMap: [gmxArbitrumRS, glpArbitrumRS, glpAvalancheRS],
//     //     // stakingYield: yieldClaim,
//     //     arbitrumStakingRewards,
//     //     avalancheStakingRewards,
//     //     walletLink,
//     //     priceFeedHistoryMap: pricefeedQuery,
//     //     graphInterval: GRAPHS_INTERVAL,
//     //   })({}),

//       $node(),


//       $column(layoutSheet.spacing, style({}))(
//         $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Yielding Assets'),

//         $column(layoutSheet.spacing, style({ flex: 2 }))(
//           screenUtils.isDesktopScreen
//             ? $row(layoutSheet.spacingBig, style({ color: pallete.foreground, fontSize: '.75em' }))(
//               $text(style({ flex: 1 }))('Holdings'),
//               $row(layoutSheet.spacingBig, style({ flex: 3 }))(
//                 $text(style({ flex: 1 }))('Price History'),
//                 $text(style({ flex: 1, maxWidth: '300px' }))('Distribution')
//               ),
//             ) : empty(),
//           $column(layoutSheet.spacingBig)(
//             $AssetDetails({
//               label: 'GMX',
//               symbol: 'GMX',
//               chain: CHAIN.ARBITRUM,
//               asset: gmxAsset,
//               priceChart: gmxArbitrumRS,
//               $distribution: switchLatest(map(({ bnGmxInFeeGmx, bonusGmxInFeeGmx, gmxAprForEthPercentage, gmxAprForEsGmxPercentage }) => {
//                 const boostBasisPoints = formatFixed(bnGmxInFeeGmx * BASIS_POINTS_DIVISOR / bonusGmxInFeeGmx, 2)

//                 return $column(layoutSheet.spacingSmall, style({ flex: 1, }))(
//                   $metricEntry(`esGMX`, `${formatFixed(gmxAprForEsGmxPercentage, 2)}%`),
//                   $metricEntry(`ETH`, `${formatFixed(gmxAprForEthPercentage, 2)}%`),
//                   $metricEntry(`Compounding Bonus`, `${boostBasisPoints}%`),
//                   $metricEntry(`Compounding Multiplier`, `${readableNumber(formatFixed(bnGmxInFeeGmx, 18))}`),
//                 )
//               }, arbitrumStakingRewards)),
//               $iconPath: $tokenIconMap[TOKEN_SYMBOL.GMX],
//             })({}),
//             $seperator2,
//             $AssetDetails({
//               label: 'GLP',
//               symbol: 'GLP',
//               chain: CHAIN.ARBITRUM,
//               asset: glpArbiAsset,
//               priceChart: glpArbitrumRS,
//               $distribution: switchLatest(map(({ glpAprForEsGmxPercentage, glpAprForEthPercentage, }) => {

//                 return $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
//                   $metricEntry(`esGMX`, `${formatFixed(glpAprForEsGmxPercentage, 2)}%`),
//                   $metricEntry(`ETH`, `${formatFixed(glpAprForEthPercentage, 2)}%`),
//                 )
//               }, arbitrumStakingRewards)),
//               $iconPath: $tokenIconMap[TOKEN_SYMBOL.GLP],
//             })({}),
//             $seperator2,
//             $AssetDetails({
//               label: 'GLP',
//               symbol: 'GLP',
//               chain: CHAIN.AVALANCHE,
//               asset: glpAvaxAsset,
//               priceChart: glpAvalancheRS,
//               $distribution: switchLatest(map(({ glpAprForEsGmxPercentage, glpAprForEthPercentage, }) => {

//                 return $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
//                   $metricEntry(`esGMX`, `${formatFixed(glpAprForEsGmxPercentage, 2)}%`),
//                   $metricEntry(`AVAX`, `${formatFixed(glpAprForEthPercentage, 2)}%`),
//                 )
//               }, avalancheStakingRewards)),
//               $iconPath: $tokenIconMap[TOKEN_SYMBOL.GLP],
//             })({}),
//           ),
//         ),
//       ),

//       $node(),


//       $column(layoutSheet.spacing)(
//         $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Treasury Vaults'),
//         $node(
//           $text('The Treasury Vaults are secured using a Multi-Signature using a 4/7 threshold allowing full control to perform actions like Staking for yield, Asset Rebalancing and more. powered by '),
//           $anchor(style({ display: 'inline' }), attr({ href: 'https://gnosis.io/safe/' }))($text('Gnosis Safe')),
//         ),

//         $node(),

//         $responsiveFlex(layoutSheet.spacing, style({ alignItems: 'center', placeContent: 'space-between' }))(
//           $row(layoutSheet.spacingSmall)(
//             $accountPreview({
//               address: GBC_ADDRESS.TREASURY_ARBITRUM,
//             }),
//             $anchor(attr({ href: getAccountExplorerUrl(CHAIN.ARBITRUM, GBC_ADDRESS.TREASURY_ARBITRUM) }))(
//               $element('img')(attr({ src: `/assets/chain/${CHAIN.ARBITRUM}.svg` }), style({ width: '28px', padding: '3px', borderRadius: '50%', backgroundColor: pallete.background }))()
//             ),
//           ),

//           $row(layoutSheet.spacingBig)(
//             $text(style({ color: pallete.foreground }))('Signers:'),
//             $teamSigner('xm92boi', 16),
//             $teamSigner('IrvingDev_', 140),
//             $teamSigner('APP0D14L', 11),
//             $teamSigner('kingblockchain', 4825),
//             $teamSigner('itburnzz', 12),
//             $teamSigner('B2F_zer', 22),
//             $teamSigner('xdev_10', 6),
//           )
//         ),

//         $seperator2,

//         $responsiveFlex(layoutSheet.spacing, style({ alignItems: 'center', placeContent: 'space-between' }))(
//           $row(layoutSheet.spacingSmall)(
//             $accountPreview({
//               address: GBC_ADDRESS.TREASURY_AVALANCHE,
//             }),
//             $anchor(attr({ href: getAccountExplorerUrl(CHAIN.AVALANCHE, GBC_ADDRESS.TREASURY_AVALANCHE) }))(
//               $element('img')(attr({ src: `/assets/chain/${CHAIN.AVALANCHE}.svg` }), style({ width: '28px', padding: '3px', borderRadius: '50%', backgroundColor: pallete.background }))()
//             )
//           ),


//           $row(layoutSheet.spacingBig)(
//             $text(style({ color: pallete.foreground }))('Signers:'),
//             $teamSigner('xm92boi', 16),
//             $teamSigner('IrvingDev_', 140),
//             $teamSigner('APP0D14L', 11),
//             $teamSigner('kingblockchain', 4825),
//             $teamSigner('itburnzz', 12),
//             $teamSigner('B2F_zer', 22),
//             $teamSigner('xdev_10', 6),
//           )
//         ),



//       ),

//     )
//   ]
// })

// export const $teamSigner = (name: string, id: number) => $row(layoutSheet.spacingTiny, style({ alignItems: 'center', fontSize: screenUtils.isDesktopScreen ? '' : '65%' }))(
//   $berryById(id, 22),
//   $anchor(attr(({ href: `https://twitter.com/${name}` })), style({ fontWeight: 900, textDecoration: 'none', fontSize: '.75em' }))($text(`@${name}`)),
// )



