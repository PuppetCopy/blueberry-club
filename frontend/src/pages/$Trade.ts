import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { $node, $text, component, eventElementTarget, INode, nodeEvent, style, styleBehavior, styleInline } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import {
  AddressZero, formatFixed, intervalTimeMap, IPricefeed, IPricefeedParamApi, ITrade, unixTimestampNow, ITradeOpen, BASIS_POINTS_DIVISOR, getAveragePriceFromDelta,
  getLiquidationPrice, getMarginFees, STABLE_SWAP_FEE_BASIS_POINTS, STABLE_TAX_BASIS_POINTS, SWAP_FEE_BASIS_POINTS, TAX_BASIS_POINTS,
  replayState, getDenominator, USD_PERCISION, formatReadableUSD, timeSince, getPositionKey, IPositionIncrease,
  IPositionDecrease, getPnL, filterNull, ARBITRUM_ADDRESS_STABLE, AVALANCHE_ADDRESS_STABLE,
  CHAIN, ITokenIndex, ITokenStable, ITokenInput, TradeStatus, KeeperResponse, KeeperExecuteAbstract, LIMIT_LEVERAGE, div, readableDate, TRADE_CONTRACT_MAPPING, getTokenAmount, readableNumber
} from "@gambitdao/gmx-middleware"

import { combine, constant, map, mergeArray, multicast, scan, skipRepeats, switchLatest, empty, now, awaitPromises, never, filter, snapshot, debounce, tap } from "@most/core"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $arrowsFlip, $infoTooltip, $IntermediatePromise, $RiskLiquidator, $spinner, $txHashRef } from "@gambitdao/ui-components"
import { BarPrice, CandlestickData, LineStyle, Time } from "lightweight-charts"
import { Stream } from "@most/types"
import { connectTrade, connectVault, getErc20Balance, IPositionGetter } from "../logic/contract/trade"
import { $TradeBox, ITradeFocusMode, ITradeState, RequestTradeQuery } from "../components/trade/$TradeBox"
import { $ButtonToggle } from "../common/$Toggle"
import { $Table2 } from "../common/$Table2"
import { $Entry, $livePnl } from "./$Leaderboard"
import { $iconCircular } from "../elements/$common"
import { $CandleSticks } from "../components/chart/$CandleSticks"
import { getFeeBasisPoints, resolveAddress } from "../logic/utils"
import { BrowserStore } from "../logic/store"
import { ContractTransaction } from "@ethersproject/contracts"
import { getContractAddress, readContract } from "../logic/common"
import { ERC20__factory, PositionRouter__factory } from "../logic/contract/gmx-contracts"
import { IWalletLink, IWalletName, IWalletState } from "@gambitdao/wallet-link"


export interface ITradeComponent {
  referralCode: string
  chainList: CHAIN[]
  tokenIndexMap: Partial<Record<CHAIN, ITokenIndex[]>>
  tokenStableMap: Partial<Record<CHAIN, ITokenStable[]>>
  store: BrowserStore<"ROOT.v1", "v1">
  parentRoute: Route
  walletLink: IWalletLink

  accountTradeList: Stream<Promise<ITrade[]>>
  pricefeed: Stream<Promise<IPricefeed[]>>
}



type RequestTrade = {
  ctx: ContractTransaction
  state: ITradeState
  acceptablePrice: bigint
}



const timeFrameLablMap = {
  [intervalTimeMap.MIN5]: '5m',
  [intervalTimeMap.MIN15]: '15m',
  [intervalTimeMap.MIN60]: '1h',
  [intervalTimeMap.HR4]: 'h4',
  [intervalTimeMap.HR24]: '1d',
  [intervalTimeMap.DAY7]: '1w',
}


export const $Trade = (config: ITradeComponent) => component((
  [selectTimeFrame, selectTimeFrameTether]: Behavior<intervalTimeMap, intervalTimeMap>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,
  [changeNetwork, changeNetworkTether]: Behavior<CHAIN, CHAIN>,

  [changeInputToken, changeInputTokenTether]: Behavior<ITokenInput, ITokenInput>,
  [changeIndexToken, changeIndexTokenTether]: Behavior<ITokenIndex, ITokenIndex>,
  [changeCollateralToken, changeCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE, ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE>,

  [switchFocusMode, switchFocusModeTether]: Behavior<ITradeFocusMode, ITradeFocusMode>,
  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,
  [switchIsIncrease, switchIsIncreaseTether]: Behavior<boolean, boolean>,
  [changeCollateralDeltaUsd, changeCollateralDeltaUsdTether]: Behavior<bigint, bigint>,

  // [requestAccountTradeList, requestAccountTradeListTether]: Behavior<IAccountTradeListParamApi, IAccountTradeListParamApi>,
  [changeSizeDeltaUsd, changeSizeDeltaUsdTether]: Behavior<bigint, bigint>,
  [changeLeverage, changeLeverageTether]: Behavior<bigint, bigint>,
  [changeSlippage, changeSlippageTether]: Behavior<string, string>,

  [changeInputTokenApproved, changeInputTokenApprovedTether]: Behavior<boolean, boolean>,

  [enableTrading, enableTradingTether]: Behavior<boolean, boolean>,

  [switchTrade, switchTradeTether]: Behavior<INode, ITrade>,
  [requestTrade, requestTradeTether]: Behavior<RequestTradeQuery, RequestTradeQuery>,
  [requestTradePricefeed, requestTradePricefeedTether]: Behavior<IPricefeedParamApi, IPricefeedParamApi>,

) => {

  const vault = connectVault(config.walletLink)
  const positionRouter = connectTrade(config.walletLink)

  const executionFee = multicast(positionRouter.executionFee)


  const accountOpenTradeList = map(async list => {
    return (await list).filter((t): t is ITradeOpen => t.status === TradeStatus.OPEN)
  }, config.accountTradeList)

  const tradingStore = config.store.craete('trade', 'tradeBox')

  const timeFrameStore = tradingStore.craete('portfolio-chart-interval', intervalTimeMap.MIN60)

  const isTradingEnabledStore = tradingStore.craete('isTradingEnabled', false)
  const leverageStore = tradingStore.craete('leverage', LIMIT_LEVERAGE / 4n)
  const focusModeStore = tradingStore.craete('focusMode', ITradeFocusMode.collateral)
  const isLongStore = tradingStore.craete('isLong', true)
  const inputTokenStore = tradingStore.craete('inputToken', AddressZero as ITokenInput)
  const indexTokenStore = tradingStore.craete('indexToken', AddressZero as ITokenIndex)
  const shortCollateralTokenStore = tradingStore.craete('collateralToken', AddressZero as ITokenStable)
  const isIncreaseStore = tradingStore.craete('isIncrease', true)
  const slippageStore = tradingStore.craete('slippage', '0.2')
  // const collateralRatioStore = tradingStore.craete('collateralRatio', 0)

  const isTradingEnabled = isTradingEnabledStore.storeReplay(enableTrading)
  const timeframe = timeFrameStore.storeReplay(selectTimeFrame)

  const isLong = isLongStore.storeReplay(mergeArray([map(t => t.isLong, switchTrade), switchIsLong]))
  const isIncrease = isIncreaseStore.storeReplay(switchIsIncrease)

  const focusMode = focusModeStore.storeReplay(switchFocusMode)
  const collateralDeltaUsd = replayLatest(changeCollateralDeltaUsd, 0n)
  const sizeDeltaUsd = replayLatest(changeSizeDeltaUsd, 0n)


  const slippage = slippageStore.storeReplay(changeSlippage)




  const inputToken: Stream<ITokenInput> = inputTokenStore.storeReplay(
    changeInputToken,
    combine((chain, token) => {
      return token === AddressZero ? token : fallbackToSupportedToken(chain, token)
    }, config.walletLink.network)
  )

  const indexToken: Stream<ITokenIndex> = indexTokenStore.storeReplay(
    mergeArray([map(t => t.indexToken, switchTrade), changeIndexToken]),
    combine((chain, token) => {
      return fallbackToSupportedToken(chain, token)
    }, config.walletLink.network)
  )

  const shortCollateralToken: Stream<ITokenStable> = shortCollateralTokenStore.storeReplay(
    mergeArray([map(t => t.isLong ? t.indexToken : t.collateralToken, switchTrade), changeCollateralToken]),
    combine((chain, token) => {
      return fallbackToSupportedToken(chain, token)
    }, config.walletLink.network)
  )


  const walletBalance = awaitPromises(combineArray(async (token, provider, execFee) => {
    if (provider === null) {
      return 0n
    }

    const balance = getErc20Balance(token, provider)

    if (token === AddressZero) {
      const totalBalance = await balance
      return totalBalance - execFee * 4n
    }

    return balance
  }, inputToken, config.walletLink.wallet, executionFee))


  const inputTokenPrice = switchLatest(combineArray((chain, token) => vault.getLatestPrice(chain, resolveAddress(chain, token)), config.walletLink.network, inputToken))
  const indexTokenPrice = switchLatest(combineArray((chain, token) => vault.getLatestPrice(chain, resolveAddress(chain, token)), config.walletLink.network, indexToken))
  const collateralTokenPrice = switchLatest(combineArray((chain, token) => vault.getLatestPrice(chain, resolveAddress(chain, token)), config.walletLink.network, shortCollateralToken))

  const account = map(signer => {
    return signer ? signer.address : null
  }, config.walletLink.wallet)


  const positionConfigChange = mergeArray([
    debounce(10, combineObject({ account, indexToken, shortCollateralToken, isLong })),
    // zipArray((account, indexToken, shortCollateralToken, isLong) => ({ account, indexToken, shortCollateralToken, isLong }), requestPositionParams)
  ])

  const positionKey = skipRepeats(map(params => {
    if (params.account === null) {
      return null
    }

    const collateralToken = params.isLong ? params.indexToken : params.shortCollateralToken

    return getPositionKey(params.account, collateralToken, params.indexToken, params.isLong)
  }, positionConfigChange))



  const accountKeeperEvents: Stream<any> = switchLatest(map((w3p) => {
    if (w3p === null) {
      return never()
    }

    const PositionRouter = TRADE_CONTRACT_MAPPING[w3p.chain as keyof typeof TRADE_CONTRACT_MAPPING].Vault
    const positionRouter = readContract(PositionRouter__factory, config.walletLink.defaultProvider, PositionRouter)

    const keeperExecuteIncrease = map((ev: KeeperResponse) => getKeeperPositonKey(ev, true, false), positionRouter.listen<KeeperResponse>('ExecuteIncreasePosition'))
    const keeperDecreaseIncrease = map((ev: KeeperResponse) => getKeeperPositonKey(ev, false, false), positionRouter.listen<KeeperResponse>('ExecuteDecreasePosition'))


    return filterNull(mergeArray([keeperExecuteIncrease, keeperDecreaseIncrease]))
  }, config.walletLink.wallet))



  const positionQuery = switchLatest(map(key => vault.getPosition(key), positionKey))


  const settlePosition = constant(null, vault.positionSettled(positionKey))

  const positionChange = mergeArray([
    settlePosition,
    snapshot((pos, update): IPositionGetter => ({ ...pos, ...update }), filterNull(awaitPromises(positionQuery)), vault.positionUpdateEvent(positionKey)),
  ])

  const position: Stream<IPositionGetter | null> = replayLatest(multicast(mergeArray([
    awaitPromises(positionQuery),
    positionChange
  ])))


  const leverage = leverageStore.store(mergeArray([
    changeLeverage,
    snapshot((params, stake) => {
      if (stake) {
        return div(stake.size + params.sizeDeltaUsd, stake.collateral + params.collateralDeltaUsd)
      }

      return leverageStore.getState()
    }, combineObject({ collateralDeltaUsd, sizeDeltaUsd }), position),
  ]))


  const tradeQuery: Stream<Promise<ITradeOpen | null>> = replayLatest(multicast(combineArray(async (posQuery, listQuery) => {
    const res = await posQuery
    if (res === null) {
      return null
    }

    const pos = (await listQuery).find(t => t.key === res.key)

    return pos
  }, mergeArray([positionQuery, settlePosition]), accountOpenTradeList)))



  const inputTokenWeight = vault.getTokenWeight(inputToken)
  const inputTokenDebtUsd = vault.getTokenDebtUsd(inputToken)

  const indexTokenWeight = vault.getTokenWeight(indexToken)
  const indexTokenDebtUsd = vault.getTokenDebtUsd(indexToken)


  const inputTokenDescription = vault.tokenDescription(inputToken)
  const indexTokenDescription = vault.tokenDescription(indexToken)
  const collateralTokenDescription = vault.tokenDescription(shortCollateralToken)



  const tradeConfig = { focusMode, slippage, isLong, isIncrease, inputToken, shortCollateralToken, indexToken, leverage, collateralDeltaUsd, sizeDeltaUsd }
  const tradeConfigReplay = replayState(tradeConfig)

  const collateralDelta = map(params => {
    const amountUsd = getTokenAmount(params.collateralDeltaUsd, params.inputTokenPrice, params.inputTokenDescription.decimals)
    return amountUsd
  }, combineObject({ inputTokenPrice, inputTokenDescription, collateralDeltaUsd }))

  const sizeDelta = map(params => {
    return getTokenAmount(params.sizeDeltaUsd, params.indexTokenPrice, params.indexTokenDescription.decimals)
  }, combineObject({ indexTokenDescription, indexTokenPrice, sizeDeltaUsd }))


  const swapFee = skipRepeats(combineArray((chain, usdgSupply, totalTokenWeight, tradeConfig, pos, inputTokenDebtUsd, inputTokenWeight, inputTokenDescription, indexTokenDebtUsd, indexTokenWeight, indexTokenDescription, indexTokenPrice) => {
    const swapFeeBasisPoints = inputTokenDescription.isStable && indexTokenDescription.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = inputTokenDescription.isStable && indexTokenDescription.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS

    if (resolveAddress(chain, tradeConfig.inputToken) === tradeConfig.indexToken) {
      return 0n
    }

    const adjustedPnlDelta = pos && !tradeConfig.isIncrease && pos.size > 0n
      ? getPnL(tradeConfig.isLong, pos.averagePrice, indexTokenPrice, pos.size) * tradeConfig.sizeDeltaUsd / pos.size
      : 0n
    const amountUsd = tradeConfig.collateralDeltaUsd + adjustedPnlDelta

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
  }, config.walletLink.network, vault.usdgSupply, vault.totalTokenWeight, tradeConfigReplay, position, inputTokenDebtUsd, inputTokenWeight, inputTokenDescription, indexTokenDebtUsd, indexTokenWeight, indexTokenDescription, indexTokenPrice))

  const marginFee = map((size) => getMarginFees(size), sizeDeltaUsd)

  const fee = combine((swap, margin) => swap + margin, swapFee, marginFee)

  const averagePrice = map(params => {
    const stake = params.position
    if (stake === null) {
      return 0n
    }


    const pnl = getPnL(params.isLong, stake.averagePrice, params.indexTokenPrice, stake.size)
    const adjustedPnlDelta = params.isIncrease && pnl < 0n ? pnl * params.sizeDeltaUsd / stake.size : pnl

    return getAveragePriceFromDelta(params.isLong, stake.size, params.indexTokenPrice, adjustedPnlDelta, params.sizeDeltaUsd)
  }, combineObject({ position, isIncrease, indexTokenPrice, sizeDeltaUsd, isLong }))

  const liquidationPrice = map(params => {
    const stake = params.position

    if (stake === null) {
      if (params.sizeDeltaUsd === 0n) {
        return 0n
      }

      return getLiquidationPrice(params.isLong, 0n, 0n, params.indexTokenPrice, 0n, 0n, 0n, params.sizeDeltaUsd, params.collateralDeltaUsd)
    }

    const positionSize = stake.size || 0n
    const positionCollateral = stake.collateral || 0n

    const averagePrice = stake.averagePrice || params.indexTokenPrice
    const pnl = stake ? getPnL(params.isLong, stake.averagePrice, params.indexTokenPrice, stake.size) : 0n

    const price = getLiquidationPrice(params.isLong, positionSize, positionCollateral, averagePrice, 0n, 0n, pnl, params.sizeDeltaUsd, params.collateralDeltaUsd)
    return price
  }, combineObject({ position, isIncrease, collateralDeltaUsd, sizeDeltaUsd, averagePrice, indexTokenPrice, indexTokenDescription, isLong }))



  const requestPricefeed = combineArray((chain, tokenAddress, interval): IPricefeedParamApi => {
    const range = interval * 1000
    const to = unixTimestampNow()
    const from = to - range

    return { chain, interval, tokenAddress, from, to }
  }, config.walletLink.network, indexToken, timeframe)

  // const selectedPricefeed = mergeArray([config.pricefeed, constant(null, requestPricefeed)])

  const requestTradeRow: Stream<RequestTrade[]> = switchLatest(awaitPromises(map(res => {
    return res.ctxQuery
      .then(ctx => {
        return now([{ ctx, state: res.state, acceptablePrice: res.acceptablePrice }])
      })
      .catch(err => empty())
  }, requestTrade)))


  const isIndexTokenApproved = mergeArray([
    changeInputTokenApproved,
    awaitPromises(snapshot(async (collateralDelta, params) => {
      if (params.w3p === null) {
        throw new Error('No wallet connected')
      }

      const signer = params.w3p.getSigner()

      // const erc20 = connectErc20(inputToken, map(w3p => , config.walletProvider))
      const c = ERC20__factory.connect(params.inputToken, params.w3p.getSigner())

      if (params.inputToken === AddressZero) {
        return true
      }

      if (c === null || signer._address === null) {
        return null
      }

      const contractAddress = getContractAddress(TRADE_CONTRACT_MAPPING, params.chain, 'Router')

      if (contractAddress === null) {
        return null
      }

      const allowedSpendAmount = (await c.allowance(signer._address, contractAddress)).toBigInt()
      return allowedSpendAmount >= collateralDelta
    }, collateralDeltaUsd, combineObject({ w3p: config.walletLink.provider, chain: config.walletLink.network, inputToken }))),
  ])


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



  return [
    $container(
      $node(layoutSheet.spacingBig, style({ flex: 1, paddingBottom: '50px', display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'column' : 'column-reverse' }))(

        $column(layoutSheet.spacingSmall)(
          // $row(
          //   $node(style({ flex: 1 }))(),

          //   O(stylePseudo(':hover', { color: pallete.primary }))(
          //     $row(
          //       layoutSheet.spacingTiny,
          //       changeCollateralRatioTether(nodeEvent('click'), constant(BASIS_POINTS_DIVISOR)),
          //       style({ fontSize: '0.75em' }))(
          //       $text(style({ color: pallete.foreground }))(`Balance`),
          //       $text(combineArray((tokenDesc, balance) => {
          //         return readableNumber(formatFixed(balance, tokenDesc.decimals)) + ` ${tokenDesc.symbol}`
          //       }, inputTokenDescription, walletBalance)),
          //     ),
          //   ),
          // ),
          $TradeBox({
            ...config,

            trade: tradeQuery,
            pricefeed: config.pricefeed,

            tradeConfig,
            tradeState: {
              position,
              isTradingEnabled,
              isIndexTokenApproved,
              sizeDelta,
              collateralDelta,

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
            }
          })({
            leverage: changeLeverageTether(),
            switchIsIncrease: switchIsIncreaseTether(),
            changeCollateralDeltaUsd: changeCollateralDeltaUsdTether(),
            changeSizeDeltaUsd: changeSizeDeltaUsdTether(),
            changeInputToken: changeInputTokenTether(),
            changeCollateralToken: changeCollateralTokenTether(),
            changeIndexToken: changeIndexTokenTether(),
            switchIsLong: switchIsLongTether(),
            // changeCollateralRatio: changeCollateralRatioTether(),
            requestTrade: requestTradeTether(),
            changeSlippage: changeSlippageTether(),
            walletChange: walletChangeTether(),
            enableTrading: enableTradingTether(),
            approveInputToken: changeInputTokenApprovedTether(),
            changeNetwork: changeNetworkTether(),
            switchFocusMode: switchFocusModeTether(),
          }),
        ),

        // $node($text(map(amountUsd => formatReadableUSD(amountUsd), availableLiquidityUsd))),

        switchLatest(combineArray((w3p) => {

          if (w3p === null) {
            return $column(style({ alignItems: 'center' }))(
              $text(style({ color: pallete.foreground }))(
                'Trade List'
              )
            )
          }

          // if (list === null) {
          //   return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
          //     $spinner,
          //     $text(style({ fontSize: '.75em' }))('Loading open trades')
          //   )
          // }

          return $IntermediatePromise({
            query: accountOpenTradeList,
            $$done: map(res => {

              return $Table2<ITradeOpen>({
                $container: $column(layoutSheet.spacing),
                scrollConfig: {
                  $container: $column(layoutSheet.spacingBig)
                },
                dataSource: now(res),
                columns: [
                  {
                    $head: $text('Entry'),
                    columnOp: O(style({ maxWidth: '65px', flexDirection: 'column' }), layoutSheet.spacingTiny),
                    $body: map((pos) => {

                      return $Entry(w3p.chain, pos)
                      // return $Link({
                      //   anchorOp: style({ position: 'relative' }),
                      //   $content: style({ pointerEvents: 'none' }, $Entry(pos)),
                      //   url: `/${getChainName(chain).toLowerCase()}/${CHAIN_TOKEN_ADDRESS_TO_SYMBOL[resolveAddress(chain, pos.indexToken)]}/${pos.id}/${pos.timestamp}`,
                      //   route: config.parentRoute.create({ fragment: '2121212' })
                      // })({ click: changeRouteTether() })
                    })
                  },
                  {
                    $head: $text('PnL $'),
                    columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '160px' }),
                    $body: map((pos) => {
                      const positionMarkPrice = vault.getLatestPrice(w3p.chain, pos.indexToken)
                      return $livePnl(pos, positionMarkPrice)
                    })
                  },
                  {
                    $head: $text('Size'),
                    columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, alignItems: 'center', placeContent: 'flex-start', minWidth: '80px' })),
                    $body: map(pos => {
                      const positionMarkPrice = vault.getLatestPrice(w3p.chain, pos.indexToken)

                      return $row(
                        $RiskLiquidator(pos, positionMarkPrice)({})
                      )
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

                      const switchActiveStyle = styleBehavior(map(vpos => {
                        const isPosMatched = vpos?.key === trade.key

                        return isPosMatched ? { pointerEvents: 'none', opacity: '0.3' } : {}
                      }, position))


                      return $row(switchActiveStyle)(
                        clickSwitchBehavior(
                          style({ height: '28px', width: '28px' }, $iconCircular($arrowsFlip, pallete.horizon))
                        )
                      )
                    })
                  },
                ],
              })({})
            })
          })({})
        }, config.walletLink.wallet))


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
                const newLocal: string = timeFrameLablMap[option]

                return $text(newLocal)
              })
            })({ select: selectTimeFrameTether() }),
          ),


          $row(style({ position: 'relative', height: '400px', maxHeight: '60vh', borderBottom: `1px solid rgba(191, 187, 207, 0.15)` }))(

            $IntermediatePromise({
              query: config.pricefeed,
              $$done: snapshot((tf, data) => {

                const fst = data[data.length - 1]
                const initialTick = {
                  open: formatFixed(fst.o, 30),
                  high: formatFixed(fst.h, 30),
                  low: formatFixed(fst.l, 30),
                  close: formatFixed(fst.c, 30),
                  time: fst.timestamp as Time
                }

                return $CandleSticks({

                  series: [
                    {
                      data: data.map(({ o, h, l, c, timestamp }) => {
                        const open = formatFixed(o, 30)
                        const high = formatFixed(h, 30)
                        const low = formatFixed(l, 30)
                        const close = formatFixed(c, 30)

                        return { open, high, low, close, time: timestamp as Time }
                      }),
                      seriesConfig: {
                        priceFormat: {
                          type: 'custom',
                          formatter: (priceValue: BarPrice) => readableNumber(priceValue.valueOf())
                        },
                        priceLineColor: pallete.foreground,
                        baseLineStyle: LineStyle.Dotted,

                        upColor: pallete.middleground,
                        borderUpColor: pallete.middleground,
                        wickUpColor: pallete.middleground,

                        downColor: 'transparent',
                        borderDownColor: colorAlpha(pallete.middleground, .5),
                        wickDownColor: colorAlpha(pallete.middleground, .5),
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
                            color: pallete.indeterminate,
                            lineVisible: true,
                            lineWidth: 1,
                            axisLabelVisible: true,
                            title: `Liquidation`,
                            lineStyle: LineStyle.SparseDotted,
                          }
                        }, liquidationPrice)

                      ],
                      appendData: scan((prev: CandlestickData, nextPrice): CandlestickData => {
                        const marketPrice = formatFixed(nextPrice, 30)
                        const timeNow = unixTimestampNow()

                        const prevTimeSlot = Math.floor(prev.time as number / tf)

                        const nextTimeSlot = Math.floor(timeNow / tf)
                        const time = nextTimeSlot * tf as Time

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
                      }, initialTick, indexTokenPrice),
                    }
                  ],
                  containerOp: style({
                    inset: 0,
                    position: 'absolute',
                  }),
                  chartConfig: {
                    rightPriceScale: {
                      visible: true,
                      autoScale: true,
                      entireTextOnly: true,
                      borderVisible: false,
                      scaleMargins: {
                        top: 0.15,
                        bottom: 0.15
                      }
                    },
                    timeScale: {
                      timeVisible: false,
                      borderVisible: true,
                      rightOffset: 10,

                      // fixRightEdge: true,
                      shiftVisibleRangeOnNewBar: true,
                      borderColor: pallete.horizon,
                    }
                  },
                })({
                  // crosshairMove: sampleChartCrosshair(),
                  // click: sampleClick()
                })
              }, timeframe)
            })({}),
            // switchLatest(map(feed => {
            //   if (feed) {
            //     return empty()
            //   }

            //   return $node(style({ position: 'absolute', zIndex: 10, display: 'flex', inset: 0, backgroundColor: colorAlpha(pallete.middleground, .10), placeContent: 'center', alignItems: 'center' }))(
            //     $spinner
            //   )
            // }, selectedPricefeed)),
          ),

          $column(style({ flex: 1, position: 'relative' }))(
            switchLatest(map((w3p) => {

              const nullchain = w3p === null
              if (nullchain || config.chainList.indexOf(w3p.chain) === -1) {
                return $column(layoutSheet.spacingSmall, style({ flex: 1, alignItems: 'center', placeContent: 'center' }))(
                  $text(style({ fontSize: '1.5em' }))('Trade History'),
                  $text(style({ color: pallete.foreground, fontSize: '.75em' }))(
                    nullchain ? 'No wallet Connected' : 'Switch chain to see trading history'
                  )
                )
              }


              const PositionRouter = TRADE_CONTRACT_MAPPING[w3p.chain as keyof typeof TRADE_CONTRACT_MAPPING].PositionRouter
              const positionRouter = readContract(PositionRouter__factory, config.walletLink.defaultProvider, PositionRouter)

              const keeperCancelIncrease = map((ev: KeeperResponse) => getKeeperPositonKey(ev, true, true), filterNonAccountKeeperEvents(w3p, positionRouter.listen('CancelIncreasePosition')))
              const keeperCancelDecrease = map((ev: KeeperResponse) => getKeeperPositonKey(ev, false, true), filterNonAccountKeeperEvents(w3p, positionRouter.listen('CancelDecreasePosition')))


              const adjustPosition = mergeArray([
                keeperCancelIncrease,
                keeperCancelDecrease
              ])


              return $IntermediatePromise({
                query: tradeQuery,
                $$done: map(ev => {
                  return $Table2({
                    headerCellOp: style({ padding: '15px 15px' }),
                    cellOp: style({ padding: '4px 15px' }),
                    dataSource: now(ev ? [...ev.increaseList, ...ev.decreaseList] : []) as Stream<(RequestTrade | IPositionIncrease | IPositionDecrease)[]>,
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
                            $text(readableDate(timestamp)),
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
                            return $row(layoutSheet.spacingSmall)(
                              $txHashRef(txHash, w3p.chain, $text(`${direction} ${formatReadableUSD(pos.price)}`))
                            )
                          }



                          const isIncrease = pos.state.isIncrease
                          return $row(layoutSheet.spacingSmall)(
                            $txHashRef(pos.ctx.hash, w3p.chain,
                              $text(`${isIncrease ? '↑' : '↓'} ${formatReadableUSD(pos.acceptablePrice)} ${isIncrease ? '<' : '>'}`)
                            ),

                            switchLatest(mergeArray([
                              now($spinner),
                              map(req => {

                                const message = $text(`${req.isRejected ? `✖ ${formatReadableUSD(req.acceptablePrice)}` : `✔ ${formatReadableUSD(req.acceptablePrice)}`}`)
                                return $requestRow(
                                  $txHashRef('res.transactionHash', w3p.chain, message),
                                  $infoTooltip('transaction was sent, keeper will execute the request, the request will either be executed or rejected'),
                                )
                              }, adjustPosition),
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
                })
              })({

              })

            }, config.walletLink.wallet))
          ),
        ),
      )
    ),

    {
      requestPricefeed: mergeArray([
        requestTradePricefeed,
        requestPricefeed
      ]),
      requestAccountTradeList: map(w3p => {
        if (w3p === null || config.chainList.indexOf(w3p.chain) === -1) {
          return null
        }

        return {
          account: w3p.address,
          chain: w3p.chain,
        }
      }, config.walletLink.wallet),
      changeRoute,
      walletChange,
      changeNetwork
    }
  ]
})

function getKeeperPositonKey(ev: KeeperResponse, isIncrease: boolean, isRejected: boolean): KeeperExecuteAbstract {
  const key = getPositionKey(ev.account, isIncrease ? ev.path[1] : ev.path[0], ev.indexToken, ev.isLong)

  return { ...ev, key, isIncrease, isRejected }
}

const filterNonAccountKeeperEvents = (w3p: IWalletState, s: Stream<KeeperResponse>) => filter(ev => w3p.address.toLowerCase() === ev.account.toLowerCase(), s)

function fallbackToSupportedToken(chain: CHAIN, token: ITokenInput | null) {
  try {
    return resolveAddress(chain, token)
  } catch (err) {
    return AddressZero
  }

}

// const filterPositionChange = <T extends IAbstractPositionIdentifier>(s: Stream<T>) => filterNull(combine((key, ev: T): T | null => key === ev.key ? ev : null, positionKey, s))

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

