// import { Behavior, O } from "@aelea/core"
// import { $Node, $text, component, motion, MOTION_NO_WOBBLE, NodeComposeFn, style, styleBehavior } from "@aelea/dom"
// import { $column, $icon, $NumberTicker, $row, $seperator, layoutSheet, screenUtils } from "@aelea/ui-components"
// import { pallete } from "@aelea/ui-components-theme"
// import { map, merge, multicast, now, skip, skipRepeats, startWith, switchLatest } from "@most/core"
// import { Stream } from "@most/types"
// import {
//   formatFixed, formatReadableUSD, isTradeSettled, readableNumber,
//   isTradeLiquidated, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, ITrade, IPricefeedParamApi, IChainParamApi, getDeltaPercentage, bnDiv, getPnL
// } from "@gambitdao/gmx-middleware"
// import { ChartOptions, DeepPartial, MouseEventParams } from "lightweight-charts"
// import { $bull, $bear, $target, $RiskLiquidator, $tokenIconMap } from "@gambitdao/ui-components"


// export interface ITradeCardPreview {
//   trade: ITrade,
//   chain: IChainParamApi['chain'],

//   $container?: NodeComposeFn<$Node>,
//   chartConfig?: DeepPartial<ChartOptions>
//   latestPrice: Stream<bigint>

//   animatePnl?: boolean
// }



// export const $TradeCardPreview = ({
//   trade,
//   $container = $column,
//   chartConfig = {},
//   chain,
//   latestPrice,
//   animatePnl = true
// }: ITradeCardPreview) => component((
//   [accountPreviewClick, accountPreviewClickTether]: Behavior<string, string>,
//   [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
//   [requestTradePricefeed, requestTradePricefeedTether]: Behavior<IPricefeedParamApi, IPricefeedParamApi>,

//   // [chartPreviewHoverPnl, chartPreviewHoverPnlTether]: Behavior<IPositionDelta, IPositionDelta>,
// ) => {


//   // const latestPrice = latestPriceMap ? replayLatest(multicast(combineArray((trade, priceMap) => {
//   //   if (isTradeOpen(trade)) {
//   //     const latest = priceMap[trade.indexToken]
//   //     return latest.value
//   //   }

//   //   return isTradeClosed(trade) ? trade.decreaseList[trade.decreaseList.length - 1].price : trade.liquidatedPosition.markPrice
//   // }, tradeState, latestPriceMap))) : map(feed => feed[feed.length - 1].c, pricefeed)





//   const tickerStyle = style({
//     lineHeight: 1,
//     fontWeight: "bold",
//     zIndex: 10,
//     position: 'relative'
//   })


//   const pnlCrossHairChange = map((cross: MouseEventParams) => {
//     return cross?.seriesPrices?.size
//   }, crosshairMove)

//   const pnlCrosshairMoveMode = skipRepeats(pnlCrossHairChange)

//   const crosshairWithInitial = startWith(null, pnlCrosshairMoveMode)

//   const hoverChartPnl = multicast(switchLatest(map((chartCxChange) => {
//     if (chartCxChange) {
//       return now(chartCxChange)
//     }

//     if (isTradeSettled(trade)) {
//       return now(formatFixed(trade.realisedPnl - trade.fee, 30))
//     }

//     return map(price => {
//       const delta = getPnL(trade.isLong, trade.averagePrice, price, trade.size)
//       const deltaPercentage = getDeltaPercentage(delta, trade.collateral)

//       return formatFixed(delta + trade.realisedPnl - trade.fee, 30)
//     }, latestPrice)

//   }, crosshairWithInitial)))



//   const chartRealisedPnl = map(ss => ss, hoverChartPnl)
//   const chartPnlPercentage = map(ss => ss, hoverChartPnl)

//   function tradeTitle(trade: ITrade): string {
//     const isSettled = isTradeSettled(trade)

//     if (isSettled) {
//       return isSettled ? isTradeLiquidated(trade) ? 'LIQUIDATED' : 'CLOSED' : ''
//     }

//     return 'OPEN'
//   }

//   const isSettled = isTradeSettled(trade)

//   const newLocal_1 = CHAIN_TOKEN_ADDRESS_TO_SYMBOL[trade.indexToken]
//   const newLocal = $tokenIconMap[newLocal_1]
//   return [
//     $container(


//       $column(
//         $row(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center', fontFamily: 'RelativePro', padding: screenUtils.isDesktopScreen ? '25px 35px 0px' : '35px 35px 0px', zIndex: 11 }))(
//           $row(style({ fontFamily: 'RelativeMono', alignItems: 'center', placeContent: 'space-evenly' }))(
//             $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
//               $row(
//                 style({ borderRadius: '2px', padding: '4px', backgroundColor: pallete.message, })(
//                   $icon({
//                     $content: trade.isLong ? $bull : $bear,
//                     width: '38px',
//                     fill: pallete.background,
//                     viewBox: '0 0 32 32',
//                   })
//                 )
//               ),
//               $column(style({ gap: '6px' }))(
//                 $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
//                   $icon({
//                     $content: newLocal,
//                     viewBox: '0 0 32 32',
//                     width: '18px'
//                   }),
//                   $text(formatReadableUSD(trade.averagePrice))
//                 ),
//                 $row(layoutSheet.spacingSmall, style({ color: isSettled ? '' : pallete.indeterminate, fontSize: '.65em' }))(
//                   $text(tradeTitle(trade)),
//                   $row(style({ gap: '3px', alignItems: 'baseline' }))(
//                     $icon({
//                       $content: $target,
//                       width: '10px',
//                       fill: isSettled ? '' : pallete.indeterminate,
//                       viewBox: '0 0 32 32'
//                     }),
//                     $text(style(isSettled ? {} : { color: pallete.indeterminate }))(
//                       merge(
//                         now('Loading...'),
//                         map(price => {
//                           return readableNumber(formatFixed(price, 30))
//                         }, latestPrice)
//                       )
//                     )
//                   )
//                 ),
//               )
//             ),
//           ),

//           style({ alignSelf: 'stretch' }, $seperator),

//           !isSettled
//             ? $RiskLiquidator(trade, latestPrice)({})
//             : $column(layoutSheet.spacingTiny, style({ textAlign: 'center' }))(
//               $text(formatReadableUSD(trade.size)),
//               $seperator,
//               style({ textAlign: 'center', fontSize: '.65em' }, $text(style({ fontWeight: 'bold' }))(`${readableNumber(bnDiv(trade.size, trade.collateral))}x`)),
//             ),


//           // $row(style({ flex: 1 }))(),

//           // switchLatest(map(cMap => {
//           //   return $AccountPreview({ ...accountPreview, chain, address: trade.account, claim: cMap[trade.account.toLowerCase()] })({
//           //     profileClick: accountPreviewClickTether()
//           //   })
//           // }, claimMap)),


//         ),

//         $row(layoutSheet.spacing, style({ alignItems: 'baseline', placeContent: 'center', pointerEvents: 'none' }))(
//           $row(style({ fontSize: '2.25em', alignItems: 'baseline', paddingTop: '26px', paddingBottom: '26px' }))(
//             animatePnl
//               ? style({
//                 lineHeight: 1,
//                 fontWeight: "bold",
//                 zIndex: 10,
//                 position: 'relative'
//               })(
//                 $NumberTicker({
//                   value$: map(Math.round, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, chartRealisedPnl)),
//                   incrementColor: pallete.positive,
//                   decrementColor: pallete.negative
//                 })
//               )
//               : $text(tickerStyle, styleBehavior(map(pnl => ({ color: pnl > 0 ? pallete.positive : pallete.negative }), chartRealisedPnl)))(map(O(Math.floor, x => `${x > 0 ? '+' : ''}` + x.toLocaleString()), chartRealisedPnl)),
//             $text(style({ fontSize: '.75em', color: pallete.foreground }))('$'),
//           ),
//           // $liquidationSeparator(liqPercentage),
//           $row(style({ fontSize: '1.75em', alignItems: 'baseline' }))(
//             $text(style({ color: pallete.foreground }))('('),
//             animatePnl
//               ? tickerStyle(
//                 $NumberTicker({
//                   value$: map(Math.round, skip(1, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, chartPnlPercentage))),
//                   incrementColor: pallete.positive,
//                   decrementColor: pallete.negative
//                 })
//               )
//               : $text(tickerStyle, styleBehavior(map(pnl => ({ color: pnl > 0 ? pallete.positive : pallete.negative }), chartPnlPercentage)))(map(O(Math.floor, n => `${n > 0 ? '+' : ''}` + n), chartPnlPercentage)),
//             $text(tickerStyle, style({ color: pallete.foreground }))('%'),
//             $text(style({ color: pallete.foreground }))(')'),
//           ),
//         ),

//         // $TradePnlHistory({ trade, latestPrice, pricefeed })({
//         //   // pnlCrossHairChange: pnlCrosshairMoveTether(),
//         //   // requestTradePricefeed: requestTradePricefeedTether(),
//         //   crosshairMove: crosshairMoveTether()
//         // })
//       ),

//     ),

//     {
//       accountPreviewClick
//     }
//   ]
// })


