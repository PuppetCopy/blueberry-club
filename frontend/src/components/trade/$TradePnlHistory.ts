import { Behavior, combineArray } from "@aelea/core"
import { component, INode, style } from "@aelea/dom"
import { $column, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { unixTimestampNow, query, fromJson, isTradeSettled, getDelta, getDeltaPercentage, intervalListFillOrderMap, isTradeClosed, isTradeLiquidated, isTradeOpen, unixTimeTzOffset, formatReadableUSD, IChainParamApi, ITrade, IPositionDelta, formatFixed } from "@gambitdao/gmx-middleware"
import { getPricefeedVisibleColumns } from "@gambitdao/ui-components"
import { fromPromise, multicast, startWith, skipRepeats, combine, switchLatest, empty, skipRepeatsWith, map } from "@most/core"
import { Stream } from "@most/types"
import { MouseEventParams, SingleValueData, Time, LineStyle, SeriesMarker, ChartOptions, DeepPartial } from "lightweight-charts"
import { $Chart } from "../chart/$Chart"

interface ITradePnlPreview {
  trade: ITrade
  latestPrice: Stream<bigint>
  chain: IChainParamApi['chain'],
  chartConfig?: DeepPartial<ChartOptions>
  pixelsPerBar?: number
}

export interface IPricefeedTick extends IPositionDelta {
  value: number
  time: number
  price: bigint
  fee: bigint
  size: bigint
  collateral: bigint
  averagePrice: bigint
  realisedPnl: bigint
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

  const historicPnL = multicast(combineArray((feed, displayColumnCount) => {

    if (feed.length < 2) {
      throw new Error('no error to build a chart preview')
    }

    const startPrice = trade.increaseList[0].price
    const endtime = isTradeSettled(trade) ? trade.settledTimestamp : unixTimestampNow()
    const timeRange = endtime - trade.timestamp
    const intervalTime = Math.floor(timeRange / displayColumnCount)
    const initialPnl = getDelta(trade.averagePrice, trade.increaseList[0].price, trade.size)
    const initialPnlPercentage = getDeltaPercentage(initialPnl, trade.collateral)

    const initalUpdate = trade.updateList[0]

    const initialTick: IPricefeedTick = {
      time: trade.timestamp,
      price: startPrice,
      value: formatFixed(initialPnl, 30),
      collateral: initalUpdate.collateral,
      size: initalUpdate.size,
      averagePrice: initalUpdate.averagePrice,
      delta: initialPnl,
      realisedPnl: 0n,
      fee: 0n,
      deltaPercentage: initialPnlPercentage
    }


    const data = intervalListFillOrderMap({
      source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList, ...trade.increaseList, ...trade.decreaseList],
      interval: intervalTime,
      seed: initialTick,
      getTime: x => x.timestamp,
      fillMap: (prev, next) => {

        let delta: bigint
        let deltaPercentage: bigint
        let realisedPnl = prev.realisedPnl
        let fee = prev.fee
        let size = prev.size

        if (next.__typename === 'IncreasePosition' || next.__typename === 'DecreasePosition') {
          fee += next.fee
          delta = prev.delta
          deltaPercentage = prev.deltaPercentage
        } else if (next.__typename === 'UpdatePosition') {
          delta = getDelta(next.averagePrice, next.markPrice, next.size) + next.realisedPnl - fee
          deltaPercentage = getDeltaPercentage(delta, next.collateral)
          realisedPnl = next.realisedPnl
          size = next.size
        } else {
          delta = getDelta(prev.averagePrice, next.c, prev.size) + prev.realisedPnl - fee
          deltaPercentage = getDeltaPercentage(delta, prev.collateral)
        }

        const value = formatFixed(delta, 30)

        return { ...prev, delta, deltaPercentage, value, realisedPnl, fee, size }
      }
    })


    const lastChange = data[data.length - 1]

    if (isTradeClosed(trade)) {
      const price = trade.decreaseList[trade.decreaseList.length - 1].price
      const delta = getDelta(trade.averagePrice, price, trade.size)
      const deltaPercentage = getDeltaPercentage(delta, trade.collateral)
      const value = formatFixed(delta + trade.realisedPnl, 30)

      data.push({ ...lastChange, delta, deltaPercentage, value, time: trade.closedPosition.timestamp })
    } else if (isTradeLiquidated(trade)) {
      const price = trade.liquidatedPosition.markPrice
      const delta = getDelta(trade.averagePrice, price, trade.size)
      const deltaPercentage = getDeltaPercentage(delta + trade.realisedPnl, trade.collateral)

      data.push({ ...lastChange, delta, deltaPercentage, time: trade.liquidatedPosition.timestamp })
    }

    return { data, intervalTime }
  }, priceFeedQuery, displayColumnCount))

  const pnlCrossHairTime = startWith(null, skipRepeats(map((cross: MouseEventParams) => cross.time as number || null, crosshairMove)))

  const hoveredPriceTick = combine((history, crossTime) => {

    if (crossTime) {
      return history.data.find(x => x.time === crossTime) || null
    }

    return null
  }, historicPnL, pnlCrossHairTime)

  return [

    $column(sampleContainerDimension(observer.resize()))(
      switchLatest(
        combineArray(({ data, intervalTime }) => {

          return $Chart({
            realtimeSource: isTradeOpen(trade)
              ? map((price): SingleValueData => {
                const nextTime = unixTimestampNow()
                const nextTimeslot = Math.floor(nextTime / intervalTime)

                const pnl = getDelta(trade.averagePrice, price, trade.size) + trade.realisedPnl - trade.fee
                const value = formatFixed(pnl, 30)

                return {
                  value,
                  time: nextTimeslot * intervalTime as Time
                }
              }, latestPrice)
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
      // hoveredPriceTick
    }
  ]
})