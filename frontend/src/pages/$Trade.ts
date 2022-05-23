import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, eventElementTarget, IBranch, INode, nodeEvent, style, StyleCSS, styleInline } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, Input, layoutSheet, observer, screenUtils, state } from "@aelea/ui-components"
import { AddressZero, ADDRESS_LEVERAGE, ARBITRUM_ADDRESS, ARBITRUM_ADDRESS_LEVERAGE, CHAIN, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, formatFixed, formatReadableUSD, getMappedKeyByValue, getTokenDescription, IAccountTradeListParamApi, intervalInMsMap, intervalListFillOrderMap, IPricefeed, IPricefeedParamApi, IPriceLatestMap, isTradeClosed, isTradeLiquidated, isTradeOpen, isTradeSettled, ITrade, readableNumber, TOKEN_DESCRIPTION_MAP, TOKEN_SYMBOL, unixTimestampNow, unixTimeTzOffset } from "@gambitdao/gmx-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { at, combine, constant, filter, join, map, merge, mergeArray, multicast, now, periodic, skipRepeats, snapshot, startWith, switchLatest, tap, until } from "@most/core"
import { $card } from "../elements/$common"
import { pallete } from "@aelea/ui-components-theme"
import { $tokenIconMap, $tokenLabelFromSummary, getPricefeedVisibleColumns } from "@gambitdao/ui-components"
import { CrosshairMode, LineStyle, MouseEventParams, PriceScaleMode, SeriesMarker, Time } from "lightweight-charts"
import { IEthereumProvider } from "eip1193-provider"
import { Stream } from "@most/types"
import { $Chart } from "../components/chart/$Chart"
import { WALLET } from "../logic/provider"
import { connectTrade } from "../logic/contract/trade"
import { $Dropdown, $defaultSelectContainer } from "../components/form/$Dropdown"
import { $caretDown } from "../elements/$icons"

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
  [timeFrame, timeFrameTether]: Behavior<INode, intervalInMsMap>,
  [selectedTokenChange, selectedTokenChangeTether]: Behavior<IBranch, ADDRESS_LEVERAGE>,
  [selectOtherTimeframe, selectOtherTimeframeTether]: Behavior<IBranch, intervalInMsMap>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider, IEthereumProvider>,

) => {

  

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


  const timeFrameStore = config.parentStore('portfolio-chart-interval', intervalInMsMap.DAY7)
  const chartInterval = startWith(timeFrameStore.state, replayLatest(timeFrameStore.store(timeFrame, map(x => x))))

  const accountTradeList = multicast(filter(list => list.length > 0, config.accountTradeList))

  const settledTradeList = map(list => list.filter(isTradeSettled), accountTradeList)
  const openTradeList = map(list => list.filter(isTradeOpen), accountTradeList)


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
        position: 'fixed', inset: '120px 0px 0px',  width: 'calc(50vw)', display: 'flex',
      })
    )
    : $column(chartContainerStyle)
  
  
  return [
    $container(
      $column(layoutSheet.spacingBig, style({ flex: 1 }))(

        $TradeBox({})({}),

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
                      top:  0.3,
                      bottom: 0.3
                    }
                    : {
                      top:  0.1,
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
                  timeVisible: chartInterval <= intervalInMsMap.DAY7,
                  secondsVisible: chartInterval <= intervalInMsMap.MIN60,
                  borderVisible: true,
                  borderColor: pallete.horizon,
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


interface ITradeBox {

}

const $TradeBox = (config: ITradeBox) => component((
  [changeInput, changeInputTether]: Behavior<any, number>,
  [changeLeverage, changeLeverageTether]: Behavior<any, any>,
  [selectInput, selectInputTether]: Behavior<ARBITRUM_ADDRESS_LEVERAGE | typeof AddressZero, ARBITRUM_ADDRESS_LEVERAGE | typeof AddressZero>,
) => {

  const $field = $element('input')(attr({ placeholder: '0.0' }), style({ flex: 1, padding: '0 16px', fontSize: '1.25em', background: 'transparent', border: 'none', height: '60px', outline: 'none', lineHeight: '60px', color: pallete.message }))

  const $hintInput = (label: string, val: Stream<string>) => $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em', color: pallete.foreground }))(
    $text(label),
    $text(val),
  )

  

  return [
    $card(style({ padding: '0', gap: 0 }))(
      
      $row(style({ placeContent: 'space-between', padding: '10px 20px 0' }))(
        $hintInput('Pay', now('1')),
        $hintInput('Balance', now('1')),
      ),

      $row(
        $field(changeInputTether(nodeEvent('input'), map((x) => {
          const target = x.currentTarget

          if (!(target instanceof HTMLInputElement)) {
            throw new Error('Target is not type of input')
          }

          return Number(target.value)
        })))(),

        $Dropdown<ARBITRUM_ADDRESS_LEVERAGE | typeof AddressZero>({
          $container: $row(style({ position: 'relative', alignSelf: 'center', padding: '0 15px' })),
          // disabled: accountChange,
          // $noneSelected: $text('Choose Amount'),
          $selection: map(option => {
            const tokenDesc = option === AddressZero ? TOKEN_DESCRIPTION_MAP.ETH : TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

            return $row(style({ alignItems: 'center', cursor: 'pointer' }))(
              $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', viewBox: '0 0 32 32' }),
              $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
            )
          }),
          select: {
            value: now(ARBITRUM_ADDRESS.NATIVE_TOKEN),
            $container: $defaultSelectContainer(style({ minWidth:'300px', right: 0 })),
            $$option: map(option => {
              const tokenDesc = option === AddressZero ? TOKEN_DESCRIPTION_MAP.ETH : TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

              return $tokenLabelFromSummary(tokenDesc)
            }),
            list: [
              AddressZero,
              ARBITRUM_ADDRESS.NATIVE_TOKEN,
              ARBITRUM_ADDRESS.LINK,
              ARBITRUM_ADDRESS.UNI,
              ARBITRUM_ADDRESS.WBTC,
            ],
          }
        })({
          select: selectInputTether()
        }),
      ),
      
      $LeverageSlider({ value: now(0) })({
        change: changeLeverageTether()
      }),
      $field(
        O(
          map(node =>
            merge(
              now(node),
              filter(() => false, tap(val => {
              // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                node.element.value = String(val)
              }, snapshot((inpVal, lev) => inpVal * lev, changeInput, changeLeverage)))
            )
          ),
          switchLatest
        )
        
      )(),


      // $text(map(String, startWith(0, changeLeverage)))
    ),

    {

    }
  ]
})



export interface Slider extends Input<number> {
  max?: number
  thumbSize?: number
}

export const $LeverageSlider = ({ value, max = 30, thumbSize = 34 }: Slider) => component((
  [sliderDimension, sliderDimensionTether]: Behavior<IBranch<HTMLInputElement>, number>,
  [thumbePositionDelta, thumbePositionDeltaTether]: Behavior<IBranch<HTMLInputElement>, number>
) => {


  const leverage = combine((slider, thumb) => (thumb / slider) * max, sliderDimension, thumbePositionDelta)

  const isBull = skipRepeats(map(n => {
    if (n === 0) {
      return null
    }
    
    return n > 0 ? false : true
  }, thumbePositionDelta))

  const sizePx = thumbSize + 'px'


  const $range = $row(sliderDimensionTether(observer.resize({}), map(res => res[0].contentRect.width)), style({ placeContent: 'center', backgroundColor: pallete.background, height: '2px', position: 'relative', zIndex: 10 }))

  const changeBehavior = thumbePositionDeltaTether(
    nodeEvent('pointerdown'),
    snapshot((current, downEvent) => {

      const target = downEvent.currentTarget

      if (!(target instanceof HTMLElement)) {
        throw new Error('no target event captured')
      }

      const drag = until(eventElementTarget('pointerup', window.document), eventElementTarget('pointermove', window.document))

      return map(moveEvent => {

        const maxWidth = target.parentElement!.parentElement!.clientWidth

        const deltaX = ((moveEvent.clientX - downEvent.clientX) * 2) + current

        moveEvent.preventDefault()


        return Math.abs(deltaX) > maxWidth ? deltaX > 0 ? maxWidth : -maxWidth : deltaX

      }, drag)
    }, mergeArray([now(0), multicast(thumbePositionDelta)])),
    join
  )

  const $thumb = $row(
    changeBehavior,
    style({
      width: thumbSize + 'px',
      height: thumbSize + 'px',
      position: 'absolute',
      background: pallete.background,
      borderRadius: '50%',
      cursor: 'grab',
      left: '-15px',
      alignItems: 'center',
      placeContent: 'center',
      border: `1px solid ${pallete.foreground}`,
    }),

    styleInline(map(isBull => {

      console.log(isBull)
      if (isBull === null) {
        return { border: `1px solid ${pallete.foreground}` }
      }

      return isBull ? { left: `-${thumbSize / 2}px`, right: 'auto', border: `1px solid ${pallete.negative}` } : { left: 'auto', right: `-${thumbSize / 2}px`, border: `1px solid ${pallete.positive}` }
    }, isBull))
  )(
    $text(style({ fontSize: '11px' }))(map(n => readableNumber(Math.abs(n), 1), leverage))
  )


  const sliderStyle = styleInline(map(n => {
    const width = Math.abs(n) + 'px'
    const background = n === 0 ? '' : n > 0 ? `linear-gradient(90deg, transparent 10%, ${pallete.positive} 100%)` : `linear-gradient(90deg, ${pallete.negative} 0%, transparent 100%)`

    return { width, background }
  }, thumbePositionDelta))


  return [
    $range(
      $row(style({ alignItems: 'center', position: 'relative' }), sliderStyle)(
        $thumb
      )
    ),
    { change: leverage }
  ]
})
