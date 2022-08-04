import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { $node, $text, component, eventElementTarget, IBranch, style, styleBehavior } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { AddressZero, ADDRESS_LEVERAGE, ARBITRUM_ADDRESS, ARBITRUM_ADDRESS_LEVERAGE, formatFixed, IAccountTradeListParamApi, intervalTimeMap, IPricefeed, IPricefeedParamApi, IPriceLatestMap, isTradeOpen, ITrade, unixTimestampNow, IRequestTradeQueryparam, getLiquidationPriceFromDelta, calculatePositionDelta, getChainName, ITradeOpen, CHAIN_TOKEN_ADDRESS_TO_SYMBOL } from "@gambitdao/gmx-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { combine, constant, delay, filter, map, multicast, periodic, scan, skipRepeats, snapshot, switchLatest, tap } from "@most/core"
import { pallete } from "@aelea/ui-components-theme"
import { $Link, $RiskLiquidator } from "@gambitdao/ui-components"
import { CandlestickData, CrosshairMode, LineStyle, MouseEventParams, Time } from "lightweight-charts"
import { IEthereumProvider } from "eip1193-provider"
import { Stream } from "@most/types"
import { $Chart } from "../components/chart/$Chart"
import { WALLET } from "../logic/provider"
import { connectPricefeed, connectTrade, connectVault } from "../logic/contract/trade"
import { $TradeBox } from "../components/trade/$TradeBox"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { $ButtonToggle } from "../common/$Toggle"
import { $Table2 } from "../common/$Table2"
import { $Entry, $livePnl } from "./$Leaderboard"



export interface ITradeComponent {
  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>
  parentRoute: Route
  accountTradeList: Stream<ITrade[]>
  trade: Stream<ITrade | null>
  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">
  pricefeed: Stream<IPricefeed[]>
  latestPriceMap: Stream<IPriceLatestMap>
}

export const $Trade = (config: ITradeComponent) => component((
  [pnlCrosshairMove, pnlCrosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [selectTimeFrame, selectTimeFrameTether]: Behavior<intervalTimeMap, intervalTimeMap>,
  [selectedTokenChange, selectedTokenChangeTether]: Behavior<IBranch, ADDRESS_LEVERAGE>,
  [selectOtherTimeframe, selectOtherTimeframeTether]: Behavior<IBranch, intervalTimeMap>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider, IEthereumProvider>,
  [requestTradePricefeed, requestTradePricefeedTether]: Behavior<IPricefeedParamApi, IPricefeedParamApi>,

  [selectCollateralToken, selectCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_LEVERAGE, ARBITRUM_ADDRESS_LEVERAGE>,
  [selectSizeToken, selectSizeTokenTether]: Behavior<ARBITRUM_ADDRESS_LEVERAGE, ARBITRUM_ADDRESS_LEVERAGE>,

  // [changeDirectionDiv, changeDirectionDivTether]: Behavior<number, number>,
  [changeLeverage, changeLeverageTether]: Behavior<number, number>,
  [switchReduce, switchReduceTether]: Behavior<boolean, boolean>,
  // [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,
  [focusFactor, focusFactorTether]: Behavior<number, number>,

) => {

  // inputTrade.store(src, map(x => x))

  const trade = connectTrade(config.walletLink)
  const pricefeed = connectPricefeed(config.walletLink)
  const vault = connectVault(config.walletLink)


  const chain = USE_CHAIN

  const account = map(address => {
    if (!address) {
      throw new Error('No account connected')
    }

    return address
  }, config.walletLink.account)



  // const directionDivStore = config.parentStore('sizeRatio', .5)
  const timeFrameStore = config.parentStore('portfolio-chart-interval', intervalTimeMap.MIN60)
  const collateralTokenStore = config.parentStore('selectCollateralToken', AddressZero as ARBITRUM_ADDRESS_LEVERAGE)
  const sizeTokenStore = config.parentStore<ARBITRUM_ADDRESS_LEVERAGE, ARBITRUM_ADDRESS_LEVERAGE>('output-trade', ARBITRUM_ADDRESS.NATIVE_TOKEN)
  const leverageStore = config.parentStore('leverage', 1)
  // const isLongStore = config.parentStore('isLong', true)
  const switchReduceStore = config.parentStore('isReduce', false)
  const focusFactorStore = config.parentStore('focusFactor', 0)

  const accountTradeList = multicast(filter(list => list.length > 0, config.accountTradeList))

  const openTradeList = map(list => list.filter(isTradeOpen), accountTradeList)

  const collateralTokenState = replayLatest(collateralTokenStore.store(selectCollateralToken, map(x => x)), collateralTokenStore.state)
  // const directionDivState = replayLatest(directionDivStore.store(changeDirectionDiv, map(x => x)), directionDivStore.state)
  const timeFrameState = replayLatest(timeFrameStore.store(selectTimeFrame, map(x => x)), timeFrameStore.state)
  const indexTokenState = replayLatest(sizeTokenStore.store(selectSizeToken, map(x => x)), sizeTokenStore.state)
  const leverageState = replayLatest(leverageStore.store(changeLeverage, map(x => x)), leverageStore.state)
  // const isLongState = replayLatest(isLongStore.store(switchIsLong, map(x => x)), isLongStore.state)
  const switchReduceState = replayLatest(switchReduceStore.store(switchReduce, map(x => x)), switchReduceStore.state)
  const focusFactorState = replayLatest(focusFactorStore.store(focusFactor, map(x => x)), focusFactorStore.state)


  const collateralTokenPrice = skipRepeats(switchLatest(map(address => pricefeed.getLatestPrice(address), collateralTokenState)))
  const indexTokenPrice = skipRepeats(switchLatest(map(address => pricefeed.getLatestPrice(address), indexTokenState)))


  const $container = screenUtils.isDesktopScreen
    ? $row(style({ flexDirection: 'row-reverse', gap: '70px' }))
    : $column

  const chartContainerStyle = style({
    backgroundImage: `radial-gradient(at right center, ${pallete.background} 50%, transparent)`,
    background: pallete.background
  })
  const $chartContainer = screenUtils.isDesktopScreen
    ? $node(
      chartContainerStyle,
      style({
        position: 'fixed', inset: '120px 0px 0px', width: 'calc(50vw)', display: 'flex',
      }),
      styleBehavior(map(interesction => {

        const target = interesction.target

        if (target instanceof HTMLElement) {
          return { inset: `${120 - Math.min(120, target.scrollTop)}px 120px 0px 0px` }
        } else {
          throw new Error('scroll target is not an elemnt')
        }
        
      }, eventElementTarget('scroll', document.body.children[0])))
    )
    : $column(chartContainerStyle)



  const isLong = skipRepeats(map(lev => lev > 0, leverageState))

  const vaultPosition = replayLatest(multicast(switchLatest(combineArray((account, collateralToken, indexToken, isLong) => {
    if (account === null) {
      throw new Error('no account')
    }

    return vault.getPosition(account, isLong, collateralToken, indexToken)
  }, config.walletLink.account, collateralTokenState, indexTokenState, isLong))))



  const timeFrameLabl = {
    [intervalTimeMap.MIN5]: '5m',
    [intervalTimeMap.MIN15]: '15m',
    [intervalTimeMap.MIN60]: '1h',
    [intervalTimeMap.HR4]: 'h4',
    [intervalTimeMap.HR24]: '1d',
  }


  return [
    $container(
      $column(layoutSheet.spacingBig, style({ flex: 1 }))(

        $TradeBox({
          chain,
          walletStore: config.walletStore,
          walletLink: config.walletLink,
          state: {
            trade: config.trade,
            collateralTokenPrice,
            indexTokenPrice,
            vaultPosition,
            focusFactor: focusFactorState,
            // isLong: isLongState,
            switchReduce: switchReduceState,
            collateralToken: collateralTokenState,
            sizeToken: indexTokenState,
            leverage: leverageState,
            // directionDiv: directionDivState
          }
        })({
          changeInputAddress: selectCollateralTokenTether(),
          changeOutputAddress: selectSizeTokenTether(),
          changeLeverage: changeLeverageTether(),
          switchReduce: switchReduceTether(),
          // directionDiv: changeDirectionDivTether(),
          focusFactor: focusFactorTether(),
        }),

        $node(),

        $Table2<ITradeOpen>({
          bodyContainerOp: layoutSheet.spacing,
          scrollConfig: {
            containerOps: O(layoutSheet.spacingBig)
          },
          dataSource: openTradeList,
          columns: [
            {
              $head: $text('Entry'),
              columnOp: O(style({ maxWidth: '65px', flexDirection: 'column' }), layoutSheet.spacingTiny),
              $body: map((pos) => {
                return $Link({
                  anchorOp: style({ position: 'relative' }),
                  $content: style({ pointerEvents: 'none' }, $Entry(pos)),
                  url: `/${getChainName(chain).toLowerCase()}/${CHAIN_TOKEN_ADDRESS_TO_SYMBOL[pos.indexToken]}/${pos.id}/${pos.timestamp}`,
                  route: config.parentRoute.create({ fragment: '2121212' })
                })({ click: changeRouteTether() })
              })
            },
            {
              $head: $text('Risk'),
              columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, alignItems: 'center', placeContent: 'center', minWidth: '80px' })),
              $body: map(trade => {
                const positionMarkPrice = pricefeed.getLatestPrice(trade.indexToken)

                return $RiskLiquidator(trade, positionMarkPrice)({})
              })
            },
            {
              $head: $text('PnL $'),
              columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '160px' }),
              $body: map((trade) => {
                const newLocal = pricefeed.getLatestPrice(trade.indexToken)
                return $livePnl(trade, newLocal)
              })
            },
          ],
        })({}),

      ),
      $column(style({ position: 'relative', flex: 1 }))(
        $chartContainer(
          $row(layoutSheet.spacing, style({ fontSize: '0.85em', zIndex: 10, position: 'absolute', padding: '8px', placeContent: 'center' }))(
            $ButtonToggle({
              selected: timeFrameState,
              options: [
                intervalTimeMap.MIN5,
                intervalTimeMap.MIN15,
                intervalTimeMap.MIN60,
                intervalTimeMap.HR4,
                intervalTimeMap.HR24,
              ],
              $$option: map(option => {
                // @ts-ignore
                const newLocal: string = timeFrameLabl[option]

                return $text(newLocal)
              })
            })({ select: selectTimeFrameTether() }),
          ),
          switchLatest(snapshot(({ timeframeState, currentPosition }, data) => {
            console.log(timeframeState)
            const lastData = data[data.length - 1]

            const intialTimeseed: CandlestickData = {
              open: formatFixed(lastData.o, 30),
              high: formatFixed(lastData.h, 30),
              low: formatFixed(lastData.l, 30),
              close: formatFixed(lastData.c, 30),
              time: lastData.timestamp as Time
            }

            return $Chart({
              realtimeSource: scan((latest, price): CandlestickData => {

                const nextTime = unixTimestampNow()
                const nextTimeslot = Math.floor(nextTime / timeframeState)

                const currentTimeSlot = Math.floor(Number(latest.time) / timeframeState)
                const priceFormatted = formatFixed(price, 30)

                if (nextTimeslot > currentTimeSlot) {
                  return {
                    close: priceFormatted,
                    high: priceFormatted,
                    low: priceFormatted,
                    open: priceFormatted,
                    time: nextTimeslot * timeframeState as Time
                  }
                }


                return {
                  open: latest.open,
                  high: priceFormatted > latest.high ? priceFormatted : latest.high,
                  low: priceFormatted < latest.low ? priceFormatted : latest.low,
                  close: priceFormatted,
                  time: nextTimeslot * timeframeState as Time
                }
              }, intialTimeseed, indexTokenPrice),
              initializeSeries: map(api => {


                const endDate = unixTimestampNow()
                const startDate = endDate - timeframeState
                const series = api.addCandlestickSeries({
                  upColor: pallete.foreground,
                  downColor: 'transparent',
                  priceLineColor: pallete.message,
                  baseLineStyle: LineStyle.LargeDashed,
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


                if (currentPosition) {
                  const liquidationPrice = getLiquidationPriceFromDelta(currentPosition.collateral, currentPosition.size, currentPosition.averagePrice, currentPosition.isLong)
                  const posDelta = calculatePositionDelta(liquidationPrice, currentPosition.averagePrice, currentPosition.isLong, currentPosition)
                  const formatedLiqPrice = formatFixed(liquidationPrice, 30)



                  series.createPriceLine({
                    price: formatedLiqPrice,
                    color: pallete.negative,
                    lineVisible: true,
                    lineWidth: 1,
                    axisLabelVisible: true,
                    title: `Liquidation`,
                    lineStyle: LineStyle.SparseDotted,
                  })

                }


                setTimeout(() => {
                  const timeScale = api.timeScale()
                  timeScale.fitContent()

                  // const www = series.coordinateToPrice(1000)
                }, 55)

                return series
              }),
              containerOp: style({
                minHeight: '150px',
                width: '100%',
              }),
              chartConfig: {
                rightPriceScale: {
                  visible: true,
                  entireTextOnly: true,
                  borderVisible: false,
                  // autoScale: true,
                  // mode: PriceScaleMode.Logarithmic
                  // visible: false
                },
                timeScale: {
                  timeVisible: timeframeState <= intervalTimeMap.DAY7,
                  secondsVisible: timeframeState <= intervalTimeMap.MIN60,
                  borderVisible: true,
                  rightOffset: 10,
                  shiftVisibleRangeOnNewBar: true,
                  borderColor: pallete.middleground,
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
          }, combineObject({
            timeframeState: timeFrameState, currentPosition: vaultPosition }), config.pricefeed))
        ),
      )
    ),

    {
      requestPricefeed: combine((tokenAddress, selectedInterval): IPricefeedParamApi => {
        const range = selectedInterval * 150

        const to = unixTimestampNow()
        const from = to - range

        const interval = selectedInterval

        return { chain, interval, tokenAddress, from, to }
      }, indexTokenState, timeFrameState),
      requestAccountTradeList: map((address): IAccountTradeListParamApi => {
        return {
          account: address,
          // timeInterval: timeFrameStore.state,
          chain,
        }
      }, account),
      requestLatestPriceMap: constant({ chain }, periodic(5000)),
      requestTrade: map(pos => pos ? <IRequestTradeQueryparam>{ id: 'Trade:' + pos.key, chain: USE_CHAIN } : null, vaultPosition),
      requestTradePricefeed,
      changeRoute,
      walletChange
    }
  ]
})
