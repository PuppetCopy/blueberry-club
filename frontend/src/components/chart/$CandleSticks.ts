import { Behavior, combineArray, fromCallback, O, Op } from "@aelea/core"
import { $wrapNativeElement, component, INode, style } from "@aelea/dom"
import { observer } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { debounce, delay, empty, filter, mergeArray, multicast, scan, tap } from '@most/core'
import { disposeWith } from '@most/disposable'
import { Stream } from '@most/types'
import {
  CandlestickSeriesPartialOptions, ChartOptions, createChart, CrosshairMode, DeepPartial,
  IPriceLine, LineStyle, MouseEventParams, PriceLineOptions, SeriesDataItemTypeMap, SeriesMarker,
  Time, TimeRange
} from 'lightweight-charts'

export interface IMarker extends SeriesMarker<Time> {

}

export interface ISeries {

  seriesConfig: CandlestickSeriesPartialOptions

  data: Array<SeriesDataItemTypeMap["Candlestick"]>

  appendData?: Stream<SeriesDataItemTypeMap["Candlestick"]>
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
      mode: CrosshairMode.Normal,
      horzLine: {
        labelBackgroundColor: pallete.foreground,
        color: colorAlpha(pallete.foreground, .25),
        width: 1,
        style: LineStyle.Solid
      },
      vertLine: {
        labelBackgroundColor: pallete.foreground,
        color: colorAlpha(pallete.foreground, .25),
        width: 1,
        style: LineStyle.Solid,
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
      style({ position: 'relative', minHeight: '30px', flex: 1, width: '100%' }),
      sampleContainerDimension(observer.resize()),
      containerOp,
    )(
      ignoreAll(mergeArray([
        ...series.map(params => {
          const priceLineConfigList = params.priceLines || []
          const api = chartApi.addCandlestickSeries(params.seriesConfig)


          api.setData(params.data)

          setTimeout(() => {
            timeScale.resetTimeScale()
          }, 25)

          return mergeArray([
            params.appendData
              ? tap(next => {
                if (next && next.time) {
                  api.update(next)
                }

              }, params.appendData)
              : empty(),
            ...priceLineConfigList.map(lineStreamConfig => {
              return scan((prev, params) => {
                if (prev && params === null) {
                  api.removePriceLine(prev)
                }

                if (params) {
                  if (prev) {
                    prev.applyOptions(params)
                    return prev
                  } else {
                    return api.createPriceLine(params)
                  }
                }

                return null
              }, null as IPriceLine | null, lineStreamConfig)
            }),
            tap(next => {
              api.setMarkers(next)
            }, params.drawMarkers || empty()),
          ])
        }),
        combineArray(([containerDimension]) => {
          const { width, height } = containerDimension.contentRect
          chartApi.resize(width, height)

          return empty()
        }, containerDimension),
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


