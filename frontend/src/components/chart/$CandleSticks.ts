import { Behavior, combineArray, fromCallback, O, Op } from "@aelea/core"
import { $wrapNativeElement, component, drawLatest, INode, style } from "@aelea/dom"
import { observer } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { drawWithinFrame } from "@gambitdao/gmx-middleware"
import { empty, filter, map, mergeArray, multicast, now, scan, switchLatest, tap } from '@most/core'
import { disposeWith } from '@most/disposable'
import { Stream } from '@most/types'
import { CandlestickData, CandlestickSeriesPartialOptions, ChartOptions, createChart, CrosshairMode, DeepPartial, IPriceLine, ISeriesApi, LineStyle, MouseEventParams, PriceLineOptions, SeriesDataItemTypeMap, SeriesMarker, Time, TimeRange, WhitespaceData } from 'lightweight-charts'

export interface IMarker extends SeriesMarker<Time> {

}

export interface ISeries {

  seriesConfig: CandlestickSeriesPartialOptions

  data: Stream<Array<SeriesDataItemTypeMap["Candlestick"]> | null>

  appendData?: Op<Array<SeriesDataItemTypeMap["Candlestick"]> | null, Stream<SeriesDataItemTypeMap["Candlestick"]>>
  priceLines?: Stream<PriceLineOptions | null>[]
  drawMarkers?: Stream<IMarker[]>
}

export interface ICandlesticksChart {
  chartConfig?: DeepPartial<ChartOptions>
  containerOp?: Op<INode, INode>
  series: ISeries[]
}


export const $CandleSticks = ({ chartConfig, series, containerOp = O() }: ICandlesticksChart) => component((
  [containerDimension, sampleContainerDimension]: Behavior<INode, ResizeObserverEntry[]>
) => {

  const containerEl = document.createElement('chart')


  const chartApi = createChart(containerEl, {
    rightPriceScale: {
      visible: false,
    },
    handleScale: {

    },
    grid: {
      horzLines: {
        color: '#eee',
        visible: false,
      },
      vertLines: {
        color: 'transparent',
        visible: false
      },
    },
    overlayPriceScales: {
      borderVisible: false,
    },
    leftPriceScale: {
      visible: false,
      scaleMargins: {
        bottom: 0,
        top: 0,
      }
    },
    layout: {
      textColor: pallete.message,
      backgroundColor: 'transparent',
      fontFamily: 'RelativePro',
      fontSize: 12
    },
    timeScale: {
      rightOffset: 0,
      secondsVisible: true,
      timeVisible: true,
      lockVisibleTimeRangeOnResize: true,

    },
    crosshair: {
      mode: CrosshairMode.Magnet,
      horzLine: {
        // visible: false,
        labelBackgroundColor: pallete.foreground,
        // labelVisible: false,
        color: pallete.indeterminate,
        width: 1,
        style: LineStyle.Dotted,
      },
      vertLine: {
        color: pallete.indeterminate,
        labelBackgroundColor: pallete.foreground,
        width: 1,
        style: LineStyle.Dotted,
      }
    },
    ...chartConfig
  })

  const crosshairMove = fromCallback<MouseEventParams>(
    cb => {
      chartApi.subscribeCrosshairMove(cb)
      disposeWith(handler => chartApi.unsubscribeCrosshairMove(handler), cb)
    }
  )
  const click = multicast(
    fromCallback<MouseEventParams>(cb => {
      chartApi.subscribeClick(cb)
      disposeWith(handler => chartApi.unsubscribeClick(handler), cb)
    })
  )

  const timeScale = chartApi.timeScale()


  const visibleLogicalRangeChange = multicast(
    fromCallback(cb => {
      timeScale.subscribeVisibleLogicalRangeChange(cb)
      disposeWith(handler => timeScale.subscribeVisibleLogicalRangeChange(handler), cb)
    })
  )

  const visibleTimeRangeChange = multicast(
    fromCallback<TimeRange | null>(cb => {
      timeScale.subscribeVisibleTimeRangeChange(cb)
      disposeWith(handler => timeScale.unsubscribeVisibleTimeRangeChange(handler), cb)
    })
  )


  const ignoreAll = filter(() => false)

  return [
    $wrapNativeElement(containerEl)(
      style({ position: 'relative', minHeight: '30px', flex: 1 }),
      sampleContainerDimension(observer.resize()),
      containerOp,
    )(
      ignoreAll(mergeArray([

        ...series.flatMap(params => {

          const seriesApi = chartApi.addCandlestickSeries(params.seriesConfig)
          const priceLineConfigList = params.priceLines || []

          const seriesSetup = scan((prev, data) => {
            if (data === null) {
              if (prev.api) {
                chartApi.removeSeries(prev.api)
              }
              return { data: null, api: null }
            }

            seriesApi.setData(data)

            return { api: seriesApi, data }
          }, { api: null, data: null } as { data: (CandlestickData | WhitespaceData)[] | null, api: null | ISeriesApi<"Candlestick"> }, params.data)

          return [
            switchLatest(map(ss => {
              const liveData = params.appendData
                ? switchLatest(params.appendData(now(ss.data)))
                : empty()

              return tap(next => seriesApi.update(next), liveData)
            }, seriesSetup)),
            ...priceLineConfigList.map(lineStreamConfig => {
              return scan((prev, params) => {
                if (prev) {
                  seriesApi.removePriceLine(prev)
                }

                if (params === null) {
                  return null
                }

                return seriesApi.createPriceLine(params)
              }, null as IPriceLine | null, lineStreamConfig)
            }),
            tap(next => {
              seriesApi.setMarkers(next)
            }, params.drawMarkers || empty()),
          ]
        }),
        combineArray(([containerDimension]) => {
          const { width, height } = containerDimension.contentRect
          chartApi.resize(width, height)

          return empty()
        }, drawWithinFrame(containerDimension)),
      ]))
    ),

    {
      crosshairMove,
      click,
      visibleLogicalRangeChange,
      visibleTimeRangeChange,
      containerDimension
    }
  ]
})


