import { Behavior, combineArray, O } from "@aelea/core"
import { $Node, $text, component, INode, motion, MOTION_NO_WOBBLE, NodeComposeFn, style, styleBehavior } from "@aelea/dom"
import { $column, $icon, $NumberTicker, $row, $seperator, layoutSheet, observer, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { combine, empty, filter, fromPromise, map, merge, multicast, now, scan, skip, skipRepeats, skipRepeatsWith, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import {
  calculatePositionDelta, formatFixed, formatReadableUSD, IPricefeed, intervalListFillOrderMap, isTradeSettled, readableNumber,
  unixTimeTzOffset, isTradeLiquidated, IPositionDelta, isTradeClosed, unixTimestampNow, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, getLeverage, ITrade, IPricefeedParamApi, CHAIN, IChainParamApi, query, fromJson, isTradeOpen
} from "@gambitdao/gmx-middleware"
import { ChartOptions, DeepPartial, LineStyle, MouseEventParams, SeriesMarker, SingleValueData, Time } from "lightweight-charts"
import { $bull, $bear, $target, $RiskLiquidator, $tokenIconMap, getPricefeedVisibleColumns } from "@gambitdao/ui-components"
import { $Chart } from "../chart/$Chart"

interface IPricefeedTick extends IPositionDelta {
  value: number
  time: number
  price: bigint
  size: bigint
  collateral: bigint
  averagePrice: bigint
}

export interface ITradeCardPreview {
  trade: ITrade,
  chain: IChainParamApi['chain'],

  $container?: NodeComposeFn<$Node>,
  chartConfig?: DeepPartial<ChartOptions>
  latestPrice: Stream<bigint>

  animatePnl?: boolean
}

const hasSeriesFn = (cross: MouseEventParams): boolean => {
  const mode = !!cross?.seriesPrices?.size
  return mode
}

export const $TradeCardPreview = ({
  trade,
  $container = $column,
  chartConfig = {},
  chain,
  latestPrice,
  animatePnl = true
}: ITradeCardPreview) => component((
  [accountPreviewClick, accountPreviewClickTether]: Behavior<string, string>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [requestTradePricefeed, requestTradePricefeedTether]: Behavior<IPricefeedParamApi, IPricefeedParamApi>,

  // [chartPreviewHoverPnl, chartPreviewHoverPnlTether]: Behavior<IPositionDelta, IPositionDelta>,
) => {


  // const latestPrice = latestPriceMap ? replayLatest(multicast(combineArray((trade, priceMap) => {
  //   if (isTradeOpen(trade)) {
  //     const latest = priceMap[trade.indexToken]
  //     return latest.value
  //   }

  //   return isTradeClosed(trade) ? trade.decreaseList[trade.decreaseList.length - 1].price : trade.liquidatedPosition.markPrice
  // }, tradeState, latestPriceMap))) : map(feed => feed[feed.length - 1].c, pricefeed)





  const tickerStyle = style({
    lineHeight: 1,
    fontWeight: "bold",
    zIndex: 10,
    position: 'relative'
  })


  const pnlCrossHairChange = filter(hasSeriesFn, crosshairMove)

  const pnlCrosshairMoveMode = skipRepeats(map(hasSeriesFn, crosshairMove))

  const crosshairWithInitial = startWith(false, pnlCrosshairMoveMode)

  const hoverChartPnl: Stream<IPositionDelta> = multicast(switchLatest(combineArray((trade) => {

    if (isTradeSettled(trade)) {
      return now({ delta: trade.realisedPnl - trade.fee, deltaPercentage: trade.realisedPnlPercentage })
    }

    return map(price => calculatePositionDelta(price, trade.averagePrice, trade.isLong, trade), latestPrice)

    // if (isMoveringChart) {
    //   return map(cross => {
    //     return historicPnl.find(tick => cross.time === tick.time)!
    //   }, pnlCrosshairMove)
    // } else {

    // }
  }, now(trade))))



  const chartRealisedPnl = map(ss => formatFixed(ss.delta, 30), hoverChartPnl)
  const chartPnlPercentage = map(ss => formatFixed(ss.deltaPercentage, 2), hoverChartPnl)

  function tradeTitle(trade: ITrade): string {
    const isSettled = isTradeSettled(trade)

    if (isSettled) {
      return isSettled ? isTradeLiquidated(trade) ? 'LIQUIDATED' : 'CLOSED' : ''
    }

    return 'OPEN'
  }

  const isSettled = isTradeSettled(trade)

  return [
    $container(


      $column(
        $row(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center', fontFamily: 'RelativePro', padding: screenUtils.isDesktopScreen ? '25px 35px 0px' : '35px 35px 0px', zIndex: 11 }))(
          $row(style({ fontFamily: 'RelativeMono', alignItems: 'center', placeContent: 'space-evenly' }))(
            $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
              $row(
                style({ borderRadius: '2px', padding: '4px', backgroundColor: pallete.message, })(
                  $icon({
                    $content: trade.isLong ? $bull : $bear,
                    width: '38px',
                    fill: pallete.background,
                    viewBox: '0 0 32 32',
                  })
                )
              ),
              $column(style({ gap: '6px' }))(
                $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                  $icon({
                    $content: $tokenIconMap[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[trade.indexToken]],
                    viewBox: '0 0 32 32',
                    width: '18px'
                  }),
                  $text(formatReadableUSD(trade.averagePrice))
                ),
                $row(layoutSheet.spacingSmall, style({ color: isSettled ? '' : pallete.indeterminate, fontSize: '.65em' }))(
                  $text(tradeTitle(trade)),
                  $row(style({ gap: '3px', alignItems: 'baseline' }))(
                    $icon({
                      $content: $target,
                      width: '10px',
                      fill: isSettled ? '' : pallete.indeterminate,
                      viewBox: '0 0 32 32'
                    }),
                    $text(style(isSettled ? {} : { color: pallete.indeterminate }))(
                      merge(
                        now('Loading...'),
                        map(price => {
                          return readableNumber(formatFixed(price, 30))
                        }, latestPrice)
                      )
                    )
                  )
                ),
              )
            ),
          ),

          style({ alignSelf: 'stretch' }, $seperator),

          !isSettled
            ? $RiskLiquidator(trade, latestPrice)({})
            : $column(layoutSheet.spacingTiny, style({ textAlign: 'center' }))(
              $text(formatReadableUSD(trade.size)),
              $seperator,
              style({ textAlign: 'center', fontSize: '.65em' }, $text(style({ fontWeight: 'bold' }))(`${readableNumber(getLeverage(trade))}x`)),
            ),


          // $row(style({ flex: 1 }))(),

          // switchLatest(map(cMap => {
          //   return $AccountPreview({ ...accountPreview, chain, address: trade.account, claim: cMap[trade.account.toLocaleLowerCase()] })({
          //     profileClick: accountPreviewClickTether()
          //   })
          // }, claimMap)),


        ),

        $row(layoutSheet.spacing, style({ alignItems: 'baseline', placeContent: 'center', pointerEvents: 'none' }))(
          $row(style({ fontSize: '2.25em', alignItems: 'baseline', paddingTop: '26px', paddingBottom: '26px' }))(
            animatePnl
              ? style({
                lineHeight: 1,
                fontWeight: "bold",
                zIndex: 10,
                position: 'relative'
              })(
                $NumberTicker({
                  value$: map(Math.round, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, chartRealisedPnl)),
                  incrementColor: pallete.positive,
                  decrementColor: pallete.negative
                })
              )
              : $text(tickerStyle, styleBehavior(map(pnl => ({ color: pnl > 0 ? pallete.positive : pallete.negative }), chartRealisedPnl)))(map(O(Math.floor, x => `${x > 0 ? '+' : ''}` + x.toLocaleString()), chartRealisedPnl)),
            $text(style({ fontSize: '.75em', color: pallete.foreground }))('$'),
          ),
          // $liquidationSeparator(liqPercentage),
          $row(style({ fontSize: '1.75em', alignItems: 'baseline' }))(
            $text(style({ color: pallete.foreground }))('('),
            animatePnl
              ? tickerStyle(
                $NumberTicker({
                  value$: map(Math.round, skip(1, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, chartPnlPercentage))),
                  incrementColor: pallete.positive,
                  decrementColor: pallete.negative
                })
              )
              : $text(tickerStyle, styleBehavior(map(pnl => ({ color: pnl > 0 ? pallete.positive : pallete.negative }), chartPnlPercentage)))(map(O(Math.floor, n => `${n > 0 ? '+' : ''}` + n), chartPnlPercentage)),
            $text(tickerStyle, style({ color: pallete.foreground }))('%'),
            $text(style({ color: pallete.foreground }))(')'),
          ),
        ),

        $TradePnlHistory({ trade, latestPrice, chain })({
          // pnlCrossHairChange: pnlCrosshairMoveTether(),
          // requestTradePricefeed: requestTradePricefeedTether(),
          crosshairMove: crosshairMoveTether()
        })
      ),

    ),

    {
      accountPreviewClick
    }
  ]
})


interface ITradePnlPreview {
  trade: ITrade
  latestPrice: Stream<bigint>
  chain: IChainParamApi['chain'],
  chartConfig?: DeepPartial<ChartOptions>
  pixelsPerBar?: number
}

export const $TradePnlHistory = ({ trade, latestPrice, pixelsPerBar = 5, chartConfig = {}, chain }: ITradePnlPreview) => component((
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [containerDimension, sampleContainerDimension]: Behavior<INode, ResizeObserverEntry[]>
) => {

  const displayColumnCount = map(([container]) => container.contentRect.width / pixelsPerBar, containerDimension)

  const to = unixTimestampNow()
  const from = trade.timestamp

  const intervalTime = getPricefeedVisibleColumns(160, from, to)
  const params = { tokenAddress: '_' + trade.indexToken, interval: '_' + intervalTime, from, to }

  const queryFeed = fromPromise(query.graphClientMap[chain](query.document.pricefeed, params as any, { requestPolicy: 'network-only' }))
  const priceFeedQuery = map(res => res.pricefeeds.map(fromJson.pricefeedJson), queryFeed)

  const historicPnL = combineArray((feed, displayColumnCount) => {

    if (feed.length < 2) {
      throw new Error('no error to build a chart preview')
    }

    const startPrice = trade.increaseList[0].price
    const endtime = isTradeSettled(trade) ? trade.settledTimestamp : unixTimestampNow()
    const timeRange = endtime - trade.timestamp
    const intervalTime = Math.floor(timeRange / displayColumnCount)
    const startDelta = calculatePositionDelta(trade.increaseList[0].price, trade.averagePrice, trade.isLong, trade)
    const initalUpdate = trade.updateList[0]

    const initialTick: IPricefeedTick = {
      time: trade.timestamp,
      price: startPrice,
      value: formatFixed(startDelta.delta, 30),
      collateral: initalUpdate.collateral,
      size: initalUpdate.size,
      averagePrice: initalUpdate.averagePrice,
      ...startDelta
    }


    const data = intervalListFillOrderMap({
      source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList],
      interval: intervalTime,
      seed: initialTick,
      getTime: x => x.timestamp,
      fillMap: (prev, next) => {

        if (next.__typename === 'UpdatePosition') {
          const delta = calculatePositionDelta(next.markPrice, trade.averagePrice, trade.isLong, next)
          const value = formatFixed(delta.delta, 30)

          return { ...prev, ...delta, value, price: next.markPrice, collateral: next.collateral, size: next.size, averagePrice: next.averagePrice }
        }

        const delta = calculatePositionDelta(next.c, prev.averagePrice, trade.isLong, prev)
        const value = formatFixed(delta.delta, 30)


        return { ...prev, ...delta, value }
      }
    })


    if (isTradeClosed(trade)) {
      const prev = data[data.length - 1]
      const price = trade.decreaseList[trade.decreaseList.length - 1].price
      const delta = calculatePositionDelta(price, trade.averagePrice, trade.isLong, trade)

      data.push({ ...prev, ...delta, time: trade.closedPosition.timestamp })
    } else if (isTradeLiquidated(trade)) {
      const prev = data[data.length - 1]
      const price = trade.liquidatedPosition.markPrice
      const delta = calculatePositionDelta(price, trade.averagePrice, trade.isLong, trade)
      data.push({ ...prev, ...delta, time: trade.liquidatedPosition.timestamp })
    }

    return { data, intervalTime }
  }, priceFeedQuery, displayColumnCount)

  return [

    $column(
      sampleContainerDimension(observer.resize())
    )(
      switchLatest(
        combineArray(({ data, intervalTime }) => {
          const lastData = data[data.length - 1]

          const intialTimeseed: SingleValueData = {
            value: lastData.value,
            time: lastData.time as Time
          }

          return $Chart({
            realtimeSource: isTradeOpen(trade)
              ? scan((latest, price): SingleValueData => {


                const nextTime = unixTimestampNow()
                const nextTimeslot = Math.floor(nextTime / intervalTime)

                const currentTimeSlot = Math.floor(Number(latest.time) / intervalTime)
                const priceFormatted = formatFixed(price, 30)

                const delta = formatFixed(calculatePositionDelta(price, trade.averagePrice, trade.isLong, trade).delta, 30)

                if (nextTimeslot > currentTimeSlot) {
                  return {
                    value: delta,
                    time: nextTimeslot * intervalTime as Time
                  }
                }


                return {
                  value: priceFormatted,
                  time: nextTimeslot * intervalTime as Time
                }
              }, intialTimeseed, latestPrice)
              : empty(),
            initializeSeries: map((api) => {
              const series = api.addBaselineSeries({
                // topFillColor1: pallete.positive,
                // topFillColor2: pallete.positive,
                topLineColor: pallete.positive,
                bottomLineColor: pallete.negative,
                baseValue: {
                  type: 'price',
                  price: 0,
                },
                baseLineStyle: LineStyle.Dashed,
                lineWidth: 2,
                baseLineColor: 'red',
                baseLineVisible: true,
                lastValueVisible: false,
                priceLineVisible: false,
              })


              const chartData = data
                // .sort((a, b) => b.time - a.time)
                .map(({ delta, time }) => ({ time: time as Time, value: formatFixed(delta, 30) }))

              series.setData(chartData)


              const high = data[data.reduce((seed, b, idx) => b.delta > data[seed].delta ? idx : seed, Math.min(6, data.length - 1))]
              const low = data[data.reduce((seed, b, idx) => b.delta <= data[seed].delta ? idx : seed, 0)]

              if (high.delta > 0 && low.delta < 0) {
                series.createPriceLine({
                  price: 0,
                  color: pallete.foreground,
                  lineWidth: 1,
                  lineVisible: true,
                  axisLabelVisible: true,
                  title: '',
                  lineStyle: LineStyle.SparseDotted,
                })
              }



              if (data.length > 10) {
                if (low.delta !== high.delta) {
                  setTimeout(() => {
                    const increaseList = trade.increaseList
                    const increaseMarkers = increaseList
                      .slice(1)
                      .map((ip): SeriesMarker<Time> => {
                        return {
                          color: pallete.foreground,
                          position: "aboveBar",
                          shape: "arrowUp",
                          time: unixTimeTzOffset(ip.timestamp),
                          text: formatReadableUSD(ip.collateralDelta)
                        }
                      })

                    const decreaseList = isTradeSettled(trade) ? trade.decreaseList.slice(0, -1) : trade.decreaseList

                    const decreaseMarkers = decreaseList
                      .map((ip): SeriesMarker<Time> => {
                        return {
                          color: pallete.foreground,
                          position: 'belowBar',
                          shape: "arrowDown",
                          time: unixTimeTzOffset(ip.timestamp),
                          text: formatReadableUSD(ip.collateralDelta)
                        }
                      })

                    // series.setMarkers([...increaseMarkers, ...decreaseMarkers].sort((a, b) => Number(a.time) - Number(b.time)))

                    api.timeScale().fitContent()


                  }, 90)
                }

              }

              series.applyOptions({
                scaleMargins: {
                  top: 0.2,
                  bottom: 0,
                }
              })

              return series
            }),
            chartConfig: {
              rightPriceScale: {
                // mode: PriceScaleMode.Logarithmic,
                autoScale: true,
                visible: false,

              },
              handleScale: false,
              handleScroll: false,
              timeScale: {
                // rightOffset: 110,
                secondsVisible: false,
                timeVisible: true,
                rightOffset: 0,
                // fixLeftEdge: true,
                // fixRightEdge: true,
                // visible: false,
                rightBarStaysOnScroll: true,
              },
              ...chartConfig
            },
            containerOp: style({
              display: 'flex',
              // height: '200px',
              position: 'absolute', left: 0, top: 0, right: 0, bottom: 0
            }),
          })({
            crosshairMove: crosshairMoveTether(
              skipRepeatsWith((a, b) => a.point?.x === b.point?.x),
              multicast
            )
          })
        }, historicPnL)
      )
    ),

    {
      crosshairMove,
      // requestTradePricefeed: now(requestPricefeedParamsd),
    }
  ]
})