import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { $node, $text, component, eventElementTarget, INode, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import { AddressZero, ARBITRUM_ADDRESS, ARBITRUM_ADDRESS_LEVERAGE, formatFixed, IAccountTradeListParamApi, intervalTimeMap, IPricefeed, IPricefeedParamApi, IPriceLatestMap, isTradeOpen, ITrade, unixTimestampNow, IRequestTradeQueryparam, getLiquidationPriceFromDelta, calculatePositionDelta, getChainName, ITradeOpen, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, TradeAddress, ARBITRUM_ADDRESS_TRADE, USD_PERCISION, ADDRESS_LEVERAGE, BASIS_POINTS_DIVISOR, getMultiplier, MAX_LEVERAGE_NORMAL } from "@gambitdao/gmx-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { combine, constant, filter, map, mergeArray, multicast, now, periodic, scan, skipRepeats, snapshot, switchLatest, tap, throttle, debounce, startWith } from "@most/core"
import { pallete } from "@aelea/ui-components-theme"
import { $arrowsFlip, $Link, $RiskLiquidator } from "@gambitdao/ui-components"
import { CandlestickData, CrosshairMode, LineStyle, Time } from "lightweight-charts"
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
import { $iconCircular } from "../elements/$common"
import { getTokenDescription } from "../components/trade/utils"



export interface ITradeComponent {
  parentStore: <T, TK extends string>(key: TK, intitialState: T) => state.BrowserStore<T, TK>
  parentRoute: Route
  accountTradeList: Stream<ITrade[]>
  trade: Stream<ITrade | null>
  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">
  pricefeed: Stream<IPricefeed[]>
  latestPriceMap: Stream<IPriceLatestMap>
}

export const $Trade = (config: ITradeComponent) => component((
  [selectTimeFrame, selectTimeFrameTether]: Behavior<intervalTimeMap, intervalTimeMap>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider, IEthereumProvider>,

  [selectDepositToken, selectDepositTokenTether]: Behavior<TradeAddress, TradeAddress>,
  [selectCollateralToken, selectCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_TRADE, ARBITRUM_ADDRESS_TRADE>,
  [selectIndexToken, selectIndexTokenTether]: Behavior<ARBITRUM_ADDRESS_LEVERAGE, ARBITRUM_ADDRESS_LEVERAGE>,
  [changeLeverage, changeLeverageTether]: Behavior<number, number>,

  [editMode, editModeTether]: Behavior<boolean, boolean>,
  [focusFactor, focusFactorTether]: Behavior<number, number>,


  [effectChangeCollateral, effectChangeCollateralTether]: Behavior<bigint, bigint>,
  [effectChangeSize, effectChangeSizeTether]: Behavior<bigint, bigint>,
  [switchTrade, switchTradeTether]: Behavior<INode, ITrade>,
) => {


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



  const timeFrameStore = config.parentStore('portfolio-chart-interval', intervalTimeMap.MIN60)
  const depositTokenStore = config.parentStore<TradeAddress, 'depositToken'>('depositToken', AddressZero)
  const leverageStore = config.parentStore('leverage', 1)
  const collateralTokenStore = config.parentStore<ARBITRUM_ADDRESS_TRADE, 'collateralToken'>('collateralToken', ARBITRUM_ADDRESS.NATIVE_TOKEN)
  const indexTokenStore = config.parentStore<ARBITRUM_ADDRESS_LEVERAGE, 'indexToken'>('indexToken', ARBITRUM_ADDRESS.NATIVE_TOKEN)
  const editModeStore = config.parentStore('isReduce', false)
  const focusFactorStore = config.parentStore('focusFactor', 0)

  const accountTradeList = multicast(filter(list => list.length > 0, config.accountTradeList))

  const openTradeList = map(list => list.filter(isTradeOpen), accountTradeList)

  const depositTokenState = replayLatest(depositTokenStore.store(selectDepositToken, map(x => x)), depositTokenStore.state)
  const timeFrameState = replayLatest(timeFrameStore.store(selectTimeFrame, map(x => x)), timeFrameStore.state)
  const editModeState = replayLatest(editModeStore.store(editMode, map(x => x)), editModeStore.state)
  const focusFactorState = replayLatest(focusFactorStore.store(focusFactor, map(x => x)), focusFactorStore.state)


  const collateralTokenState = replayLatest(collateralTokenStore.store(mergeArray([map(t => t.collateralToken, switchTrade), selectCollateralToken]), map(x => x)), collateralTokenStore.state)
  const indexTokenState = replayLatest(indexTokenStore.store(mergeArray([map(t => t.indexToken, switchTrade), selectIndexToken]), map(x => x)), indexTokenStore.state)

  const collateralState = replayLatest(effectChangeCollateral, 0n)
  const sizeState = replayLatest(effectChangeSize, 0n)


  const depositTokenPrice = skipRepeats(switchLatest(map(address => pricefeed.getLatestPrice(address), depositTokenState)))
  const indexTokenPrice = skipRepeats(switchLatest(map(address => pricefeed.getLatestPrice(address), indexTokenState)))
  const collateralTokenPrice = skipRepeats(switchLatest(map(address => pricefeed.getLatestPrice(address), collateralTokenState)))


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


  

  const isLong = skipRepeats(map(lev => lev >= 0, mergeArray([now(1), changeLeverage])))


  // const activePositionIndexToken = 

  const requestPosition = debounce(150, combineObject({ account: config.walletLink.account, collateralTokenState, indexTokenState, isLong }))


  const vaultPosition = replayLatest(multicast(switchLatest(map(({ account, collateralTokenState, indexTokenState, isLong }) => {
    if (account === null) {
      throw new Error('no account')
    }

    const activeToken = isLong ? indexTokenState : collateralTokenState

    return vault.getPosition(account, isLong, activeToken, indexTokenState)
  }, requestPosition))), null)

  const leverageState = mergeArray([
    changeLeverage,
    map(trade => {
      if (!trade) {
        return 0
      }

      return getMultiplier(trade.size, trade.collateral) / MAX_LEVERAGE_NORMAL
    }, vaultPosition)
  ])

  const timeFrameLabl = {
    [intervalTimeMap.MIN5]: '5m',
    [intervalTimeMap.MIN15]: '15m',
    [intervalTimeMap.MIN60]: '1h',
    [intervalTimeMap.HR4]: 'h4',
    [intervalTimeMap.HR24]: '1d',
  }

  const newLocal = snapshot(({ currentPosition, timeframeState }, pricefeed) => {
    return { currentPosition, timeframeState, pricefeed }
  }, combineObject({ timeframeState: timeFrameState, currentPosition: vaultPosition }), config.pricefeed)
  return [
    $container(
      $column(layoutSheet.spacingBig, style({ flex: 1 }))(

        $TradeBox({
          chain,
          walletStore: config.walletStore,
          walletLink: config.walletLink,
          state: {
            trade: config.trade,
            depositTokenPrice,
            indexTokenPrice,
            collateralTokenPrice,
            vaultPosition,
            focusFactor: focusFactorState,
            editMode: editModeState,
            depositToken: depositTokenState,
            collateralToken: collateralTokenState,
            indexToken: indexTokenState,
            leverage: leverageState,

            collateral: collateralState,
            size: sizeState
          }
        })({
          changeDepositToken: selectDepositTokenTether(),
          changeLeverage: changeLeverageTether(),
          editMode: editModeTether(),
          changeCollateral: effectChangeCollateralTether(),
          changeSize: effectChangeSizeTether(),
          changeCollateralToken: selectCollateralTokenTether(),
          changeIndexToken: selectIndexTokenTether(),
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
            {
              $head: $text('Switch'),
              columnOp: style({ flex: 2, placeContent: 'center', maxWidth: '80px' }),
              $body: map((trade) => {

                const clickSwitchBehavior = switchTradeTether(
                  nodeEvent('click'),
                  constant(trade),
                )

                return $row(styleBehavior(map(pos => pos && pos.key === trade.key ? { pointerEvents: 'none', opacity: '0.3' } : {}, vaultPosition)))(
                  clickSwitchBehavior(
                    style({ height: '28px', width: '28px' }, $iconCircular($arrowsFlip, pallete.horizon))
                  )
                )
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
          switchLatest(combineArray(({ timeframeState, currentPosition, pricefeed: data }) => {
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


                setTimeout(() => {
                  const timeScale = api.timeScale()
                  timeScale.fitContent()

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

                    series.createPriceLine({
                      price: formatFixed(currentPosition.averagePrice, 30),
                      color: pallete.middleground,
                      lineVisible: true,
                      lineWidth: 1,
                      axisLabelVisible: true,
                      title: `Entry`,
                      lineStyle: LineStyle.SparseDotted,
                    })

                  }
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
          }, newLocal))
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
      changeRoute,
      walletChange
    }
  ]
})
