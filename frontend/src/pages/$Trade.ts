import { Behavior, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $node, component, IBranch, INode, style, StyleCSS } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { AddressZero, ADDRESS_LEVERAGE, ARBITRUM_ADDRESS, ARBITRUM_ADDRESS_LEVERAGE, CHAIN, formatFixed, formatReadableUSD, IAccountTradeListParamApi, intervalTimeMap, intervalListFillOrderMap, IPricefeed, IPricefeedParamApi, IPriceLatestMap, isTradeClosed, isTradeLiquidated, isTradeOpen, isTradeSettled, ITrade, unixTimestampNow, unixTimeTzOffset } from "@gambitdao/gmx-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { at, combine, constant, filter, map, merge, mergeArray, multicast, now, periodic, snapshot, startWith, switchLatest } from "@most/core"
import { pallete } from "@aelea/ui-components-theme"
import { getPricefeedVisibleColumns } from "@gambitdao/ui-components"
import { CrosshairMode, LineStyle, MouseEventParams, PriceScaleMode, SeriesMarker, Time } from "lightweight-charts"
import { IEthereumProvider } from "eip1193-provider"
import { Stream } from "@most/types"
import { $Chart } from "../components/chart/$Chart"
import { WALLET } from "../logic/provider"
import { connectTrade } from "../logic/contract/trade"
import { $TradeBox } from "../components/trade/$TradeBox"

const INTERVAL_TICKS = 140


export interface ITradeComponent {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  parentRoute: Route
  accountTradeList: Stream<ITrade[]>
  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">
  pricefeed: Stream<IPricefeed[]>
  latestPriceMap: Stream<IPriceLatestMap>
}

export const $Trade = (config: ITradeComponent) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [timeFrame, timeFrameTether]: Behavior<INode, intervalTimeMap>,
  [selectedTokenChange, selectedTokenChangeTether]: Behavior<IBranch, ADDRESS_LEVERAGE>,
  [selectOtherTimeframe, selectOtherTimeframeTether]: Behavior<IBranch, intervalTimeMap>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider, IEthereumProvider>,
  [changeInputTrade, changeInputTradeTether]: Behavior<ARBITRUM_ADDRESS_LEVERAGE, ARBITRUM_ADDRESS_LEVERAGE>,
  [changeOutputTrade, changeOutputTradeTether]: Behavior<ARBITRUM_ADDRESS_LEVERAGE, ARBITRUM_ADDRESS_LEVERAGE>,

) => {

  // inputTrade.store(src, map(x => x))

  const trade = connectTrade(config.walletLink)


  const urlFragments = document.location.pathname.split('/')
  // const [chainLabel] = urlFragments.slice(1) as [keyof typeof CHAIN_LABEL_ID]
  // const chain = CHAIN_LABEL_ID[chainLabel]
  const chain = CHAIN.ARBITRUM

  const account = map(address => {
    if (!address) {
      throw new Error('No account connected')
    }

    return address
  }, config.walletLink.account)


  const timeFrameStore = config.parentStore('portfolio-chart-interval', intervalTimeMap.DAY7)
  const chartInterval = startWith(timeFrameStore.state, replayLatest(timeFrameStore.store(timeFrame, map(x => x))))


  const inputTradeStore = config.parentStore('input-trade', AddressZero as ARBITRUM_ADDRESS_LEVERAGE)
  const outputTradeStore = config.parentStore<ARBITRUM_ADDRESS_LEVERAGE, ARBITRUM_ADDRESS_LEVERAGE>('output-trade', ARBITRUM_ADDRESS.NATIVE_TOKEN)

  const accountTradeList = multicast(filter(list => list.length > 0, config.accountTradeList))

  const settledTradeList = map(list => list.filter(isTradeSettled), accountTradeList)
  const openTradeList = map(list => list.filter(isTradeOpen), accountTradeList)

  const inputBalanceState = inputTradeStore.store(merge(changeInputTrade, now(inputTradeStore.state)), map(x => x))
  const outputBalanceState = outputTradeStore.store(merge(changeOutputTrade, now(outputTradeStore.state)), map(x => x))


  const latestInitiatedPosition = map(h => {
    return h[0].indexToken
  }, accountTradeList)

  const selectedToken = mergeArray([latestInitiatedPosition, selectedTokenChange])

  const latestPrice = (trade: ITrade) => map(priceMap => priceMap[trade.indexToken].value, config.latestPriceMap)



  const historicalPnl = multicast(
    combineArray((tradeList, interval) => {
      const intervalInSecs = Math.floor((interval / INTERVAL_TICKS))
      const initialDataStartTime = unixTimestampNow() - interval
      const sortedParsed = [...tradeList]
        .filter(pos => {
          return pos.settledTimestamp > initialDataStartTime
        })
        .sort((a, b) => a.settledTimestamp - b.settledTimestamp)

      const filled = intervalListFillOrderMap({
        source: sortedParsed,
        seed: { time: initialDataStartTime, value: 0n },
        interval: intervalInSecs,
        getTime: pos => pos.settledTimestamp,
        fillMap: (prev, next) => {
          return { time: next.settledTimestamp, value: prev.value + next.realisedPnl - next.fee }
        },
      })

      return filled
    }, settledTradeList, chartInterval)
  )



  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }

  const timeframePnLCounter: Stream<number> = combineArray(
    (acc, cross) => {
      return Number.isFinite(cross) ? cross : acc
    },
    map(x => {
      return formatFixed(x[x.length - 1].value, 30)
    }, historicalPnl),
    mergeArray([
      map(s => {
        const barPrice = [...s.seriesPrices.values()][0]
        const serires = barPrice
        return Math.floor(Number(serires))
      }, pnlCrosshairMove),
      at(600, null)
    ])
  )

  const $container = screenUtils.isDesktopScreen
    ? $row(style({ flexDirection: 'row-reverse', gap: '70px' }))
    : $column

  const chartContainerStyle = style({
    backgroundImage: `radial-gradient(at right center, ${pallete.background} 50%, transparent)`,
    background: pallete.background
  })
  const $chartContainer = screenUtils.isDesktopScreen
    ? $node(
      chartContainerStyle, style({
        position: 'fixed', inset: '120px 0px 0px', width: 'calc(50vw)', display: 'flex',
      })
    )
    : $column(chartContainerStyle)


  return [
    $container(
      $column(layoutSheet.spacingBig, style({ flex: 1 }))(

        $TradeBox({
          initialState: {
            inputAddress: inputTradeStore.state,
            outputAddress: outputTradeStore.state,
          },
          inputAddressState: inputBalanceState,
          outputAddressState: outputBalanceState,
          walletLink: config.walletLink
        })({
          changeInputTrade: changeInputTradeTether(),
          changeOutputTrade: changeOutputTradeTether(),
        }),

        $node(),

      ),
      $column(style({ position: 'relative', flex: 1 }))(
        $chartContainer(
          switchLatest(snapshot(({ chartInterval, selectedToken, settledTradeList }, data) => {
            return $Chart({
              initializeSeries: map(api => {

                const endDate = unixTimestampNow()
                const startDate = endDate - chartInterval
                const series = api.addCandlestickSeries({
                  upColor: pallete.foreground,
                  downColor: 'transparent',
                  borderDownColor: pallete.foreground,
                  borderUpColor: pallete.foreground,
                  wickDownColor: pallete.foreground,
                  wickUpColor: pallete.foreground,
                })

                const chartData = data.map(({ o, h, l, c, timestamp }) => {
                  const open = formatFixed(o, 30)
                  const high = formatFixed(h, 30)
                  const low = formatFixed(l, 30)
                  const close = formatFixed(c, 30)

                  return { open, high, low, close, time: timestamp }
                })



                // @ts-ignore
                series.setData(chartData)

                const priceScale = series.priceScale()

                priceScale.applyOptions({
                  scaleMargins: screenUtils.isDesktopScreen
                    ? {
                      top: 0.3,
                      bottom: 0.3
                    }
                    : {
                      top: 0.1,
                      bottom: 0.1
                    }
                })


                const selectedSymbolList = settledTradeList.filter(trade => selectedToken === trade.indexToken).filter(pos => pos.settledTimestamp > startDate)
                const closedTradeList = selectedSymbolList.filter(isTradeClosed)
                const liquidatedTradeList = selectedSymbolList.filter(isTradeLiquidated)

                setTimeout(() => {

                  const increasePosMarkers = selectedSymbolList
                    .map((trade): SeriesMarker<Time> => {
                      return {
                        color: trade.isLong ? pallete.positive : pallete.negative,
                        position: "aboveBar",
                        shape: trade.isLong ? 'arrowUp' : 'arrowDown',
                        time: unixTimeTzOffset(trade.timestamp),
                      }
                    })

                  const closePosMarkers = closedTradeList
                    .map((trade): SeriesMarker<Time> => {
                      return {
                        color: pallete.message,
                        position: "belowBar",
                        shape: 'square',
                        text: '$' + formatReadableUSD(trade.realisedPnl),
                        time: unixTimeTzOffset(trade.settledTimestamp),
                      }
                    })

                  const liquidatedPosMarkers = liquidatedTradeList
                    .map((pos): SeriesMarker<Time> => {
                      return {
                        color: pallete.negative,
                        position: "belowBar",
                        shape: 'square',
                        text: '$-' + formatReadableUSD(pos.collateral),
                        time: unixTimeTzOffset(pos.settledTimestamp),
                      }
                    })

                  // console.log(new Date(closePosMarkers[0].time as number * 1000))

                  const markers = [...increasePosMarkers, ...closePosMarkers, ...liquidatedPosMarkers].sort((a, b) => a.time as number - (b.time as number))
                  series.setMarkers(markers)
                  // api.timeScale().fitContent()

                  // timescale.setVisibleRange({
                  //   from: startDate as Time,
                  //   to: endDate as Time
                  // })
                }, 50)

                return series
              }),
              containerOp: style({
                minHeight: '300px',
                width: '100%',
              }),
              chartConfig: {
                rightPriceScale: {
                  entireTextOnly: true,
                  borderVisible: false,
                  mode: PriceScaleMode.Logarithmic

                  // visible: false
                },
                timeScale: {
                  timeVisible: chartInterval <= intervalTimeMap.DAY7,
                  secondsVisible: chartInterval <= intervalTimeMap.MIN60,
                  borderVisible: true,
                  borderColor: pallete.middleground,
                  rightOffset: 3,
                },
                crosshair: {
                  mode: CrosshairMode.Normal,
                  horzLine: {
                    labelBackgroundColor: pallete.background,
                    color: pallete.foreground,
                    width: 1,
                    style: LineStyle.Dotted
                  },
                  vertLine: {
                    labelBackgroundColor: pallete.background,
                    color: pallete.foreground,
                    width: 1,
                    style: LineStyle.Dotted,
                  }
                }
              },
            })({
              // crosshairMove: sampleChartCrosshair(),
              // click: sampleClick()
            })
          }, combineObject({ chartInterval, selectedToken, settledTradeList }), config.pricefeed))
        ),
      )
    ),

    {
      requestPricefeed: combine((tokenAddress, selectedInterval): IPricefeedParamApi => {
        const to = unixTimestampNow()
        const from = to - selectedInterval

        const interval = getPricefeedVisibleColumns(160, from, to)

        return { chain, interval, tokenAddress, from, to }
      }, selectedToken, chartInterval),
      requestAccountTradeList: map((address): IAccountTradeListParamApi => {
        return {
          account: address,
          // timeInterval: timeFrameStore.state,
          chain,
        }
      }, account),
      requestLatestPriceMap: constant({ chain }, periodic(5000)),
      changeRoute,
      walletChange
    }
  ]
})
