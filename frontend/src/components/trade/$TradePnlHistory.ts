import { Behavior, combineArray } from "@aelea/core"
import { $Node, component, INode, NodeComposeFn, style } from "@aelea/dom"
import { $column, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import {
  unixTimestampNow, isTradeSettled, getDeltaPercentage, intervalListFillOrderMap,
  isTradeOpen, ITrade, formatFixed, getPnL, IPricefeed, USD_PERCISION, IPricefeedParamApi, CHAIN, readableNumber
} from "@gambitdao/gmx-middleware"
import { getIntervalBasedOnTimeframe } from "@gambitdao/ui-components"
import { multicast, switchLatest, empty, skipRepeatsWith, map, skip, now } from "@most/core"
import { Stream } from "@most/types"
import { MouseEventParams, SingleValueData, Time, LineStyle, ChartOptions, DeepPartial, BarPrice } from "lightweight-charts"
import { $Chart } from "../chart/$Chart"

interface ITradePnlPreview {
  $container: NodeComposeFn<$Node>
  trade: ITrade
  latestPrice: Stream<bigint>
  chartConfig?: DeepPartial<ChartOptions>
  pixelsPerBar?: number
  pricefeed: IPricefeed[]
  chain: CHAIN
}

export interface IPricefeedTick {
  time: number
  price: bigint
  fee: bigint
  size: bigint
  collateral: bigint
  averagePrice: bigint
  realisedPnl: bigint
  pnl: bigint
  pnlPercentage: bigint
}


export const $TradePnlHistory = (config: ITradePnlPreview) => component((
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [containerDimension, sampleContainerDimension]: Behavior<INode, ResizeObserverEntry[]>
) => {

  const pixelsPerBar = config.pixelsPerBar || 5
  const displayColumnCount = map(([container]) => container.contentRect.width / pixelsPerBar, containerDimension)

  const historicPnL = multicast(combineArray((displayColumnCount) => {

    const startPrice = config.trade.updateList[0].averagePrice
    const endtime = isTradeSettled(config.trade) ? config.trade.settledTimestamp : unixTimestampNow()
    const timeRange = endtime - config.trade.timestamp
    const interval = Math.floor(timeRange / displayColumnCount) || 1

    const initalUpdate = config.trade.updateList[0]

    const initialTick: IPricefeedTick = {
      time: config.trade.timestamp,
      price: startPrice,
      collateral: initalUpdate.collateral,
      size: initalUpdate.size,
      averagePrice: initalUpdate.averagePrice,
      pnl: 0n,
      realisedPnl: 0n,
      fee: 0n,
      pnlPercentage: 0n
    }


    const pricefeedFramed = config.pricefeed.filter(tick => tick.timestamp >= initialTick.time)

    const data = intervalListFillOrderMap({
      source: [
        ...pricefeedFramed,
        ...config.trade.updateList
      ],
      // source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList, ...trade.increaseList, ...trade.decreaseList],
      interval,
      seed: initialTick,
      getTime: x => x.timestamp,
      fillMap: (prev, next) => {
        const time = next.timestamp

        if (next.__typename === 'UpdatePosition') {
          const pnl = getPnL(config.trade.isLong, next.averagePrice, next.markPrice, next.size)
          const realisedPnl = next.realisedPnl
          const pnlPercentage = getDeltaPercentage(pnl, next.collateral)

          const averagePrice = next.averagePrice
          const size = next.size
          const collateral = next.collateral

          return { ...prev, pnl, pnlPercentage, time, realisedPnl, size, collateral, averagePrice }
        }

        const pnl = getPnL(config.trade.isLong, prev.averagePrice, next.c, prev.size)
        const pnlPercentage = getDeltaPercentage(pnl, prev.collateral)

        return { ...prev, time, pnl, pnlPercentage }

      }
    })


    const lastChange = data[data.length - 1]

    if (isTradeSettled(config.trade)) {
      const pnl = 0n
      const pnlPercentage = getDeltaPercentage(pnl, config.trade.collateral)
      const realisedPnl = config.trade.realisedPnl

      data.push({ ...lastChange, pnl, realisedPnl, pnlPercentage, time: config.trade.settledTimestamp })
    }

    return { data, interval }
  }, displayColumnCount))


  return [

    (config.$container || $column(style({ height: '80px' })))(sampleContainerDimension(observer.resize()))(
      switchLatest(
        combineArray(({ data, interval }) => {

          return $Chart({
            realtimeSource: isTradeOpen(config.trade)
              ? map((price): SingleValueData => {
                const nextTime = unixTimestampNow()
                const nextTimeslot = Math.floor(nextTime / interval)

                const pnl = getPnL(config.trade.isLong, config.trade.averagePrice, price, config.trade.size) + config.trade.realisedPnl + -config.trade.fee
                const value = formatFixed(pnl, 30)

                return {
                  value,
                  time: nextTimeslot * interval as Time
                }
              }, config.latestPrice)
              : empty(),
            initializeSeries: map((api) => {
              const series = api.addBaselineSeries({
                // topFillColor1: pallete.positive,
                // topFillColor2: pallete.positive,
                priceFormat: {
                  type: 'custom',
                  formatter: (priceValue: BarPrice) => readableNumber(priceValue.valueOf())
                },
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
                .map(({ pnl, time, realisedPnl }) => ({ time: time as Time, value: formatFixed(pnl + realisedPnl, 30) }))

              series.setData(chartData)


              const high = data[data.reduce((seed, b, idx) => b.pnl > data[seed].pnl ? idx : seed, Math.min(6, data.length - 1))]
              const low = data[data.reduce((seed, b, idx) => b.pnl <= data[seed].pnl ? idx : seed, 0)]

              if (high.pnl > 0 && low.pnl < 0) {
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


              // setTimeout(() => {
              //   if (data.length > 10) {
              //     if (low.pnl !== high.pnl) {
              //       // const increaseList = trade.increaseList
              //       // const increaseMarkers = increaseList
              //       //   .slice(1)
              //       //   .map((ip): SeriesMarker<Time> => {
              //       //     return {
              //       //       color: pallete.foreground,
              //       //       position: "aboveBar",
              //       //       shape: "arrowUp",
              //       //       time: unixTimeTzOffset(ip.timestamp),
              //       //       text: formatReadableUSD(ip.collateralDelta)
              //       //     }
              //       //   })
              //       // const decreaseList = isTradeSettled(trade) ? trade.decreaseList.slice(0, -1) : trade.decreaseList
              //       // const decreaseMarkers = decreaseList
              //       //   .map((ip): SeriesMarker<Time> => {
              //       //     return {
              //       //       color: pallete.foreground,
              //       //       position: 'belowBar',
              //       //       shape: "arrowDown",
              //       //       time: unixTimeTzOffset(ip.timestamp),
              //       //       text: formatReadableUSD(ip.collateralDelta)
              //       //     }
              //       //   })

              //       // series.setMarkers([...increaseMarkers, ...decreaseMarkers].sort((a, b) => Number(a.time) - Number(b.time)))


              //     }
              //   }

              //   api.timeScale().fitContent()

              // }, 90)


              return series
            }),
            chartConfig: {
              layout: {
                textColor: pallete.foreground,
                backgroundColor: 'transparent',
                fontFamily: 'RelativePro',
                fontSize: 10
              },
              leftPriceScale: {
                scaleMargins: {
                  top: 0.1,
                  bottom: 0,
                }
              },
              // rightPriceScale: {
              //   // mode: PriceScaleMode.Logarithmic,
              //   autoScale: true,
              //   visible: true,
              //   scaleMargins: {
              //     top: 0.4,
              //     bottom: 0,
              //   }
              // },
              handleScale: false,
              handleScroll: false,
              timeScale: {
                // rightOffset: 110,
                secondsVisible: false,
                timeVisible: true,
                shiftVisibleRangeOnNewBar: true,
                rightOffset: 0,
                fixLeftEdge: true,
                fixRightEdge: true,
                
                // visible: false,
                // rightBarStaysOnScroll: true,
              },
              ...config.chartConfig || {}
            },
            containerOp: style({
              display: 'flex',
              flex: 1
              // position: 'absolute', left: 0, top: 0, right: 0, bottom: 0
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
      // requestPricefeed
    }
  ]
})