import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { $node, $text, component, eventElementTarget, INode, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils, state } from "@aelea/ui-components"
import {
  AddressZero, ARBITRUM_ADDRESS, ARBITRUM_ADDRESS_LEVERAGE, formatFixed, IAccountTradeListParamApi, intervalTimeMap, IPricefeed, IPricefeedParamApi, IPriceLatestMap, isTradeOpen, ITrade, unixTimestampNow, IRequestTradeQueryparam, getChainName,
  ITradeOpen, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, TradeAddress, ARBITRUM_ADDRESS_TRADE, BASIS_POINTS_DIVISOR, getAveragePriceFromDelta, getDelta,
  getLiquidationPrice, getMarginFees, getTokenUsd, STABLE_SWAP_FEE_BASIS_POINTS, STABLE_TAX_BASIS_POINTS, SWAP_FEE_BASIS_POINTS, TAX_BASIS_POINTS, replayState
} from "@gambitdao/gmx-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { combine, constant, filter, map, mergeArray, multicast, periodic, scan, skipRepeats, switchLatest, debounce, empty, skip, awaitPromises, tap } from "@most/core"
import { pallete } from "@aelea/ui-components-theme"
import { $arrowsFlip, $Link, $RiskLiquidator } from "@gambitdao/ui-components"
import { CandlestickData, CrosshairMode, LineStyle, Time } from "lightweight-charts"
import { IEthereumProvider } from "eip1193-provider"
import { Stream } from "@most/types"
import { WALLET } from "../logic/provider"
import { connectPricefeed, connectTrade, connectVault } from "../logic/contract/trade"
import { $TradeBox } from "../components/trade/$TradeBox"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { $ButtonToggle } from "../common/$Toggle"
import { $Table2 } from "../common/$Table2"
import { $Entry, $livePnl } from "./$Leaderboard"
import { $iconCircular } from "../elements/$common"
import { $CandleSticks } from "../components/chart/$CandleSticks"
import { CHAIN_NATIVE_TO_ADDRESS, getFeeBasisPoints, getTokenDescription } from "../components/trade/utils"
import { ERC20__factory } from "@gambitdao/gbc-contracts"
import { BrowserStore } from "../logic/store"


export interface ITradeComponent {
  store: BrowserStore<string, "ROOT">
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

  [changeInputToken, changeInputTokenTether]: Behavior<TradeAddress, TradeAddress>,
  [changeIndexToken, changeIndexTokenTether]: Behavior<ARBITRUM_ADDRESS_LEVERAGE, ARBITRUM_ADDRESS_LEVERAGE>,
  [changeCollateralToken, changeCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_TRADE, ARBITRUM_ADDRESS_TRADE>,
  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,
  [switchIsIncrease, switchIsIncreaseTether]: Behavior<boolean, boolean>,
  // [changeFocusFactor, changeFocusFactorTether]: Behavior<number, number>,
  [changeCollateral, changeCollateralTether]: Behavior<bigint, bigint>,
  // [slideCollateralRatio, slideCollateralRatioTether]: Behavior<number, number>,

  [changeSize, changeSizeTether]: Behavior<bigint, bigint>,
  [changeLeverage, changeLeverageTether]: Behavior<number, number>,
  [changeCollateralRatio, changeCollateralRatioTether]: Behavior<number, number>,

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




  const tradingStore = config.store.craete('trade', 'tradeBox')

  const timeFrameStore = tradingStore.craete('portfolio-chart-interval', intervalTimeMap.MIN60)

  const isLongStore = tradingStore.craete('isLong', true)
  const inputTokenStore = tradingStore.craete<TradeAddress, 'depositToken'>('depositToken', AddressZero)
  const collateralTokenStore = tradingStore.craete<ARBITRUM_ADDRESS_TRADE, 'collateralToken'>('collateralToken', ARBITRUM_ADDRESS.NATIVE_TOKEN)
  const indexTokenStore = tradingStore.craete<ARBITRUM_ADDRESS_LEVERAGE, 'indexToken'>('indexToken', ARBITRUM_ADDRESS.NATIVE_TOKEN)
  const isIncreaseStore = tradingStore.craete('isIncrease', true)



  const accountTradeList = multicast(filter(list => list.length > 0, config.accountTradeList))
  const openTradeList = map(list => list.filter(isTradeOpen), accountTradeList)

  const timeframe = replayLatest(timeFrameStore.store(selectTimeFrame, map(x => x)), timeFrameStore.state)

  const isLong = replayLatest(isLongStore.store(mergeArray([map(t => t.isLong, switchTrade), switchIsLong]), map(x => x)), isLongStore.state)
  const isIncrease = replayLatest(isIncreaseStore.store(switchIsIncrease, map(x => x)), isIncreaseStore.state)
  const inputToken = replayLatest(inputTokenStore.store(changeInputToken, map(x => x)), inputTokenStore.state)
  const collateralToken = replayLatest(collateralTokenStore.store(changeCollateralToken, map(x => x)), collateralTokenStore.state)
  const indexToken = replayLatest(indexTokenStore.store(changeIndexToken, map(x => x)), indexTokenStore.state)
  const leverage = replayLatest(changeLeverage, 0)
  const collateral = replayLatest(changeCollateral, 0n)
  const size = replayLatest(changeSize, 0n)
  const collateralRatio = replayLatest(changeCollateralRatio, 0)


  const tradeParams = { isLong, isIncrease, inputToken, collateralToken, indexToken, leverage, collateral, size, collateralRatio, }
  const tradeParamsState = replayState(tradeParams)


  const inputTokenPrice = replayLatest(skipRepeats(switchLatest(map(address => pricefeed.getLatestPrice(address), inputToken))))
  const indexTokenPrice = replayLatest(skipRepeats(switchLatest(map(address => pricefeed.getLatestPrice(address), indexToken))))
  const collateralTokenPrice = replayLatest(skipRepeats(switchLatest(map(address => pricefeed.getLatestPrice(address), collateralToken))))



  const executionFee = multicast(trade.executionFee)

  const inputTokenWeight = switchLatest(map(address => {
    if (address === AddressZero) {
      return vault.getTokenWeight(CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN])
    }

    return vault.getTokenWeight(address)
  }, inputToken))

  const inputTokenDebtUsd = switchLatest(map(address => {
    if (address === AddressZero) {
      return vault.getTokenDebtUsd(CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN])
    }

    return vault.getTokenDebtUsd(address)
  }, inputToken))

  const indexTokenWeight = switchLatest(map(address => vault.getTokenWeight(address), indexToken))
  const indexTokenDebtUsd = switchLatest(map(address => vault.getTokenDebtUsd(address), indexToken))
  const indexTokenCumulativeFundingRate = switchLatest(map(address => vault.getTokenCumulativeFundingRate(address), indexToken))

  const walletBalance = replayLatest(multicast(awaitPromises(combineArray(async (inp, w3p, account) => {
    if (w3p === null || account === null) {
      throw new Error('no wallet provided')
    }
    if (inp === AddressZero) {
      return (await w3p.getSigner().getBalance()).toBigInt()
    }

    const ercp = ERC20__factory.connect(inp, w3p.getSigner())

    return (await ercp.balanceOf(account)).toBigInt()
  }, inputToken, config.walletLink.provider, config.walletLink.account))))

  const inputTokenDescription = map(address => getTokenDescription(USE_CHAIN, address), inputToken)
  const indexTokenDescription = map(address => getTokenDescription(USE_CHAIN, address), indexToken)
  const collateralTokenDescription = map(address => getTokenDescription(USE_CHAIN, address), collateralToken)


  const requestPosition = debounce(50, combineObject({ account: config.walletLink.account, collateralToken, indexToken, isLong }))

  const vaultPosition = replayLatest(multicast(switchLatest(map(({ account, collateralToken, indexToken, isLong }) => {
    if (account === null) {
      throw new Error('no account')
    }

    const activeToken = isLong ? indexToken : collateralToken

    return vault.getPosition(account, isLong, activeToken, indexToken)
  }, requestPosition))), null)


  const swapFee = skipRepeats(combineArray((usdgSupply, totalTokenWeight, tradeParams, vaultPosition, swapTokenDebt, swapTokenWeight, toTokenDebt, toTokenWeight, fromTokenDescription, toTokenDescription, indexTokenPrice) => {
    const swapFeeBasisPoints = fromTokenDescription.isStable && toTokenDescription.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = fromTokenDescription.isStable && toTokenDescription.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS

    const swapTokenNorm = tradeParams.inputToken === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : tradeParams.inputToken

    if (swapTokenNorm === tradeParams.indexToken) {
      return 0n
    }

    const adjustedPnlDelta = vaultPosition
      ? getDelta(vaultPosition.averagePrice, indexTokenPrice, vaultPosition.size) * tradeParams.size / vaultPosition.size
      : 0n
    // const amountUsd = collateralUsd + (adjustedPnlDelta > 0n ? adjustedPnlDelta : 0n)


    // const amountUsd = collateralUsd
    // const usdgAmount = amountUsd * getDenominator(fromTokenDescription.decimals) / USD_PERCISION

    const feeBps0 = getFeeBasisPoints(
      swapTokenDebt,
      swapTokenWeight,
      tradeParams.collateral,
      swapFeeBasisPoints,
      taxBasisPoints,
      true,
      usdgSupply,
      totalTokenWeight
    )
    const feeBps1 = getFeeBasisPoints(
      toTokenDebt,
      toTokenWeight,
      tradeParams.collateral,
      swapFeeBasisPoints,
      taxBasisPoints,
      false,
      usdgSupply,
      totalTokenWeight
    )

    const feeBps = feeBps0 > feeBps1 ? feeBps0 : feeBps1
    const addedSwapFee = feeBps ? tradeParams.collateral * feeBps / BASIS_POINTS_DIVISOR : 0n

    return addedSwapFee
  }, vault.usdgSupply, vault.totalTokenWeight, tradeParamsState, vaultPosition, inputTokenDebtUsd, inputTokenWeight, indexTokenDebtUsd, indexTokenWeight, inputTokenDescription, indexTokenDescription, indexTokenPrice))

  const marginFee = combineArray((isIncrease, size) => isIncrease ? getMarginFees(size) : 0n, isIncrease, size)

  const fee = combine((swap, margin) => swap + margin, swapFee, marginFee)



  const collateralUsd = map(params => {
    // const posCollateral = params.vaultPosition?.collateral || 0n

    // if (params.isIncrease) {
    //   return posCollateral + getTokenUsd(params.collateral, params.inputTokenPrice, params.inputTokenDescription) - params.fee
    // }

    // if (!params.vaultPosition || params.size === params.vaultPosition.size) {
    //   return 0n
    // }




    if (params.isIncrease) {
      return getTokenUsd(params.collateral, params.inputTokenPrice, params.inputTokenDescription)
    }

    if (!params.vaultPosition) {
      return 0n
    }

    const pnl = getDelta(params.vaultPosition.averagePrice, params.indexTokenPrice, params.vaultPosition.size)
    const adjustedPnlDelta = pnl * params.size / params.vaultPosition.size

    const ratio = BigInt(Math.floor(Math.abs(params.collateralRatio) * Number(BASIS_POINTS_DIVISOR)))

    // const adjCollateral = adjustedPnlDelta * ratio / BASIS_POINTS_DIVISOR

    const withdrawCollateral = getTokenUsd(params.collateral, params.inputTokenPrice, params.inputTokenDescription)

    return withdrawCollateral // - adjustedPnlDelta
  }, combineObject({ isIncrease, inputTokenPrice, vaultPosition, inputTokenDescription, indexTokenPrice, collateralRatio, collateral, size, fee }))


  const averagePrice = map(params => {
    if (!params.vaultPosition) {
      return null
    }

    const nextAveragePrice = params.isIncrease
      ? getAveragePriceFromDelta(getDelta(params.vaultPosition.averagePrice, params.indexTokenPrice, params.vaultPosition.size), params.vaultPosition.size, params.indexTokenPrice, params.size)
      : params.vaultPosition.averagePrice

    return nextAveragePrice

  }, combineObject({ vaultPosition, isIncrease, indexTokenPrice, size }))

  const liquidationPrice = map(params => {
    if (params.averagePrice === null && params.collateralUsd > 0n && params.size > 0n) {
      return getLiquidationPrice(params.collateralUsd, params.size, params.indexTokenPrice, params.isLong)
    }

    if (params.averagePrice === null || !params.vaultPosition || !params.isIncrease && params.size === params.vaultPosition.size) {
      return null
    }

    const sizeDelta = params.isIncrease ? params.size : -params.size
    const collateralDelta = params.isIncrease ? params.collateralUsd : -params.collateralUsd


    const collateral = params.vaultPosition.collateral + collateralDelta
    const size = params.vaultPosition.size + sizeDelta

    return getLiquidationPrice(collateral, size, params.averagePrice, params.vaultPosition.isLong)
  }, combineObject({ vaultPosition, isIncrease, collateralUsd, size, averagePrice, indexTokenPrice, isLong }))



  // const requestTrade = snapshot((params) => {
  //   const path = resolveLongPath(params.inputToken, params.indexToken)

  //   return params.inputToken === AddressZero
  //     ? params.trade.createIncreasePositionETH(
  //       path,
  //       params.indexToken,
  //       0,
  //       params.size,
  //       params.isLong,
  //       params.indexTokenPrice,
  //       params.executionFee,
  //       '0x0000000000000000000000000000000000000000000000000000000000000000',
  //       { value: params.collateral + params.executionFee }
  //     )
  //     : params.trade.createIncreasePosition(
  //       path,
  //       params.indexToken,
  //       params.collateral,
  //       0,
  //       params.size,
  //       params.isLong,
  //       params.indexTokenPrice,
  //       params.executionFee,
  //       '0x0000000000000000000000000000000000000000000000000000000000000000',
  //       { value: params.executionFee }
  //     )
  // }, combineObject({ leverage, inputToken, indexToken, size, indexTokenPrice, collateral, executionFee, isLong, trade: trade.contract }), clickPrimary)



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



  const timeFrameLabl = {
    [intervalTimeMap.MIN5]: '5m',
    [intervalTimeMap.MIN15]: '15m',
    [intervalTimeMap.MIN60]: '1h',
    [intervalTimeMap.HR4]: 'h4',
    [intervalTimeMap.HR24]: '1d',
    [intervalTimeMap.DAY7]: '1w',
  }



  return [
    $container(style({
      fontFeatureSettings: '"tnum" on,"lnum" on', fontFamily: `-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif`,

      // fontFamily: '-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif'
    }))(
      $column(layoutSheet.spacingBig, style({ flex: 1 }))(

        $TradeBox({
          chain,
          walletStore: config.walletStore,
          walletLink: config.walletLink,
          store: tradingStore,

          tradeParams,
          state: {
            trade: config.trade,
            vaultPosition,
            collateralUsd,
            inputTokenPrice,
            indexTokenPrice,
            collateralTokenPrice,
            collateralTokenDescription,
            fee,
            indexTokenDescription,
            inputTokenDescription,
            marginFee,
            swapFee,
            averagePrice,
            liquidationPrice,
            // validationError,
            walletBalance
          },

        })({
          leverage: changeLeverageTether(),
          switchIsIncrease: switchIsIncreaseTether(),
          changeCollateral: changeCollateralTether(),
          // changeCollateralUsd: changeCollateralUsdTether(),
          changeSize: changeSizeTether(),
          changeInputToken: changeInputTokenTether(),
          changeCollateralToken: changeCollateralTokenTether(),
          changeIndexToken: changeIndexTokenTether(),
          // changeWithdrawCollateralToken: changeWithdrawCollateralTokenTether(),
          // focusFactor: changeFocusFactorTether(),
          switchIsLong: switchIsLongTether(),
          changeCollateralRatio: changeCollateralRatioTether(),
          // slideCollateralRatio: slideCollateralRatioTether(),

          walletChange: walletChangeTether()
        }),

        // $IntermediateTx({
        //   query: requestTrade,
        //   clean: combineObject(tradeParams),
        //   chain: USE_CHAIN
        // })({}),

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
              selected: timeframe,
              options: [
                intervalTimeMap.MIN5,
                intervalTimeMap.MIN15,
                intervalTimeMap.MIN60,
                intervalTimeMap.HR4,
                intervalTimeMap.HR24,
                intervalTimeMap.DAY7,
              ],
              $$option: map(option => {
                // @ts-ignore
                const newLocal: string = timeFrameLabl[option]

                return $text(newLocal)
              })
            })({ select: selectTimeFrameTether() }),
          ),

          $CandleSticks({
            series: [
              {
                seriesConfig: {
                  upColor: pallete.foreground,
                  downColor: 'transparent',
                  priceLineColor: pallete.message,
                  baseLineStyle: LineStyle.LargeDashed,
                  borderDownColor: pallete.foreground,
                  borderUpColor: pallete.foreground,
                  wickDownColor: pallete.foreground,
                  wickUpColor: pallete.foreground,
                },
                priceLines: [
                  map(val => {
                    if (val === null) {
                      return null
                    }

                    return {
                      price: formatFixed(val, 30),
                      color: pallete.middleground,
                      lineVisible: true,
                      lineWidth: 1,
                      axisLabelVisible: true,
                      title: `Entry`,
                      lineStyle: LineStyle.SparseDotted,
                    }
                  }, averagePrice),
                  map(val => {
                    if (val === null) {
                      return null
                    }

                    return {
                      price: formatFixed(val, 30),
                      color: pallete.negative,
                      lineVisible: true,
                      lineWidth: 1,
                      axisLabelVisible: true,
                      title: `Liquidation`,
                      lineStyle: LineStyle.SparseDotted,
                    }
                  }, liquidationPrice)

                ],
                appendData: map(data => {
                  if (data === null) {
                    return empty()
                  }
                  const lastData = data[data.length - 1]

                  if (!('open' in lastData)) {
                    return empty()
                  }

                  return skip(1, scan((prev, { indexTokenPrice, timeframeState }): CandlestickData => {
                    const nextTimeslot = Math.floor(unixTimestampNow() / timeframeState)
                    const time = nextTimeslot * timeframeState as Time
                    const priceFormatted = formatFixed(indexTokenPrice, 30)

                    return {
                      open: prev.open,
                      high: priceFormatted > prev.high ? priceFormatted : prev.high,
                      low: priceFormatted < prev.low ? priceFormatted : prev.low,
                      close: priceFormatted,
                      time
                    }
                  }, lastData, combineObject({ indexTokenPrice, timeframeState: timeframe })))
                }),
                data: combineArray(data => {
                  //   priceScale.applyOptions({
                  //     scaleMargins: screenUtils.isDesktopScreen
                  //       ? {
                  //         top: 0.3,
                  //         bottom: 0.3
                  //       }
                  //       : {
                  //         top: 0.1,
                  //         bottom: 0.1
                  //       }
                  //   })

                  return data.map(({ o, h, l, c, timestamp }) => {
                    const open = formatFixed(o, 30)
                    const high = formatFixed(h, 30)
                    const low = formatFixed(l, 30)
                    const close = formatFixed(c, 30)

                    return { open, high, low, close, time: timestamp as Time }
                  })
                }, config.pricefeed)
              }

            ],
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
                // timeVisible: timeframeState <= intervalTimeMap.DAY7,
                // secondsVisible: timeframeState <= intervalTimeMap.MIN60,
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
      }, indexToken, timeframe),
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
