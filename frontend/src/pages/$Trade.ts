import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { $node, $text, component, eventElementTarget, INode, nodeEvent, style, styleBehavior, styleInline } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import {
  AddressZero, formatFixed, intervalTimeMap, IPricefeed, IPricefeedParamApi, ITrade, unixTimestampNow, ITradeOpen, BASIS_POINTS_DIVISOR, getNextAveragePrice,
  getNextLiquidationPrice, getMarginFees, STABLE_SWAP_FEE_BASIS_POINTS, STABLE_TAX_BASIS_POINTS, SWAP_FEE_BASIS_POINTS, TAX_BASIS_POINTS,
  getDenominator, USD_PERCISION, formatReadableUSD, timeSince, getPositionKey, IPositionIncrease,
  IPositionDecrease, getPnL, ARBITRUM_ADDRESS_STABLE, AVALANCHE_ADDRESS_STABLE, getFundingFee, filterNull, getTokenUsd, getLiquidationPrice,
  ITokenIndex, ITokenStable, ITokenInput, TradeStatus, LIMIT_LEVERAGE, div, readableDate, TRADE_CONTRACT_MAPPING, getTokenAmount, abs, IAccountParamApi, TOKEN_ADDRESS_TO_SYMBOL, CHAIN_ADDRESS_MAP,
} from "@gambitdao/gmx-middleware"

import { map, mergeArray, multicast, scan, skipRepeats, switchLatest, empty, now, awaitPromises, snapshot, debounce, zip, combine, tap, constant } from "@most/core"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $arrowsFlip, $infoTooltip, $IntermediatePromise, $ProfitLossText, $RiskLiquidator, $spinner, $txHashRef, invertColor } from "@gambitdao/ui-components"
import { CandlestickData, LineStyle, Time } from "lightweight-charts"
import { Stream } from "@most/types"
import { connectTradeReader, getErc20Balance, IPositionGetter, latestPriceFromExchanges } from "../logic/contract/trade"
import { $TradeBox, ITradeFocusMode, ITradeState, RequestTradeQuery } from "../components/trade/$TradeBox"
import { $ButtonToggle } from "../common/$Toggle"
import { $Table2 } from "../common/$Table2"
import { $Entry } from "./$Leaderboard"
import { $CandleSticks } from "../components/chart/$CandleSticks"
import { getFeeBasisPoints, getNativeTokenDescription, getTokenDescription, resolveAddress } from "../logic/utils"
import { BrowserStore } from "../logic/store"
import { ContractTransaction } from "@ethersproject/contracts"
import { getContractAddress, getMappedValue } from "../logic/common"
import { CHAIN, IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { Web3Provider } from "@ethersproject/providers"
import { ERC20__factory } from "@gambitdao/gbc-contracts"
import { $iconCircular } from "../elements/$common"


export interface ITradeComponent {
  referralCode: string
  chainList: CHAIN[]
  tokenIndexMap: Partial<Record<CHAIN, ITokenIndex[]>>
  tokenStableMap: Partial<Record<CHAIN, ITokenStable[]>>
  store: BrowserStore<"ROOT.v1", "v1">
  parentRoute: Route

  walletLink: IWalletLink
  // defaultProvider: BaseProvider
  // provider: Web3Provider | BaseProvider

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

) => {


  const tradeReader = connectTradeReader(config.walletLink.provider)
  const globalTradeReader = connectTradeReader(config.walletLink.defaultProvider)

  const executionFee = replayLatest(multicast(tradeReader.executionFee))

  const openTradeList = map(async list => (await list).filter((t): t is ITradeOpen => t.status === TradeStatus.OPEN), config.accountTradeList)

  const tradingStore = config.store.craete('trade', 'tradeBox')

  const timeFrameStore = tradingStore.craete('portfolio-chart-interval', intervalTimeMap.MIN60)

  const isTradingEnabledStore = tradingStore.craete('isTradingEnabled', false)
  const leverageStore = tradingStore.craete('leverage', LIMIT_LEVERAGE / 4n)
  const focusModeStore = tradingStore.craete('focusMode', ITradeFocusMode.collateral)
  const isLongStore = tradingStore.craete('isLong', true)
  const inputTokenStore = tradingStore.craete('inputToken', AddressZero as ITokenInput)
  const indexTokenStore = tradingStore.craete('indexToken', null as ITokenIndex | null)
  const collateralTokenStore = tradingStore.craete('collateralToken', null as ITokenStable | null)
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


  const inputToken: Stream<ITokenInput> = inputTokenStore.storeReplay(changeInputToken)
  const indexToken: Stream<ITokenIndex> = indexTokenStore.storeReplay(
    mergeArray([map(t => t.indexToken, switchTrade), changeIndexToken]),
    combine((chain, token) => {
      const matchedToken = config.tokenIndexMap[chain]?.find(t => t === token)

      return matchedToken || getMappedValue(CHAIN_ADDRESS_MAP, chain, CHAIN.ARBITRUM).NATIVE_TOKEN
    }, config.walletLink.network)
  )

  const collateralTokenReplay: Stream<ITokenStable> = collateralTokenStore.storeReplay(
    changeCollateralToken,
    combine((chain, token) => {
      const matchedToken = config.tokenStableMap[chain]?.find(t => t === token)

      return matchedToken || getMappedValue(CHAIN_ADDRESS_MAP, chain, CHAIN.ARBITRUM).USDC
    }, config.walletLink.network)
  )

  const collateralToken: Stream<ITokenStable | ITokenIndex> = replayLatest(multicast(map(params => {
    return params.isLong ? params.indexToken : params.collateralTokenReplay
  }, combineObject({ isLong, indexToken, collateralTokenReplay }))))


  const walletBalance = replayLatest(multicast(awaitPromises(combineArray(async (provider, token) => {
    if (provider instanceof Web3Provider) {
      return getErc20Balance(token, provider)
    }

    return 0n
  }, config.walletLink.provider, inputToken))))


  const inputTokenPrice = tradeReader.getLatestPrice(inputToken)
  const indexTokenPrice = multicast(switchLatest(map(token => latestPriceFromExchanges(token), indexToken)))
  const collateralTokenPrice = tradeReader.getLatestPrice(collateralToken)


  const account = map(signer => {
    return signer ? signer.address : null
  }, config.walletLink.wallet)


  const positionConfigChange = debounce(10, combineObject({ account, indexToken, collateralToken, isLong }))

  const positionKey = skipRepeats(map(params => {
    const collateralToken = params.isLong ? params.indexToken : params.collateralToken

    return getPositionKey(params.account || AddressZero, collateralToken, params.indexToken, params.isLong)
  }, positionConfigChange))



  // const keeperExecuteIncrease = globalTradeReader.executeIncreasePosition
  // const keeperDecreaseIncrease = globalTradeReader.executeDecreasePosition
  // const keeperCancelIncrease = globalTradeReader.cancelIncreasePosition
  // const keeperCancelDecrease = globalTradeReader.executeDecreasePosition


  const keeperExecuteIncrease = tradeReader.executeIncreasePosition // mapKeeperEvent(globalPositionRouterReader.listen<KeeperIncreaseRequest>('ExecuteIncreasePosition'))
  const keeperDecreaseIncrease = tradeReader.executeDecreasePosition // mapKeeperEvent(globalPositionRouterReader.listen<KeeperDecreaseRequest>('ExecuteDecreasePosition'))
  const keeperCancelIncrease = tradeReader.cancelIncreasePosition // mapKeeperEvent(globalPositionRouterReader.listen<KeeperIncreaseRequest>('CancelIncreasePosition'))
  const keeperCancelDecrease = tradeReader.executeDecreasePosition // mapKeeperEvent(globalPositionRouterReader.listen<KeeperDecreaseRequest>('CancelDecreasePosition'))


  const adjustPosition = multicast(mergeArray([
    keeperExecuteIncrease,
    keeperDecreaseIncrease,
    keeperCancelIncrease,
    keeperCancelDecrease,
  ]))

  const positionQuery = replayLatest(multicast(switchLatest(map(vault => {
    return map(async key => {
      const positionAbstract = await vault.positions(key)
      const [size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl, lastIncreasedTime] = positionAbstract
      const lastIncreasedTimeBn = lastIncreasedTime.toBigInt()
      return {
        key,
        size: size.toBigInt(),
        collateral: collateral.toBigInt(),
        averagePrice: averagePrice.toBigInt(),
        entryFundingRate: entryFundingRate.toBigInt(),
        reserveAmount: reserveAmount.toBigInt(),
        realisedPnl: realisedPnl.toBigInt(),
        lastIncreasedTime: lastIncreasedTimeBn,
      }

    }, positionKey)
  }, tradeReader.vaultReader.contract))))


  const settlePosition = filterNull(snapshot(
    (pos, update): IPositionGetter | null => {
      if (pos.key !== update.key) {
        return null
      }

      return {
        key: pos.key,
        size: 0n,
        collateral: 0n,
        averagePrice: 0n,
        entryFundingRate: 0n,
        reserveAmount: 0n,
        realisedPnl: 0n,
        lastIncreasedTime: 0n,
      }
    },
    awaitPromises(positionQuery),
    mergeArray([tradeReader.positionCloseEvent, tradeReader.positionLiquidateEvent])
  ))

  const updatePostion = filterNull(snapshot(
    (pos, update): any => {
      if (pos.key !== update.key) {
        return null
      }

      return { ...pos, ...update }
    },
    awaitPromises(positionQuery),
    tradeReader.positionUpdateEvent
  ))

  const positionChange = multicast(mergeArray([
    settlePosition,
    updatePostion,
  ]))

  const position: Stream<IPositionGetter> = replayLatest(multicast(mergeArray([
    awaitPromises(positionQuery),
    positionChange
  ])))


  const tradeQuery: Stream<Promise<ITradeOpen | null>> = mergeArray([
    combineArray(async (posQuery, listQuery) => {
      const res = await posQuery
      if (res.averagePrice === 0n) {
        return null
      }

      const trade = (await listQuery).find(t => t.key === res.key) || null

      // if (!trade) {
      //   const timestamp = unixTimestampNow()
      //   const syntheticUpdate = { ...res, timestamp, realisedPnl: 0n, markPrice: res.averagePrice, isLong, __typename: 'UpdatePosition' }
      //   return {
      //     ...res,
      //     isLong, timestamp,
      //     updateList: [syntheticUpdate],
      //     increaseList: [], decreaseList: [],
      //     fee: 0n,
      //     status: TradeStatus.OPEN
      //   } as any as ITradeOpen
      // }

      return trade
    }, positionQuery, openTradeList)
  ])

  const inputTokenWeight = tradeReader.getTokenWeight(inputToken)
  const inputTokenDebtUsd = tradeReader.getTokenDebtUsd(inputToken)

  const inputTokenDescription = combineArray((chain, address) => address === AddressZero ? getNativeTokenDescription(chain) : getTokenDescription(address), config.walletLink.network, inputToken)
  const indexTokenDescription = map((address) => getTokenDescription(address), indexToken)
  const collateralTokenDescription = map((address) => getTokenDescription(address), collateralToken)


  const walletBalanceUsd = awaitPromises(combineArray(async (balance, price, tokenDesc) => {
    // console.log(price)
    return getTokenUsd(balance, price, tokenDesc.decimals)
  }, walletBalance, inputTokenPrice, inputTokenDescription))

  const indexTokenInfo = tradeReader.getTokenInfo(indexToken)
  const collateralTokenFundingInfo = tradeReader.getTokenFundingInfo(combineObject({ token: collateralToken, description: collateralTokenDescription }))


  const swapFee = replayLatest(multicast(skipRepeats(map((params) => {
    const inputAndIndexStable = params.inputTokenDescription.isStable && params.indexTokenDescription.isStable
    const swapFeeBasisPoints = inputAndIndexStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = inputAndIndexStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS

    if (params.collateralDeltaUsd === 0n || params.inputToken === params.collateralToken) {
      return 0n
    }

    const adjustedPnlDelta = params.isIncrease
      ? 0n
      : getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, params.position.size) * abs(params.sizeDeltaUsd) / params.position.size

    const amountUsd = abs(params.collateralDeltaUsd) + adjustedPnlDelta

    const usdgAmount = amountUsd * getDenominator(params.inputTokenDescription.decimals) / USD_PERCISION

    const feeBps0 = getFeeBasisPoints(
      params.inputTokenDebtUsd,
      params.inputTokenWeight,
      usdgAmount,
      swapFeeBasisPoints,
      taxBasisPoints,
      true,
      params.usdgSupply,
      params.totalTokenWeight
    )
    const feeBps1 = getFeeBasisPoints(
      params.indexTokenInfo.usdgAmounts,
      params.indexTokenInfo.weight,
      usdgAmount,
      swapFeeBasisPoints,
      taxBasisPoints,
      false,
      params.usdgSupply,
      params.totalTokenWeight
    )

    const feeBps = feeBps0 > feeBps1 ? feeBps0 : feeBps1
    const addedSwapFee = feeBps ? amountUsd * feeBps / BASIS_POINTS_DIVISOR : 0n

    return addedSwapFee
  }, combineObject({
    collateralToken, inputToken, isIncrease, sizeDeltaUsd, isLong, collateralDeltaUsd,
    indexTokenInfo: indexTokenInfo, usdgSupply: tradeReader.usdgSupply, totalTokenWeight: tradeReader.totalTokenWeight,
    position, inputTokenDescription, inputTokenWeight, inputTokenDebtUsd, indexTokenDescription, indexTokenPrice
  })))))

  const marginFee = map((size) => getMarginFees(abs(size)), sizeDeltaUsd)
  const fundingFee = map(params => {
    return getFundingFee(params.position.entryFundingRate, params.collateralTokenFundingInfo.cumulative, params.position.size)
  }, combineObject({ collateralTokenFundingInfo, position }))


  const leverage = leverageStore.store(mergeArray([
    changeLeverage,
    zip((params, stake) => {
      if (stake.averagePrice > 0n) {
        return div(stake.size + params.sizeDeltaUsd, stake.collateral + params.collateralDeltaUsd - params.fundingFee)
      }

      return leverageStore.getState()
    }, combineObject({ collateralDeltaUsd, sizeDeltaUsd, fundingFee }), position),
  ]))


  const tradeConfig = { focusMode, slippage, isLong, isIncrease, inputToken, collateralToken, indexToken, leverage, collateralDeltaUsd, sizeDeltaUsd }

  const collateralDelta = map(params => {
    return getTokenAmount(params.collateralDeltaUsd, params.inputTokenPrice, params.inputTokenDescription.decimals)
  }, combineObject({ inputTokenPrice, inputTokenDescription, collateralDeltaUsd }))

  const sizeDelta = map(params => {
    return getTokenAmount(params.sizeDeltaUsd, params.indexTokenPrice, params.indexTokenDescription.decimals)
  }, combineObject({ indexTokenDescription, indexTokenPrice, sizeDeltaUsd }))


  const averagePrice = map(params => {
    if (params.position.averagePrice === 0n) {
      return 0n
    }

    if (params.sizeDeltaUsd === 0n) {
      return params.position.averagePrice
    }

    const pnl = getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, params.position.size)
    // const adjustedPnlDelta = pnl < 0n ? params.sizeDeltaUsd * pnl / stake.size : pnl
    // console.log(formatReadableUSD(adjustedPnlDelta))

    return getNextAveragePrice(params.isLong, params.position.size, params.indexTokenPrice, pnl, params.sizeDeltaUsd)
  }, combineObject({ position, isIncrease, indexTokenPrice, sizeDeltaUsd, isLong }))

  const liquidationPrice = map(params => {
    const stake = params.position
    if (params.position.averagePrice === 0n) {
      if (params.sizeDeltaUsd === 0n) {
        return 0n
      }
      return getLiquidationPrice(params.isLong, params.collateralDeltaUsd, params.sizeDeltaUsd, params.indexTokenPrice)
    }

    const pnl = getPnL(params.isLong, stake.averagePrice, params.indexTokenPrice, stake.size)
    const entryPrice = stake.averagePrice
    const price = getNextLiquidationPrice(params.isLong, stake.size, stake.collateral, entryPrice, stake.entryFundingRate, params.collateralTokenFundingInfo.cumulative, pnl, params.sizeDeltaUsd, params.collateralDeltaUsd)

    return price
  }, combineObject({ position, isIncrease, collateralDeltaUsd, collateralTokenFundingInfo, sizeDeltaUsd, averagePrice, indexTokenPrice, indexTokenDescription, isLong }))


  const requestPricefeed = combineArray((chain, tokenAddress, interval): IPricefeedParamApi => {
    const range = interval * 1000
    const to = unixTimestampNow()
    const from = to - range


    return { chain, interval, tokenAddress: resolveAddress(chain, tokenAddress), from, to }
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
    awaitPromises(snapshot(async (collateralDeltaUsd, params) => {
      if (params.wallet === null) {
        console.warn(new Error('No wallet connected'))
        return false
      }

      // const erc20 = connectErc20(inputToken, map(w3p => , config.walletProvider))
      const c = ERC20__factory.connect(params.inputToken, params.wallet.signer)

      if (params.inputToken === AddressZero) {
        return true
      }

      const contractAddress = getContractAddress(TRADE_CONTRACT_MAPPING, params.wallet.chain, 'Router')

      if (contractAddress === null) {
        return false
      }

      try {
        const allowedSpendAmount = (await c.allowance(params.wallet.address, contractAddress)).toBigInt()
        return allowedSpendAmount > collateralDeltaUsd
      } catch (err) {
        console.warn(err)
        return false
      }

    }, collateralDeltaUsd, combineObject({ wallet: config.walletLink.wallet, inputToken }))),
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

  const requestAccountTradeList: Stream<IAccountParamApi | null> = map(w3p => {
    if (w3p === null || config.chainList.indexOf(w3p.chain) === -1) {
      return null
    }

    return {
      account: w3p.address,
      chain: w3p.chain,
    }
  }, config.walletLink.wallet)



  return [
    $container(
      $node(layoutSheet.spacingBig, style({ flex: 1, paddingBottom: '50px', display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'column' : 'column-reverse' }))(

        filterNull(
          map(ev => {
            console.log(ev)
            return null
          }, adjustPosition)
        ) as Stream<any>,

        $column(layoutSheet.spacingSmall)(
          $TradeBox({
            ...config,

            trade: tradeQuery,
            positionChange,
            pricefeed: config.pricefeed,

            tradeConfig,
            tradeState: {
              key: positionKey,
              position,

              indexTokenInfo,
              collateralTokenFundingInfo,
              isTradingEnabled,
              isIndexTokenApproved,
              sizeDelta,
              collateralDelta,

              inputTokenPrice,
              indexTokenPrice,
              collateralTokenPrice,
              collateralTokenDescription,
              indexTokenDescription,
              inputTokenDescription,
              fundingFee,
              marginFee,
              swapFee,
              averagePrice,
              liquidationPrice,
              executionFee,
              walletBalance,
              walletBalanceUsd,
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

        $node(),

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
            query: openTradeList,
            $$done: map(res => {

              return $Table2<ITradeOpen>({
                $container: $column(layoutSheet.spacing),
                scrollConfig: {
                  $container: $column(layoutSheet.spacingBig)
                },
                bodyCellOp: style({ alignItems: 'center' }),
                dataSource: now(res),
                columns: [
                  {
                    $head: $text('Entry'),
                    columnOp: O(style({ maxWidth: '50px', flexDirection: 'column' }), layoutSheet.spacingTiny),
                    $body: map((pos) => {

                      return $Entry(w3p.chain, pos)
                    })
                  },
                  {
                    $head: $text('PnL'),
                    columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
                    $body: map((pos) => {
                      const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
                      const cumulativeFee = tradeReader.getTokenCumulativeFunding(now(pos.collateralToken))

                      const pnl = map(params => {
                        const entryRate = pos.updateList[pos.updateList.length - 1].entryFundingRate
                        const delta = getPnL(pos.isLong, pos.averagePrice, params.positionMarkPrice, pos.size)
                        const cumFee = getFundingFee(entryRate, params.cumulativeFee, pos.size)

                        return pos.realisedPnl + delta - cumFee - pos.fee
                      }, combineObject({ positionMarkPrice, cumulativeFee }))


                      return $row(
                        $infoTooltip(
                          $column(layoutSheet.spacingTiny)(
                            $row(layoutSheet.spacingTiny)(
                              $text(style({}))('Total Cumulative'),
                              // $text(style({ color: pallete.negative }))(map(fee => formatReadableUSD(pos.collateral + fee), fundingFee))
                            ),
                            $column(
                              $row(layoutSheet.spacingTiny)(
                                $text(style({ color: pallete.foreground }))('Deposit'),
                                $text(map(cumFee => {
                                  const entryFundingRate = pos.updateList[0].entryFundingRate
                                  const fee = getFundingFee(entryFundingRate, cumFee, pos.size)

                                  return formatReadableUSD(pos.collateral + fee)
                                }, cumulativeFee))
                              ),
                              $row(layoutSheet.spacingTiny)(
                                $text(style({ color: pallete.foreground }))('Margin Fee'),
                                $text(style({ color: pallete.indeterminate }))(formatReadableUSD(pos.fee))
                              ),
                              $row(layoutSheet.spacingTiny)(
                                $text(style({ color: pallete.foreground }))('Borrow Fee'),
                                $text(style({ color: pallete.indeterminate }))(map(cumFee => {
                                  const entryFundingRate = pos.updateList[0].entryFundingRate

                                  const fee = getFundingFee(entryFundingRate, cumFee, pos.size)
                                  return formatReadableUSD(fee)
                                }, cumulativeFee))
                              ),
                              $row(layoutSheet.spacingTiny)(
                                $text(style({ color: pallete.foreground }))('Withdrawn Pnl'),
                                $text(style({ color: pos.realisedPnl < 0n ? pallete.negative : pallete.positive }))(formatReadableUSD(pos.realisedPnl))
                              ),
                            )
                          )
                        ),
                        $ProfitLossText(pnl)
                      )
                    })
                  },
                  {
                    $head: $text('Collateral'),
                    columnOp: O(layoutSheet.spacingTiny, style({ flex: .7, placeContent: 'flex-end' })),
                    $body: map(pos => {
                      const cumFee = tradeReader.getTokenCumulativeFunding(now(pos.collateralToken))

                      return $row(
                        $text(map(cumulative => {
                          const entryRate = pos.updateList[pos.updateList.length - 1].entryFundingRate

                          return formatReadableUSD(pos.collateral - getFundingFee(entryRate, cumulative, pos.size))
                        }, cumFee))
                      )
                    })
                  },
                  {
                    $head: $text('Size'),
                    columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
                    $body: map(pos => {
                      const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))

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
          $row(layoutSheet.spacing, style({ fontSize: '0.85em', zIndex: 5, position: 'absolute', padding: '8px', placeContent: 'center', alignItems: 'center' }))(
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


          $row(
            style({ position: 'relative', backgroundColor: colorAlpha(invertColor(pallete.message), .15), borderBottom: `1px solid rgba(191, 187, 207, 0.15)` }),
            screenUtils.isDesktopScreen ? style({ flex: 1, maxHeight: '50vh' }) : style({ margin: '0 -15px', height: '50vh' })
          )(

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
                        // priceFormat: {
                        //   type: 'custom',
                        //   formatter: (priceValue: BarPrice) => readableNumber(priceValue.valueOf())
                        // },
                        priceLineColor: pallete.foreground,
                        baseLineStyle: LineStyle.SparseDotted,

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
                  containerOp: screenUtils.isDesktopScreen ? style({ position: 'absolute', inset: 0 }): style({}),
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
                      timeVisible: true,
                      secondsVisible: false,
                      borderVisible: false,
                      rightOffset: 13,
                      shiftVisibleRangeOnNewBar: true,
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

          $column(style({ minHeight: '200px', position: 'relative' }))(
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



              return $IntermediatePromise({
                query: tradeQuery,
                $$done: map(ev => {
                  return $Table2({
                    headerCellOp: style({ padding: screenUtils.isDesktopScreen ? '15px 15px' : '6px 4px' }),
                    cellOp: style({ padding: screenUtils.isDesktopScreen ? '4px 15px' : '6px 4px' }),
                    dataSource: mergeArray([
                      now(ev ? [...ev.increaseList, ...ev.decreaseList] : []) as Stream<(RequestTrade | IPositionIncrease | IPositionDecrease)[]>,
                      requestTradeRow
                    ]),
                    $container: $column(layoutSheet.spacing, screenUtils.isDesktopScreen ? style({ flex: '1 1 0', minHeight: '100px' }) : style({})),
                    scrollConfig: {
                      $container: $column(layoutSheet.spacingSmall),
                      insertAscending: true
                    },
                    columns: [
                      {
                        $head: $text('Time'),
                        columnOp: O(style({ maxWidth: '100px' })),

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




                          // const adjustPosition = mergeArray([
                          //   keeperExecuteIncrease,
                          //   keeperDecreaseIncrease,
                          //   keeperCancelIncrease,
                          //   keeperCancelDecrease,
                          // ])

                          const isIncrease = pos.state.isIncrease
                          return $row(layoutSheet.spacingSmall)(
                            $txHashRef(
                              pos.ctx.hash, w3p.chain,
                              $text(`${isIncrease ? '↑' : '↓'} ${formatReadableUSD(pos.acceptablePrice)} ${isIncrease ? '<' : '>'}`)
                            ),

                            switchLatest(mergeArray([
                              now($spinner),
                              map(req => {
                                const isRejected = req.__event.event === 'CancelIncreasePosition' || req.__event.event === 'CancelDecreasePosition'

                                const message = $text(`${isRejected ? `✖ ${formatReadableUSD(req.acceptablePrice)}` : `✔ ${formatReadableUSD(req.acceptablePrice)}`}`)

                                return $requestRow(
                                  $txHashRef(req.__event.transactionHash, w3p.chain, message),
                                  $infoTooltip('transaction was sent, keeper will execute the request, the request will either be executed or rejected'),
                                )
                              }, adjustPosition),
                            ]))
                          )

                        })
                      },
                      ...screenUtils.isDesktopScreen
                        ? [
                          {
                            $head: $text('Fees paid'),
                            columnOp: O(style({ flex: .4, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),

                            $body: map((req: RequestTrade | IPositionIncrease | IPositionDecrease) => {
                              const isKeeperReq = 'ctx' in req
                              const val = isKeeperReq ? getMarginFees(req.state.collateralDeltaUsd) : req.fee

                              return $text(formatReadableUSD(val))
                            })
                          }
                        ] : [],
                      {
                        $head: $text('Collateral change'),
                        columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),

                        $body: map((req) => {
                          const isKeeperReq = 'ctx' in req
                          const delta = isKeeperReq ? req.state.collateralDeltaUsd : req.collateralDelta

                          return $text(formatReadableUSD(delta))
                        })
                      },
                      {
                        $head: $text('Size change'),
                        columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),
                        $body: map((req) => {
                          const isKeeperReq = 'ctx' in req
                          const delta = isKeeperReq ? req.state.sizeDeltaUsd : req.sizeDelta

                          return $text(formatReadableUSD(delta))
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
      requestPricefeed,
      requestAccountTradeList,
      changeRoute,
      walletChange,
      changeNetwork
    }
  ]
})




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

const logStream = tap(x => console.log(x))


