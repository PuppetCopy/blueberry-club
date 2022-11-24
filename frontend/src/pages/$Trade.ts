import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { $node, $text, component, eventElementTarget, INode, nodeEvent, style, styleBehavior, styleInline } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import {
  AddressZero, formatFixed, intervalTimeMap, IPricefeed, IPricefeedParamApi, IPriceLatestMap,
  isTradeOpen, ITrade, unixTimestampNow, IRequestTradeQueryparam, getChainName,
  ITradeOpen, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, BASIS_POINTS_DIVISOR, getAveragePriceFromDelta,
  getLiquidationPrice, getMarginFees, getTokenUsd, STABLE_SWAP_FEE_BASIS_POINTS, STABLE_TAX_BASIS_POINTS, SWAP_FEE_BASIS_POINTS, TAX_BASIS_POINTS,
  replayState, getDenominator, USD_PERCISION, periodicRun, formatReadableUSD, timeSince, IVaultPosition, getPositionKey, IPositionIncrease,
  IPositionDecrease, getPnL, filterNull, ARBITRUM_ADDRESS_STABLE, AVALANCHE_ADDRESS_STABLE, CHAIN, AddressIndex, AddressStable, AddressInput, KeeperExecute, KeeperReject, TradeStatus
} from "@gambitdao/gmx-middleware"

import { IWalletLink } from "@gambitdao/wallet-link"
import { combine, constant, map, mergeArray, multicast, periodic, scan, skipRepeats, switchLatest, debounce, empty, now, startWith, snapshot, merge, awaitPromises, take } from "@most/core"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $arrowsFlip, $infoTooltip, $Link, $RiskLiquidator, $spinner, $txHashRef } from "@gambitdao/ui-components"
import { CandlestickData, CrosshairMode, LineStyle, Time } from "lightweight-charts"
import { IEthereumProvider } from "eip1193-provider"
import { Stream } from "@most/types"
import { connectPricefeed, connectTrade, connectVault, getErc20Balance } from "../logic/contract/trade"
import { $TradeBox, ITradeState } from "../components/trade/$TradeBox"
import { BLUEBERRY_REFFERAL_CODE } from "@gambitdao/gbc-middleware"
import { $ButtonToggle } from "../common/$Toggle"
import { $Table2 } from "../common/$Table2"
import { $Entry, $livePnl } from "./$Leaderboard"
import { $iconCircular } from "../elements/$common"
import { $CandleSticks } from "../components/chart/$CandleSticks"
import { CHAIN_NATIVE_TO_ADDRESS, getFeeBasisPoints, getTokenDescription, resolveAddress } from "../logic/utils"
import { BrowserStore } from "../logic/store"
import { ContractTransaction } from "@ethersproject/contracts"
import { globalProviderMap, WALLET } from "../logic/provider"
import { readContract } from "../logic/common"
import { PositionRouter__factory } from "../logic/contract/gmx-contracts"


export interface ITradeComponent {
  chainList: CHAIN[]
  chain: CHAIN | null,
  indexTokens: AddressIndex[]
  stableTokens: AddressStable[]
  store: BrowserStore<"ROOT.v1", "v1">
  parentRoute: Route
  accountTradeList: Stream<ITrade[]>
  walletLink: IWalletLink
  walletStore: BrowserStore<"ROOT.v1.walletStore", WALLET | null>
  pricefeed: Stream<IPricefeed[]>
}

type RequestTradeQuery = {
  ctxQuery: Promise<ContractTransaction>
  state: ITradeState
  acceptablePrice: bigint
}

type RequestTrade = {
  ctx: ContractTransaction
  state: ITradeState
  acceptablePrice: bigint
}


export const $Trade = (config: ITradeComponent) => component((
  [selectTimeFrame, selectTimeFrameTether]: Behavior<intervalTimeMap, intervalTimeMap>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider, IEthereumProvider>,

  [changeInputToken, changeInputTokenTether]: Behavior<AddressInput, AddressInput>,
  [changeIndexToken, changeIndexTokenTether]: Behavior<AddressIndex, AddressIndex>,
  [changeCollateralToken, changeCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE, ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE>,
  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,
  [switchIsIncrease, switchIsIncreaseTether]: Behavior<boolean, boolean>,
  [changeCollateralDelta, changeCollateralDeltaTether]: Behavior<bigint, bigint>,

  [changeSize, changeSizeTether]: Behavior<bigint, bigint>,
  [changeLeverage, changeLeverageTether]: Behavior<bigint, bigint>,
  [changeCollateralRatio, changeCollateralRatioTether]: Behavior<bigint, bigint>,
  [changeSlippage, changeSlippageTether]: Behavior<string, string>,

  [approveInputToken, approveInputTokenTether]: Behavior<boolean, boolean>,
  [enableTrading, enableTradingTether]: Behavior<boolean, boolean>,

  [switchTrade, switchTradeTether]: Behavior<INode, ITrade>,
  [requestTrade, requestTradeTether]: Behavior<RequestTradeQuery, RequestTradeQuery>,

) => {

  const chain = config.chain || CHAIN.ARBITRUM
  const pricefeed = connectPricefeed(config.walletLink.provider)
  const vault = connectVault(config.walletLink.provider)
  const position = connectTrade(config.walletLink.provider)

  const executionFee = multicast(position.executionFee)

  const positionRouter = readContract(PositionRouter__factory, now(globalProviderMap[chain]), 'PositionRouter')



  const tradingStore = config.store.craete('trade', 'tradeBox')

  const timeFrameStore = tradingStore.craete('portfolio-chart-interval', intervalTimeMap.MIN60)

  const isTradingEnabledStore = tradingStore.craete('isTradingEnabled', false)
  const isLongStore = tradingStore.craete('isLong', true)
  const inputTokenStore = tradingStore.craete('depositToken', AddressZero as AddressIndex)
  const shortCollateralTokenStore = tradingStore.craete('collateralToken', config.stableTokens[0] as AddressStable)
  const indexTokenStore = tradingStore.craete('indexToken', config.indexTokens[0] as AddressIndex)
  const isIncreaseStore = tradingStore.craete('isIncrease', true)
  const slippageStore = tradingStore.craete('slippage', '0.2')
  // const collateralRatioStore = tradingStore.craete('collateralRatio', 0)


  const isTradingEnabled = isTradingEnabledStore.storeReplay(enableTrading)
  const timeframe = timeFrameStore.storeReplay(selectTimeFrame)

  const isLong = isLongStore.storeReplay(mergeArray([map(t => t.isLong, switchTrade), switchIsLong]))
  const isIncrease = isIncreaseStore.storeReplay(switchIsIncrease)

  const inputToken = inputTokenStore.storeReplay(changeInputToken, map(store => {
    return [...config.indexTokens, ...config.stableTokens].indexOf(store) > -1 ? store : AddressZero
  }))
  const indexToken = indexTokenStore.storeReplay(mergeArray([map(t => t.indexToken, switchTrade), changeIndexToken]), map(store => {
    // @ts-ignore
    return config.indexTokens.indexOf(store) > -1 ? store : CHAIN_NATIVE_TO_ADDRESS[chain]
  }))


  const shortCollateralToken = shortCollateralTokenStore.storeReplay(mergeArray([map(t => t.isLong ? t.indexToken : t.collateralToken, switchTrade), changeCollateralToken]), map(state => {
    return config.stableTokens.indexOf(state) > -1 ? state : config.stableTokens[0]
  }))


  const walletBalance = replayLatest(skipRepeats(multicast(switchLatest(combineArray((token, w3p, account) => {
    return periodicRun({
      interval: 5000,
      recoverError: false,
      // startImmediate: true,
      actionOp: map(async () => getErc20Balance(token, w3p, account))
    })
  }, inputToken, config.walletLink.provider, config.walletLink.account)))))

  const collateralDelta = replayLatest(changeCollateralDelta, 0n)
  const sizeDelta = replayLatest(changeSize, 0n)

  const collateralRatio = replayLatest(changeCollateralRatio, 0n)
  const leverage = replayLatest(changeLeverage, 0n)

  const slippage = slippageStore.storeReplay(changeSlippage)


  const inputTokenPrice = switchLatest(map(address => pricefeed.getLatestPrice(chain, address), inputToken))
  const indexTokenPrice = switchLatest(map(address => pricefeed.getLatestPrice(chain, address), indexToken))
  const collateralTokenPrice = switchLatest(map(address => pricefeed.getLatestPrice(chain, address), shortCollateralToken))

  const requestPosition = combineObject({ account: config.walletLink.account, shortCollateralToken, indexToken, isLong })

  const requestPositionKey = skipRepeats(map(params => {
    if (!params.account) {
      return null
    }
    const collateralToken = params.isLong ? params.indexToken : params.shortCollateralToken

    return getPositionKey(params.account.toLowerCase(), collateralToken, params.indexToken, params.isLong)
  }, requestPosition))

  const initialSelectedTrade = take(1, combineArray((key, list) => list.find(t => t.key === key) || [], requestPositionKey, config.accountTradeList))

  const trade = mergeArray([initialSelectedTrade, switchTrade])

  const tradeConfig = { trade, slippage, isLong, isIncrease, inputToken, shortCollateralToken, indexToken, leverage, collateralDelta, sizeDelta, collateralRatio, }
  const tradeParamsState = replayState(tradeConfig)


  const inputTokenWeight = switchLatest(map(address => vault.getTokenWeight(address), inputToken))
  const inputTokenDebtUsd = switchLatest(map(address => vault.getTokenDebtUsd(address), inputToken))

  const indexTokenWeight = switchLatest(map(address => vault.getTokenWeight(address), indexToken))
  const indexTokenDebtUsd = switchLatest(map(address => vault.getTokenDebtUsd(address), indexToken))


  const inputTokenDescription = map(address => getTokenDescription(chain, address), inputToken)
  const indexTokenDescription = map(address => getTokenDescription(chain, address), indexToken)
  const collateralTokenDescription = map(address => getTokenDescription(chain, address), shortCollateralToken)




  const updateVaultPositon = switchLatest(map((key): Stream<IVaultPosition | null> => {
    return key
      ? map((pos): IVaultPosition | null => {
        return pos ? pos : null
      }, vault.getPosition(key))
      : now(null)
  }, requestPositionKey))



  const keeperExecute: Stream<KeeperExecute> = map(res => ({ ...res, __typename: 'KeeperExecute' }), mergeArray([positionRouter.listen('ExecuteIncreasePosition'), positionRouter.listen('ExecuteDecreasePosition')]))
  const keeperReject: Stream<KeeperReject> = map(res => ({ ...res, __typename: 'KeeperReject' }), mergeArray([positionRouter.listen('CancelIncreasePosition'), positionRouter.listen('CancelDecreasePosition')]))

  const accountKeeperExecution = multicast(filterNull(combineArray((account, pos) => {
    return account && account.toLowerCase() === pos.account.toLowerCase() ? pos : null
  }, config.walletLink.account, keeperExecute)))

  const accountKeeperRejection = multicast(filterNull(combineArray((account, pos) => {
    return account && account.toLowerCase() === pos.account.toLowerCase() ? pos : null
  }, config.walletLink.account, keeperReject)))


  const vaultPosition: Stream<IVaultPosition | null> = replayLatest(multicast(mergeArray([
    updateVaultPositon,
    switchLatest(snapshot((position, update) => {
      const { acceptablePrice, account, amountIn, blockGap, executionFee, indexToken, isLong, minOut, path, sizeDelta, timeGap } = update

      const collateralToken = path[path.length - 1]

      const key = getPositionKey(account.toLowerCase(), collateralToken, indexToken, isLong)

      return key === position?.key || position === null ? vault.getPosition(key) : now(null)
    }, updateVaultPositon, accountKeeperExecution)),
    // switchLatest(map((position) => {
    //   const { acceptablePrice, account, amountIn, blockGap, executionFee, indexToken, isLong, minOut, path, sizeDelta, timeGap } = update

    //   const collateralToken = path[path.length - 1]

    //   const key = getPositionKey(account.toLowerCase(), collateralToken, indexToken, isLong)

    //   return key === position?.key || position === null ? vault.getPosition(key) : now(null)
    // }, changeVaultPositon))
  ])))

  const swapFee = skipRepeats(combineArray((usdgSupply, totalTokenWeight, tradeParams, vaultPosition, inputTokenDebtUsd, inputTokenWeight, inputTokenDescription, inputTokenPrice, indexTokenDebtUsd, indexTokenWeight, indexTokenDescription, indexTokenPrice, isLong) => {

    const swapFeeBasisPoints = inputTokenDescription.isStable && indexTokenDescription.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = inputTokenDescription.isStable && indexTokenDescription.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS

    if (tradeParams.inputToken === tradeParams.indexToken) {
      return 0n
    }

    const adjustedPnlDelta = !tradeParams.isIncrease && vaultPosition && vaultPosition.size > 0n
      ? getPnL(isLong, vaultPosition.averagePrice, indexTokenPrice, vaultPosition.size) * tradeParams.sizeDelta / vaultPosition.size
      : 0n
    const amountUsd = getTokenUsd(tradeParams.collateralDelta, inputTokenPrice, inputTokenDescription.decimals) + adjustedPnlDelta

    const usdgAmount = amountUsd * getDenominator(inputTokenDescription.decimals) / USD_PERCISION

    const feeBps0 = getFeeBasisPoints(
      inputTokenDebtUsd,
      inputTokenWeight,
      usdgAmount,
      swapFeeBasisPoints,
      taxBasisPoints,
      true,
      usdgSupply,
      totalTokenWeight
    )
    const feeBps1 = getFeeBasisPoints(
      indexTokenDebtUsd,
      indexTokenWeight,
      usdgAmount,
      swapFeeBasisPoints,
      taxBasisPoints,
      false,
      usdgSupply,
      totalTokenWeight
    )

    const feeBps = feeBps0 > feeBps1 ? feeBps0 : feeBps1
    const addedSwapFee = feeBps ? amountUsd * feeBps / BASIS_POINTS_DIVISOR : 0n

    return addedSwapFee
  }, vault.usdgSupply, vault.totalTokenWeight, tradeParamsState, vaultPosition, inputTokenDebtUsd, inputTokenWeight, inputTokenDescription, inputTokenPrice, indexTokenDebtUsd, indexTokenWeight, indexTokenDescription, indexTokenPrice, isLong))

  const marginFee = combineArray((isIncrease, size) => isIncrease ? getMarginFees(size) : 0n, isIncrease, sizeDelta)

  const fee = combine((swap, margin) => swap + margin, swapFee, marginFee)


  const collateralDeltaUsd = multicast(map(params => {
    if (params.isIncrease) {
      return getTokenUsd(params.collateralDelta, params.inputTokenPrice, params.inputTokenDescription.decimals)
    }

    if (!params.vaultPosition) {
      return 0n
    }

    const withdrawCollateral = getTokenUsd(params.collateralDelta, params.inputTokenPrice, params.inputTokenDescription.decimals)

    return withdrawCollateral // - adjustedPnlDelta
  }, combineObject({ isIncrease, inputTokenPrice, vaultPosition: vaultPosition, inputTokenDescription, indexTokenPrice, collateralRatio, collateralDelta, sizeDelta, fee: startWith(0n, fee) })))


  const averagePrice = map(params => {
    if (!params.vaultPosition) {
      return 0n
    }

    if (params.sizeDelta === 0n) {
      return params.vaultPosition.averagePrice
    }

    if (params.isIncrease) {
      const pnl = getPnL(params.isLong, params.vaultPosition.averagePrice, params.indexTokenPrice, params.vaultPosition.size)

      const adjustedPnlDelta = pnl < 0n ? pnl * params.sizeDelta / params.vaultPosition.size : 0n

      return getAveragePriceFromDelta(params.isLong, params.vaultPosition.size, params.vaultPosition.averagePrice, adjustedPnlDelta, params.sizeDelta)
    }

    return params.vaultPosition.averagePrice

  }, combineObject({ vaultPosition, isIncrease, indexTokenPrice, sizeDelta, isLong }))

  const liquidationPrice = map(params => {
    if (!params.vaultPosition && params.sizeDelta === 0n) {
      return 0n
    }

    const positionSize = params.vaultPosition?.size || 0n
    const positionCollateral = params.vaultPosition?.collateral || 0n

    const averagePrice = params.vaultPosition?.averagePrice || params.indexTokenPrice
    const pnl = params.vaultPosition ? getPnL(params.isLong, params.vaultPosition.averagePrice, params.indexTokenPrice, params.vaultPosition.size) : 0n

    const sizedelta = params.isIncrease ? params.sizeDelta : -params.sizeDelta
    const collateralDelta = params.isIncrease ? params.collateralDeltaUsd : -params.collateralDeltaUsd

    return getLiquidationPrice(params.isLong, positionSize, positionCollateral, averagePrice, 0n, 0n, pnl, sizedelta, collateralDelta)
  }, combineObject({ vaultPosition, isIncrease, collateralDeltaUsd, sizeDelta, averagePrice, indexTokenPrice, isLong }))



  const $container = $node(
    style({
      fontSize: '1.1rem',
      fontFeatureSettings: '"tnum" on,"lnum" on',
      fontFamily: `-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif`,
      display: 'flex',
      ...screenUtils.isDesktopScreen
        ? { flexDirection: 'row-reverse', gap: '80px' }
        : { flexDirection: 'column' }
      // fontFamily: '-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif'
    })
  )


  const $chartContainer = $column(style({
    // backgroundImage: `radial-gradient(at right center, ${pallete.background} 50%, transparent)`,
    position: 'relative',
    background: colorAlpha(pallete.background, 1.5)
  }))(
    screenUtils.isDesktopScreen
      ? O(
        style({
          position: 'absolute', flexDirection: 'column', inset: '120px 0 0 0', width: 'calc(50vw)', borderRight: `1px solid rgba(191, 187, 207, 0.15)`,
          display: 'flex'
        }),
        styleInline(map(interesction => {

          const target = interesction.target

          if (target instanceof HTMLElement) {
            return { inset: `${120 - Math.min(120, target.scrollTop)}px 0 0 0` }
          } else {
            throw new Error('scroll target is not an elemnt')
          }

        }, eventElementTarget('scroll', document.body.children[0])))
      )
      : O()
  )



  const timeFrameLabl = {
    [intervalTimeMap.MIN5]: '5m',
    [intervalTimeMap.MIN15]: '15m',
    [intervalTimeMap.MIN60]: '1h',
    [intervalTimeMap.HR4]: 'h4',
    [intervalTimeMap.HR24]: '1d',
    [intervalTimeMap.DAY7]: '1w',
  }


  const requestAccountTradeList = multicast(map(address => {
    return {
      account: address,
      // timeInterval: timeFrameStore.state,
      chain,
    }
  }, config.walletLink.account))

  const requestPricefeed = combineArray((tokenAddress, interval): IPricefeedParamApi => {
    const range = interval * 1000
    const to = unixTimestampNow()
    const from = to - range

    return { chain, interval, tokenAddress, from, to }
  }, indexToken, timeframe)

  const selectedPricefeed = mergeArray([config.pricefeed, constant(null, requestPricefeed)])

  const requestTradeRow: Stream<RequestTrade[]> = switchLatest(awaitPromises(map(res => {
    const newLocal = res.ctxQuery
      .then(ctx => {
        return now([{ ctx, state: res.state, acceptablePrice: res.acceptablePrice }])
      })
      .catch(err => empty())
    return newLocal
  }, requestTrade)))

  return [
    $container(
      $node(layoutSheet.spacingBig, style({ flex: 1, paddingBottom: '50px', display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'column' : 'column-reverse' }))(

        // executeSt,

        // style({ alignSelf: 'center' })(
        //   $alert(
        //     $column(layoutSheet.spacingTiny)(
        //       $text('Work in Progress. please use with caution'),
        //       $anchor(attr({ href: 'https://app.gmx.io/#/trade' }))(
        //         $text('got issues? positons can also be modified in gmx.io')
        //       )
        //     )
        //   )
        // ),

        $TradeBox({
          referralCode: BLUEBERRY_REFFERAL_CODE,
          chainList: config.chainList,
          indexTokens: config.indexTokens,
          stableTokens: config.stableTokens,
          chain,
          walletStore: config.walletStore,
          walletLink: config.walletLink,
          store: tradingStore,

          tradeConfig,
          tradeState: {
            isTradingEnabled,
            vaultPosition,
            collateralDeltaUsd,
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
            executionFee,
            walletBalance,
            isInputTokenApproved: approveInputToken,
          }
        })({
          leverage: changeLeverageTether(),
          switchIsIncrease: switchIsIncreaseTether(),
          changeCollateralDelta: changeCollateralDeltaTether(),
          changeSize: changeSizeTether(),
          changeInputToken: changeInputTokenTether(),
          changeCollateralToken: changeCollateralTokenTether(),
          changeIndexToken: changeIndexTokenTether(),
          switchIsLong: switchIsLongTether(),
          changeCollateralRatio: changeCollateralRatioTether(),
          requestTrade: requestTradeTether(),
          changeSlippage: changeSlippageTether(),
          walletChange: walletChangeTether(),
          enableTrading: enableTradingTether(),
          approveInputToken: approveInputTokenTether()
        }),

        // $node($text(map(amountUsd => formatReadableUSD(amountUsd), availableLiquidityUsd))),

        switchLatest(combineArray((list) => {

          if (list === null) {
            return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $spinner,
              $text(style({ fontSize: '.75em' }))('Loading open trades')
            )
          }
          // const tradeList = list.filter((t): t is ITradeOpen => isTradeOpen(t) && (!trade || t.key !== trade.key))

          return $Table2<ITradeOpen>({
            $container: $column(layoutSheet.spacing),
            scrollConfig: {
              $container: $column(layoutSheet.spacingBig)
            },
            dataSource: now(list.filter((t): t is ITradeOpen => t.status === TradeStatus.OPEN)),
            columns: [
              {
                $head: $text('Entry'),
                columnOp: O(style({ maxWidth: '65px', flexDirection: 'column' }), layoutSheet.spacingTiny),
                $body: map((pos) => {
                  return $Link({
                    anchorOp: style({ position: 'relative' }),
                    $content: style({ pointerEvents: 'none' }, $Entry(pos)),
                    url: `/${getChainName(chain).toLowerCase()}/${CHAIN_TOKEN_ADDRESS_TO_SYMBOL[resolveAddress(chain, pos.indexToken)]}/${pos.id}/${pos.timestamp}`,
                    route: config.parentRoute.create({ fragment: '2121212' })
                  })({ click: changeRouteTether() })
                })
              },
              {
                $head: $text('Size'),
                columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, alignItems: 'center', placeContent: 'flex-start', minWidth: '80px' })),
                $body: map(pos => {
                  const positionMarkPrice = pricefeed.getLatestPrice(chain, pos.indexToken)

                  return $row(
                    $RiskLiquidator(pos, positionMarkPrice)({})
                  )
                })
              },
              {
                $head: $text('PnL $'),
                columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '160px' }),
                $body: map((pos) => {
                  const newLocal = pricefeed.getLatestPrice(chain, pos.indexToken)
                  return $livePnl(pos, newLocal)
                })
              },
              {
                $head: $text('Switch'),
                columnOp: style({ flex: 2, placeContent: 'center', maxWidth: '80px' }),
                $body: map((pos) => {

                  const clickSwitchBehavior = switchTradeTether(
                    nodeEvent('click'),
                    constant(pos),
                  )

                  return $row(styleBehavior(map(vpos => {
                    const isPosMatched = vpos && vpos.key === pos.key

                    return isPosMatched ? { pointerEvents: 'none', opacity: '0.3' } : {}
                  }, trade)))(
                    clickSwitchBehavior(
                      style({ height: '28px', width: '28px' }, $iconCircular($arrowsFlip, pallete.horizon))
                    )
                  )
                })
              },
            ],
          })({})
        }, mergeArray([config.accountTradeList, now(null)])))


      ),

      $column(style({ flex: 1 }))(
        $chartContainer(
          $row(layoutSheet.spacing, style({ fontSize: '0.85em', zIndex: 5, position: 'absolute', padding: '8px', placeContent: 'center' }))(
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


          $row(style({ position: 'relative', height: '400px' }))(
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
                      if (val === 0n) {
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
                      if (val === 0n) {
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
                  appendData: switchLatest(map(params => {
                    // console.log(params.selectedPricefeed)
                    if (params.selectedPricefeed === null) {
                      return empty()
                    }

                    const fst = params.selectedPricefeed[params.selectedPricefeed.length - 1]
                    const initialTick = {
                      open: formatFixed(fst.o, 30),
                      high: formatFixed(fst.h, 30),
                      low: formatFixed(fst.l, 30),
                      close: formatFixed(fst.c, 30),
                      time: fst.timestamp as Time
                    }

                    return scan((prev: CandlestickData, nextPrice): CandlestickData => {
                      const marketPrice = formatFixed(nextPrice, 30)
                      const timeNow = unixTimestampNow()

                      const prevTimeSlot = Math.floor(prev.time as number / params.timeframe)

                      const nextTimeSlot = Math.floor(timeNow / params.timeframe)
                      const time = nextTimeSlot * params.timeframe as Time

                      const isNext = nextTimeSlot > prevTimeSlot

                      if (isNext) {
                        return {
                          open: marketPrice,
                          high: marketPrice,
                          low: marketPrice,
                          close: marketPrice,
                          time
                        }
                      }

                      return {
                        open: prev.open,
                        high: marketPrice > prev.high ? marketPrice : prev.high,
                        low: marketPrice < prev.low ? marketPrice : prev.low,
                        close: marketPrice,
                        time
                      }
                    }, initialTick, indexTokenPrice)
                  }, combineObject({ timeframe, selectedPricefeed }))),
                  data: combineArray(data => {

                    if (data === null) {
                      return null
                    }

                    return data.map(({ o, h, l, c, timestamp }) => {
                      const open = formatFixed(o, 30)
                      const high = formatFixed(h, 30)
                      const low = formatFixed(l, 30)
                      const close = formatFixed(c, 30)

                      return { open, high, low, close, time: timestamp as Time }
                    })
                  }, selectedPricefeed),
                }
              ],
              containerOp: style({
                flex: 1,
                inset: 0,
                position: 'absolute',
                borderBottom: `1px solid rgba(191, 187, 207, 0.15)`
              }),
              chartConfig: {
                rightPriceScale: {
                  visible: true,
                  entireTextOnly: true,
                  borderVisible: false,
                  scaleMargins: {
                    top: 0.1,
                    bottom: 0.1
                  }
                },
                timeScale: {
                  timeVisible: true,
                  borderVisible: true,
                  rightOffset: 15,
                  shiftVisibleRangeOnNewBar: true,
                  borderColor: pallete.horizon,
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
            }),
            switchLatest(map(feed => {
              if (feed) {
                return empty()
              }

              return $node(style({ position: 'absolute', zIndex: 10, display: 'flex', inset: 0, backgroundColor: colorAlpha(pallete.middleground, .10), placeContent: 'center', alignItems: 'center' }))(
                $spinner
              )
            }, selectedPricefeed)),
          ),

          $column(style({ flex: 1, position: 'relative' }))(
            switchLatest(map(pos => {


              return $Table2({
                cellOp: style({ padding: '8px 15px' }),
                dataSource: merge(
                  now((pos ? [...pos.increaseList, ...pos.decreaseList] : []).sort((a, b) => a.timestamp - b.timestamp)),

                  requestTradeRow,
                ) as Stream<(RequestTrade | IPositionIncrease | IPositionDecrease)[]>,
                $container: $column(style({ position: 'absolute', inset: '0' }), layoutSheet.spacing),

                scrollConfig: {
                  $container: $column(layoutSheet.spacingSmall),
                  insertAscending: true
                },
                columns: [
                  {
                    $head: $text('Time'),
                    columnOp: O(style({ flex: .7 })),

                    $body: map((req) => {
                      const isKeeperReq = 'ctx' in req

                      const timestamp = isKeeperReq ? unixTimestampNow() : req.timestamp

                      return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
                        $text(timeSince(timestamp) + ' ago'),
                        $text(new Date(timestamp * 1000).toLocaleDateString()),
                      )
                    })
                  },
                  {
                    $head: $text('Action'),
                    columnOp: O(style({ flex: 1.2 })),

                    $body: map((pos) => {
                      const $requestRow = $row(style({ alignItems: 'center' }))

                      if ('key' in pos) {
                        const direction = pos.__typename === 'IncreasePosition' ? '↑' : '↓'
                        const txHash = pos.id.split(':').slice(-1)[0]
                        return $txHashRef(txHash, chain, $text(`${direction} ${formatReadableUSD(pos.price)}`))
                      }

                      const actionName = pos.state.isIncrease ? 'increase' : 'reduce'

                      const keeperEvent = take(1, mergeArray([accountKeeperExecution, accountKeeperRejection]))

                      const isIncrease = pos.state.isIncrease
                      return $row(layoutSheet.spacingSmall)(
                        $txHashRef(pos.ctx.hash, chain,
                          $text(`${isIncrease ? '↑' : '↓'} ${formatReadableUSD(pos.acceptablePrice)} ${isIncrease ? '<' : '>'}`)
                        ),

                        switchLatest(mergeArray([
                          now($spinner),
                          map(req => {
                            const { acceptablePrice } = req
                            console.log(req)

                            const message = $text(`${req.__typename === 'KeeperExecute' ? '✔' : '✖'} ${formatReadableUSD(acceptablePrice)}`)
                            return $requestRow(
                              $txHashRef('res.transactionHash', chain, message),
                              $infoTooltip('transaction was sent, keeper will execute the request, the request will either be executed or rejected'),
                            )
                          }, keeperEvent),
                        ]))
                      )

                    })
                  },
                  {
                    $head: $text('Collateral Change'),
                    columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),

                    $body: map((req) => {
                      const isKeeperReq = 'ctx' in req
                      const pos = isKeeperReq ? req.state : req

                      const isIncrease = isKeeperReq ? req.state.isIncrease : req.__typename === 'IncreasePosition'
                      const prefix = isIncrease ? '+' : '-'

                      return $row(layoutSheet.spacing)(
                        $text(prefix + formatReadableUSD(pos.collateralDelta)),
                      )
                    })
                  },
                  {
                    $head: $text('Size Change'),
                    columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),

                    $body: map((req) => {
                      const isKeeperReq = 'ctx' in req
                      const pos = isKeeperReq ? req.state : req

                      const isIncrease = isKeeperReq ? req.state.isIncrease : req.__typename === 'IncreasePosition'
                      const prefix = isIncrease ? '+' : '-'

                      return $row(layoutSheet.spacing)(
                        pos.sizeDelta > 0n
                          ? $text(prefix + formatReadableUSD(pos.sizeDelta))
                          : $text(style({ color: pallete.foreground }))('$0'),
                      )
                    })
                  },
                ]
              })({})

            }, trade))
          ),
        ),
      )
    ),

    {
      requestPricefeed,
      requestAccountTradeList,
      requestLatestPriceMap: constant({ chain }, periodic(5000)),
      // requestTrade: map(pos => pos ? <IRequestTradeQueryparam>{ id: 'Trade:' + pos.key, chain } : null, vaultPosition),
      changeRoute,
      walletChange
    }
  ]
})
