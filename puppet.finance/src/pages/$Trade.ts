import { Behavior, O, combineArray, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, layoutSheet, observer, screenUtils } from "@aelea/ui-components"
import {
  ARBITRUM_ADDRESS_STABLE, AVALANCHE_ADDRESS_STABLE,
  AddressZero,
  BASIS_POINTS_DIVISOR, CHAIN_ADDRESS_MAP,
  IPositionDecrease, IPositionIncrease,
  IRequestPricefeedApi, ITokenIndex, ITokenInput, ITokenStable, ITrade, ITradeOpen,
  IntervalTime,
  LIMIT_LEVERAGE,
  STABLE_SWAP_FEE_BASIS_POINTS, STABLE_TAX_BASIS_POINTS, SWAP_FEE_BASIS_POINTS,
  TAX_BASIS_POINTS,
  TRADE_CONTRACT_MAPPING,
  TradeStatus,
  USD_PERCISION,
  abi, abs,
  div, filterNull, formatFixed, formatReadableUSD, formatToBasis, getAdjustedDelta, getDenominator, getFeeBasisPoints, getFundingFee, getLiquidationPrice, getMappedValue, getMarginFees, getNativeTokenDescription, getNextAveragePrice, getNextLiquidationPrice, getPnL, getPositionKey, getSafeMappedValue, getTokenAmount, getTokenDescription, gmxSubgraph,
  intervalTimeMap,
  readableDate, readableNumber,
  switchMap,
  timeSince,
  unixTimestampNow
} from "@gambitdao/gmx-middleware"

import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { CHAIN } from "@gambitdao/const"
import { $ButtonToggle, $IntermediatePromise, $infoLabel, $infoTooltip, $spinner, $txHashRef } from "@gambitdao/ui-components"
import { IWalletName } from "@gambitdao/wallet-link"
import { awaitPromises, combine, constant, debounce, empty, filter, map, mergeArray, multicast, now, scan, skipRepeats, skipRepeatsWith, snapshot, switchLatest, take, zip } from "@most/core"
import { Stream } from "@most/types"
import { readContract } from "@wagmi/core"
import { erc20Abi } from "abitype/test"
import { CandlestickData, LineStyle, Time } from "lightweight-charts"
import { Hex, TransactionReceipt } from "viem"
import { $IntermediateConnectButton } from "../components/$ConnectAccount"
import { $CardTable } from "../components/$common"
import { $CandleSticks } from "../components/chart/$CandleSticks"
import { $ButtonSecondary } from "../components/form/$Button"
import { $Dropdown } from "../components/form/$Dropdown"
import { $TradeBox, ITradeFocusMode, ITradeState, RequestTradeQuery } from "../components/trade/$TradeBox"
import { $card } from "../elements/$common"
import { $caretDown } from "../elements/$icons"
import { connectMappedContractConfig, contractReader, listenContract } from "../logic/common"
import * as tradeReader from "../logic/contract/trade"
import { BrowserStore } from "../logic/store"
import { resolveAddress } from "../logic/utils"
import { account, wallet } from "../wallet/walletLink"
import { walletLink } from "../wallet"


export interface ITradeComponent {
  referralCode: Hex
  tokenIndexMap: Partial<Record<number, ITokenIndex[]>>
  tokenStableMap: Partial<Record<number, ITokenStable[]>>
  store: BrowserStore<"ROOT.v1", "v1">
  parentRoute: Route
}



type RequestTrade = {
  ctx: TransactionReceipt
  state: ITradeState
  acceptablePrice: bigint
}



const timeFrameLablMap = {
  [intervalTimeMap.MIN5]: '5m',
  [intervalTimeMap.MIN15]: '15m',
  [intervalTimeMap.MIN60]: '1h',
  [intervalTimeMap.HR4]: '4h',
  [intervalTimeMap.HR24]: '1d',
  [intervalTimeMap.DAY7]: '1w',
}


export const $Trade = (config: ITradeComponent) => component((
  [selectTimeFrame, selectTimeFrameTether]: Behavior<IntervalTime, IntervalTime>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,

  [changeInputToken, changeInputTokenTether]: Behavior<ITokenInput, ITokenInput>,
  [changeIndexToken, changeIndexTokenTether]: Behavior<ITokenIndex, ITokenIndex>,
  [changeCollateralToken, changeCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE, ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE>,

  [switchFocusMode, switchFocusModeTether]: Behavior<ITradeFocusMode, ITradeFocusMode>,
  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,
  [switchIsIncrease, switchIsIncreaseTether]: Behavior<boolean, boolean>,

  [changeCollateralDeltaUsd, changeCollateralDeltaUsdTether]: Behavior<bigint, bigint>,
  [changeSizeDeltaUsd, changeSizeDeltaUsdTether]: Behavior<bigint, bigint>,

  // [requestAccountTradeList, requestAccountTradeListTether]: Behavior<IAccountTradeListParamApi, IAccountTradeListParamApi>,
  [changeLeverage, changeLeverageTether]: Behavior<bigint, bigint>,
  [changeSlippage, changeSlippageTether]: Behavior<string, string>,

  [changeInputTokenApproved, changeInputTokenApprovedTether]: Behavior<boolean, boolean>,

  [enableTrading, enableTradingTether]: Behavior<boolean, boolean>,

  [switchTrade, switchTradeTether]: Behavior<ITrade, ITrade>,
  [requestTrade, requestTradeTether]: Behavior<RequestTradeQuery, RequestTradeQuery>,

) => {

  const vaultConfig = connectMappedContractConfig(TRADE_CONTRACT_MAPPING, 'Vault', abi.vault)
  const vaultListener = listenContract(vaultConfig)
  const vaultReader = contractReader(vaultConfig)



  const executionFee = replayLatest(multicast(tradeReader.positionRouter.read('minExecutionFee')))

  const tradingStore = config.store.craete('trade', 'tradeBox')

  const timeFrameStore = tradingStore.craete('portfolio-chart-interval', intervalTimeMap.MIN60)

  const isTradingEnabledStore = tradingStore.craete('isTradingEnabled-v2', false)
  const leverageStore = tradingStore.craete('leverage', LIMIT_LEVERAGE / 4n)
  const focusModeStore = tradingStore.craete('focusMode', ITradeFocusMode.collateral)
  const isLongStore = tradingStore.craete('isLong', true)
  const inputTokenStore = tradingStore.craete('inputToken', AddressZero as ITokenInput)
  const indexTokenStore = tradingStore.craete('indexToken', null as ITokenIndex | null)
  const collateralTokenStore = tradingStore.craete('collateralToken', null as ITokenStable | null)
  const isIncreaseStore = tradingStore.craete('isIncrease', true)
  const slippageStore = tradingStore.craete('slippage', '0.35')
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
      if (!chain.chain || chain.chain.unsupported || token === AddressZero) {
        return token
      }

      const chainId = chain.chain.id

      const allTokens = [...config.tokenIndexMap[chainId] || [], ...config.tokenStableMap[chainId] || []]
      const matchedToken = allTokens?.find(t => t === token)

      return matchedToken || getSafeMappedValue(CHAIN_ADDRESS_MAP, chain, CHAIN.ARBITRUM).NATIVE_TOKEN
    }, walletLink.network)
  )

  const indexToken: Stream<ITokenIndex> = indexTokenStore.storeReplay(
    mergeArray([map(t => t.indexToken, switchTrade), changeIndexToken]),
    combine((network, token) => {
      if (!network.chain || network.chain.unsupported) {
        return AddressZero
      }

      const matchedToken = config.tokenIndexMap[network.chain.id]?.find(t => t === token)

      return matchedToken || getSafeMappedValue(CHAIN_ADDRESS_MAP, network, CHAIN.ARBITRUM).NATIVE_TOKEN
    }, walletLink.network)
  )

  const collateralTokenReplay: Stream<ITokenStable> = collateralTokenStore.storeReplay(
    mergeArray([map(t => t.collateralToken, switchTrade), changeCollateralToken]),
    combine((network, token) => {
      if (!network.chain || network.chain.unsupported) {
        return AddressZero
      }

      const matchedToken = config.tokenStableMap[network.chain.id]?.find(t => t === token)

      return matchedToken || getSafeMappedValue(CHAIN_ADDRESS_MAP, network, CHAIN.ARBITRUM).USDC
    }, walletLink.network)
  )

  const collateralToken: Stream<ITokenStable | ITokenIndex> = map(params => {
    return params.isLong ? params.indexToken : params.collateralTokenReplay
  }, combineObject({ isLong, indexToken, collateralTokenReplay }))


  const walletBalance = replayLatest(multicast(switchMap(params => {
    if (!params.wallet.network.chain || params.wallet.network.chain?.unsupported || !params.wallet.account.address) {
      return now(0n)
    }

    return tradeReader.getErc20Balance(params.wallet.network.chain, params.inputToken, params.wallet.account.address)
  }, combineObject({ inputToken, wallet }))))


  const inputTokenPrice = skipRepeats(tradeReader.getLatestPrice(inputToken))
  const indexTokenPrice = skipRepeats(multicast(switchLatest(map(token => {
    return observer.duringWindowActivity(tradeReader.latestPriceFromExchanges(token))
  }, indexToken))))
  const collateralTokenPrice = skipRepeats(tradeReader.getLatestPrice(collateralToken))



  const newLocal2 = debounce(50, combineObject({ account, indexToken, collateralToken, isLong }))
  const newLocal_1 = map(params => {
    const collateralToken = params.isLong ? params.indexToken : params.collateralToken
    const address = params.account.address || AddressZero
    const key = getPositionKey(address, collateralToken, params.indexToken, params.isLong)


    return { ...params, key, account: address, isLong: params.isLong, collateralToken }
  }, newLocal2)

  const positionKey = skipRepeatsWith((prev, next) => {
    return prev.key === next.key
  }, newLocal_1)


  const keeperExecuteIncrease = tradeReader.executeIncreasePosition
  const keeperDecreaseIncrease = tradeReader.executeDecreasePosition
  const keeperCancelIncrease = tradeReader.cancelIncreasePosition
  const keeperCancelDecrease = tradeReader.executeDecreasePosition


  // const keeperExecuteIncrease = tradeReader.executeIncreasePosition // mapKeeperEvent(globalPositionRouterReader.listen<KeeperIncreaseRequest>('ExecuteIncreasePosition'))
  // const keeperDecreaseIncrease = tradeReader.executeDecreasePosition // mapKeeperEvent(globalPositionRouterReader.listen<KeeperDecreaseRequest>('ExecuteDecreasePosition'))
  // const keeperCancelIncrease = tradeReader.cancelIncreasePosition // mapKeeperEvent(globalPositionRouterReader.listen<KeeperIncreaseRequest>('CancelIncreasePosition'))
  // const keeperCancelDecrease = tradeReader.executeDecreasePosition // mapKeeperEvent(globalPositionRouterReader.listen<KeeperDecreaseRequest>('CancelDecreasePosition'))


  const adjustPosition = multicast(mergeArray([
    keeperExecuteIncrease,
    keeperDecreaseIncrease,
    keeperCancelIncrease,
    keeperCancelDecrease,
  ]))

  const positions = vaultReader('positions', map(pos => pos.key, positionKey))

  const positionChange: Stream<tradeReader.IPositionGetter> = multicast(map(params => {
    const [size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl, lastIncreasedTime] = params.positions
    const lastIncreasedTimeBn = lastIncreasedTime

    const ret: tradeReader.IPositionGetter = {
      account: params.positionKey.account,
      isLong: params.positionKey.isLong,
      key: params.positionKey.key,
      indexToken: params.positionKey.indexToken,
      collateralToken: params.positionKey.collateralToken,
      size: size,
      collateral: collateral,
      averagePrice: averagePrice,
      entryFundingRate: entryFundingRate,
      reserveAmount: reserveAmount,
      realisedPnl: realisedPnl,
      lastIncreasedTime: lastIncreasedTimeBn,
    }
    return ret
  }, combineObject({ positionKey, positions })))


  const updatePostion = filterNull(snapshot(
    (pos, update) => {
      if (pos.key !== update.args.key) {
        return null
      }

      return { ...pos, ...update }
    },
    positionChange,
    tradeReader.positionUpdateEvent
    // tradeReader.positionUpdateEvent
  ))


  const position = replayLatest(multicast(mergeArray([
    positionChange,
    updatePostion,
    filterNull(snapshot(
      (pos, update): tradeReader.IPositionGetter | null => {
        if (pos.key !== update.args.key) {
          return null
        }

        return {
          ...pos,
          size: 0n,
          collateral: 0n,
          averagePrice: 0n,
          entryFundingRate: 0n,
          reserveAmount: 0n,
          realisedPnl: 0n,
          lastIncreasedTime: 0n,
        }
      },
      positionChange,
      mergeArray([tradeReader.positionCloseEvent, tradeReader.positionLiquidateEvent])
      // mergeArray([tradeReader.positionCloseEvent, tradeReader.positionLiquidateEvent])
    ))
  ])))

  const inputTokenWeight = vaultReader('tokenWeights', inputToken)
  const inputTokenDebtUsd = tradeReader.vault.read('usdgAmounts', inputToken)

  const inputTokenDescription = combineArray((network, token) => {
    if (network.chain!.unsupported || token === AddressZero) {
      return getNativeTokenDescription(network.chain!.id)
    }

    return getTokenDescription(token)
  }, walletLink.network, inputToken)
  const indexTokenDescription = map((address) => getTokenDescription(address), indexToken)
  const collateralTokenDescription = map((address) => getTokenDescription(address), collateralToken)


  const collateralTokenPoolInfo = replayLatest(multicast(tradeReader.getTokenPoolInfo(collateralToken)))


  const collateralDelta = map(params => {
    return getTokenAmount(params.collateralDeltaUsd, params.inputTokenPrice, params.inputTokenDescription.decimals)
  }, combineObject({ inputTokenPrice, inputTokenDescription, collateralDeltaUsd }))

  const sizeDelta = map(params => {
    return getTokenAmount(params.sizeDeltaUsd, params.indexTokenPrice, params.indexTokenDescription.decimals)
  }, combineObject({ indexTokenDescription, indexTokenPrice, sizeDeltaUsd }))


  const swapFee = replayLatest(multicast(skipRepeats(map((params) => {
    if (!params.network.chain || params.network.chain.unsupported) {
      return 0n
    }

    const inputAndIndexStable = params.inputTokenDescription.isStable && params.indexTokenDescription.isStable
    const swapFeeBasisPoints = inputAndIndexStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = inputAndIndexStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS

    const rsolvedInputAddress = resolveAddress(params.network.chain.id, params.inputToken)
    if (rsolvedInputAddress === params.collateralToken) {
      return 0n
    }


    let amountUsd = abs(params.collateralDeltaUsd)

    if (!params.isIncrease) {
      const pnl = getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, params.position.size)
      const adjustedDelta = getAdjustedDelta(params.position.size, abs(params.sizeDeltaUsd), pnl)

      if (adjustedDelta > 0n) {
        amountUsd = amountUsd + adjustedDelta
      }
    }


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
      params.collateralTokenPoolInfo.usdgAmounts,
      params.collateralTokenPoolInfo.tokenWeights,
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
    collateralToken, inputToken, isIncrease, sizeDeltaUsd, isLong, collateralDeltaUsd, network: walletLink.network,
    collateralTokenPoolInfo, usdgSupply: tradeReader.usdg.read('totalSupply'), totalTokenWeight: tradeReader.vault.read('totalTokenWeights'),
    position, inputTokenDescription, inputTokenWeight, inputTokenDebtUsd, indexTokenDescription, indexTokenPrice
  })))))

  const marginFee = map(size => getMarginFees(abs(size)), sizeDeltaUsd)
  const fundingFee = map(params => {
    return getFundingFee(params.position.entryFundingRate, params.collateralTokenPoolInfo.cumulativeRate, params.position.size)
  }, combineObject({ collateralTokenPoolInfo, position }))

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


  const averagePrice = map(params => {
    if (params.position.averagePrice === 0n) {
      return 0n
    }

    if (params.sizeDeltaUsd === 0n) {
      return params.position.averagePrice
    }

    const pnl = getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, params.position.size)
    // const adjustedPnlDelta = pnl < 0n ? params.sizeDeltaUsd * pnl / stake.size : pnl

    return getNextAveragePrice(params.isLong, params.position.size, params.indexTokenPrice, pnl, params.sizeDeltaUsd)
  }, combineObject({ position, isIncrease, indexTokenPrice, sizeDeltaUsd, isLong }))

  const liquidationPrice = skipRepeats(map(params => {
    const stake = params.position
    if (params.position.averagePrice === 0n) {
      if (params.sizeDeltaUsd === 0n) {
        return 0n
      }
      return getLiquidationPrice(params.isLong, params.collateralDeltaUsd, params.sizeDeltaUsd, params.indexTokenPrice)
    }

    const pnl = getPnL(params.isLong, stake.averagePrice, params.indexTokenPrice, stake.size)
    const entryPrice = stake.averagePrice
    const price = getNextLiquidationPrice(params.isLong, stake.size, stake.collateral, entryPrice, stake.entryFundingRate, params.collateralTokenPoolInfo.cumulativeRate, pnl, params.sizeDeltaUsd, params.collateralDeltaUsd)

    return price
  }, combineObject({ position, isIncrease, collateralDeltaUsd, collateralTokenPoolInfo, sizeDeltaUsd, averagePrice, indexTokenPrice, indexTokenDescription, isLong })))


  const requestTradeRow: Stream<RequestTrade[]> = switchLatest(awaitPromises(map(res => {
    return res.ctxQuery
      .then(ctx => {
        return now([{ ctx, state: res.state, acceptablePrice: res.acceptablePrice }])
      })
      .catch(err => empty())
  }, requestTrade)))


  const isInputTokenApproved = replayLatest(multicast(mergeArray([
    changeInputTokenApproved,
    awaitPromises(snapshot(async (collateralDeltaUsd, params) => {
      const chainId = params.wallet.network.chain?.id

      if (!chainId || params.wallet === null) {
        console.warn(new Error('No wallet connected'))
        return false
      }


      if (params.inputToken === AddressZero || !params.isIncrease) {
        return true
      }

      const contractAddress = getMappedValue(TRADE_CONTRACT_MAPPING, chainId).Router

      if (contractAddress === null || !params.wallet.account.address) {
        return false
      }

      try {
        const allowedSpendAmount = await readContract({
          address: params.wallet.account.address,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [params.wallet.account.address, contractAddress]
        })

        return allowedSpendAmount > collateralDeltaUsd
      } catch (err) {
        console.warn(err)
        return false
      }

    }, collateralDeltaUsd, combineObject({ wallet, inputToken, isIncrease }))),
  ])))

  const availableIndexLiquidityUsd = tradeReader.getAvailableLiquidityUsd(indexToken, collateralToken)


  const accountOpenTradeList = gmxSubgraph.accountOpenTradeList(
    map(w3p => {
      if (!w3p.account.address || !w3p.network.chain || w3p.network.chain.unsupported) {
        return null
      }

      return {
        account: w3p.account.address,
        chain: w3p.network.chain.id,
      }
    }, wallet)
  )

  const openTradeListQuery: Stream<Promise<ITradeOpen[]>> = mergeArray([
    combineArray(async (pos, listQuery) => {
      const tradeList = await listQuery

      if (pos.averagePrice === 0n && tradeList.length === 0) {
        return []
      }

      const trade = tradeList.find(t => t.key === pos.key) || null

      if (pos.averagePrice > 0n && trade === null) {
        const timestamp = unixTimestampNow()
        const syntheticUpdate = { ...pos, timestamp, realisedPnl: 0n, markPrice: pos.averagePrice, isLong: pos.isLong, __typename: 'UpdatePosition' }
        const newTrade = {
          ...pos,
          timestamp,
          updateList: [syntheticUpdate],
          increaseList: [], decreaseList: [],
          fee: 0n,
          status: TradeStatus.OPEN
        } as any as ITradeOpen

        return [newTrade, ...tradeList]
      }

      return pos.averagePrice === 0n
        ? tradeList.filter(t => t.key !== pos.key)
        : tradeList
    }, position, accountOpenTradeList)
  ])

  const activeTrade = zip((tradeList, pos) => {
    const trade = tradeList.find(t => t.key === pos.key) || null
    return { trade, positionId: pos }
  }, awaitPromises(openTradeListQuery), positionKey)

  // const activeTradeUnique = skipRepeatsWith((prev, next) => {
  //   return prev.positionId.key === next.positionId.key
  // }, activeTrade)
  // ipfs://bafyreihwgnhxonscmgxulqzqjo44fdvud3hzh6mphyvlqn2tuaqxxjaoty/metadata.json

  return [
    $node(
      style({
        fontSize: '1rem',
        fontFeatureSettings: '"tnum" on,"lnum" on',
        fontFamily: `-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif`,
        display: 'flex',
        ...screenUtils.isDesktopScreen
          ? { flexDirection: 'row-reverse', gap: '45px' }
          : { flexDirection: 'column' }
        // fontFamily: '-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif'
      })
    )(
      $node(
        layoutSheet.spacingBig, style({ userSelect: 'none', display: 'flex' }),
        screenUtils.isDesktopScreen
          ? style({ width: '455px', paddingBottom: '50px', flexDirection: 'column' })
          : style({ paddingBottom: '24px', flexDirection: 'column-reverse' })
      )(

        filterNull(
          constant(null, adjustPosition)
        ) as Stream<any>,

        $column(layoutSheet.spacingSmall)(
          $TradeBox({
            ...config,

            trade: zip(async (list, pos) => {
              const trade = (await list).find(t => t.key === pos.key) || null


              return trade
            }, openTradeListQuery, position),
            // positionChange,
            openTradeListQuery,

            tradeConfig,
            tradeState: {

              position,
              collateralTokenPoolInfo,
              isTradingEnabled,
              availableIndexLiquidityUsd,
              isInputTokenApproved,
              collateralDelta,
              sizeDelta,

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
            }
          })({
            leverage: changeLeverageTether(),
            switchTrade: switchTradeTether(),
            switchIsIncrease: switchIsIncreaseTether(),
            changeCollateralDeltaUsd: changeCollateralDeltaUsdTether(),
            changeSizeDeltaUsd: changeSizeDeltaUsdTether(),
            changeInputToken: changeInputTokenTether(),
            changeCollateralToken: changeCollateralTokenTether(),
            changeIndexToken: changeIndexTokenTether(),
            switchIsLong: switchIsLongTether(),
            changeRoute: changeRouteTether(),
            // changeCollateralRatio: changeCollateralRatioTether(),
            requestTrade: requestTradeTether(),
            changeSlippage: changeSlippageTether(),
            enableTrading: enableTradingTether(),
            approveInputToken: changeInputTokenApprovedTether(),
            switchFocusMode: switchFocusModeTether(),
          }),
        ),

        screenUtils.isDesktopScreen ? $node() : empty(),

      ),

      $column(layoutSheet.spacingSmall, style({ flex: 2 }))(
        $card(style({ padding: 0, position: 'relative' }))(

          $row(
            style({ height: '500px', position: 'relative' }),
            // screenUtils.isDesktopScreen
            //   ? style({ height: '500px' })
            //   : style({ height: '500px' })
          )(
            $row(layoutSheet.spacing, style({ fontSize: '0.85em', zIndex: 5, margin: '8px', alignSelf: 'flex-start', placeContent: 'center', alignItems: 'center' }))(
              screenUtils.isDesktopScreen
                ? $ButtonToggle({
                  selected: timeframe,
                  options: [
                    intervalTimeMap.MIN5,
                    intervalTimeMap.MIN15,
                    intervalTimeMap.MIN60,
                    intervalTimeMap.HR4,
                    intervalTimeMap.HR24,
                    // intervalTimeMap.DAY7,
                  ],
                  $$option: map(option => {
                    // @ts-ignore
                    const newLocal: string = timeFrameLablMap[option]

                    return $text(newLocal)
                  })
                })({ select: selectTimeFrameTether() })
                : $Dropdown({
                  // $container: $row(style({ position: 'relative', alignSelf: 'center',  })),
                  $selection: switchLatest(map((option) => {
                    // @ts-ignore
                    const newLocal: string = timeFrameLablMap[option]

                    return style({ padding: '8px', alignSelf: 'center' })(
                      $ButtonSecondary({
                        $content: $row(
                          $text(newLocal),
                          $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
                        )
                      })({})
                    )
                  }, timeframe)),
                  value: {
                    value: timeframe,
                    // $container: $defaultSelectContainer(style({ minWidth: '100px', right: 0 })),
                    $$option: map((option) => {
                      // @ts-ignore
                      const label: string = timeFrameLablMap[option]

                      return $text(style({ fontSize: '0.85em' }))(label)
                    }),
                    list: [
                      intervalTimeMap.MIN5,
                      intervalTimeMap.MIN15,
                      intervalTimeMap.MIN60,
                      intervalTimeMap.HR4,
                      intervalTimeMap.HR24,
                      // intervalTimeMap.DAY7,
                    ],
                  }
                })({
                  select: selectTimeFrameTether()
                }),
              $column(layoutSheet.spacingSmall)(
                $infoLabel('Borrow Rate'),
                $row(style({ whiteSpace: 'pre' }))(
                  $text(map(poolInfo => readableNumber(formatToBasis(poolInfo.rate)) + '%', collateralTokenPoolInfo)),
                  $text(style({ color: pallete.foreground }))(' / hr')
                )
              ),
              $column(layoutSheet.spacingSmall)(
                $infoLabel('Available Liquidity'),
                $text(map(amountUsd => formatReadableUSD(amountUsd), availableIndexLiquidityUsd))
              ),
            ),

            // $IntermediateConnectButton({
            //   $$display: snapshot((params, w3p) => {
            //     const range = params.timeframe * 1000
            //     const to = unixTimestampNow()
            //     const from = to - range

            //     const pricefeed = gmxSubgraph.pricefeed(now({
            //       chain: w3p.chain, interval, tokenAddress: resolveAddress(w3p.chain, tokenAddress), from, to
            //     }))

            //     const fst = data[data.length - 1]
            //     const initialTick = {
            //       open: formatFixed(fst.o, 30),
            //       high: formatFixed(fst.h, 30),
            //       low: formatFixed(fst.l, 30),
            //       close: formatFixed(fst.c, 30),
            //       time: fst.timestamp as Time
            //     }


            //     return $CandleSticks({
            //       series: [
            //         {
            //           data: data.map(({ o, h, l, c, timestamp }) => {
            //             const open = formatFixed(o, 30)
            //             const high = formatFixed(h, 30)
            //             const low = formatFixed(l, 30)
            //             const close = formatFixed(c, 30)

            //             return { open, high, low, close, time: timestamp as Time }
            //           }),
            //           seriesConfig: {
            //             // priceFormat: {
            //             //   type: 'custom',
            //             //   formatter: (priceValue: BarPrice) => readableNumber(priceValue.valueOf())
            //             // },
            //             // lastValueVisible: false,

            //             priceLineColor: pallete.foreground,
            //             baseLineStyle: LineStyle.SparseDotted,

            //             upColor: pallete.middleground,
            //             borderUpColor: pallete.middleground,
            //             wickUpColor: pallete.middleground,

            //             downColor: 'transparent',
            //             borderDownColor: colorAlpha(pallete.middleground, .5),
            //             wickDownColor: colorAlpha(pallete.middleground, .5),
            //           },
            //           priceLines: [
            //             map(val => {
            //               if (val === 0n) {
            //                 return null
            //               }

            //               return {
            //                 price: formatFixed(val, 30),
            //                 color: pallete.middleground,
            //                 lineVisible: true,
            //                 // axisLabelColor: '#fff',
            //                 // axisLabelTextColor: 'red',
            //                 // axisLabelVisible: true,
            //                 lineWidth: 1,
            //                 title: `Entry`,
            //                 lineStyle: LineStyle.SparseDotted,
            //               }
            //             }, averagePrice),
            //             map(val => {
            //               if (val === 0n) {
            //                 return null
            //               }

            //               return {
            //                 price: formatFixed(val, 30),
            //                 color: pallete.indeterminate,
            //                 lineVisible: true,
            //                 // axisLabelColor: 'red',
            //                 // axisLabelVisible: true,
            //                 // axisLabelTextColor: 'red',
            //                 lineWidth: 1,
            //                 title: `Liquidation`,
            //                 lineStyle: LineStyle.SparseDotted,
            //               }
            //             }, liquidationPrice)

            //           ],
            //           appendData: scan((prev: CandlestickData, next): CandlestickData => {
            //             const marketPrice = formatFixed(next.indexTokenPrice, 30)
            //             const timeNow = unixTimestampNow()

            //             const prevTimeSlot = Math.floor(prev.time as number / tf)

            //             const nextTimeSlot = Math.floor(timeNow / tf)
            //             const time = nextTimeSlot * tf as Time

            //             const isNext = nextTimeSlot > prevTimeSlot

            //             document.title = `${next.indexTokenDescription.symbol} ${readableNumber(marketPrice)}`

            //             if (isNext) {
            //               return {
            //                 open: marketPrice,
            //                 high: marketPrice,
            //                 low: marketPrice,
            //                 close: marketPrice,
            //                 time
            //               }
            //             }

            //             return {
            //               open: prev.open,
            //               high: marketPrice > prev.high ? marketPrice : prev.high,
            //               low: marketPrice < prev.low ? marketPrice : prev.low,
            //               close: marketPrice,
            //               time
            //             }
            //           }, initialTick, combineObject({ indexTokenPrice, indexTokenDescription })),
            //         }
            //       ],
            //       containerOp: style({ position: 'absolute', inset: 0, borderRadius: '20px', overflow: 'hidden' }),
            //       chartConfig: {
            //         rightPriceScale: {
            //           visible: true,
            //           autoScale: true,
            //           entireTextOnly: true,
            //           borderVisible: false,
            //           scaleMargins: {
            //             top: 0.15,
            //             bottom: 0.15
            //           }
            //         },
            //         timeScale: {
            //           timeVisible: true,
            //           secondsVisible: false,
            //           borderVisible: false,
            //           rightOffset: 13,
            //           shiftVisibleRangeOnNewBar: true,
            //         }
            //       },
            //     })({
            //       // crosshairMove: sampleChartCrosshair(),
            //       // click: sampleClick()
            //     })

            //   }, combineObject({ pricefeed, timeframe, indexToken }))
            // })({   })


          )
        ),

        $column(style({ position: 'relative' }))(

          $IntermediateConnectButton({
            $$display: combine((params, w3p) => {

              const tokenDesc = getTokenDescription(params.activeTrade.positionId.indexToken)
              const route = params.activeTrade.positionId.isLong ? `Long-${tokenDesc.symbol}` : `Short-${tokenDesc.symbol}/${getTokenDescription(params.activeTrade.positionId.collateralToken).symbol}`

              if (!params.activeTrade.trade) {
                return $column(layoutSheet.spacingSmall, style({ flex: 1, alignItems: 'center', placeContent: 'center' }))(
                  $text(style({ fontSize: '1.5em' }))('Trade History'),
                  $text(style({ color: pallete.foreground }))(
                    `No active ${route} position`
                  )
                )
              }


              const initalList = params.activeTrade ? [...params.activeTrade.trade.increaseList, ...params.activeTrade.trade.decreaseList] : []

              return $CardTable({
                // $rowContainer: screenUtils.isDesktopScreen
                //   ? $row(layoutSheet.spacing, style({ padding: `2px 26px` }))
                //   : $row(layoutSheet.spacingSmall, style({ padding: `2px 10px` })),
                // headerCellOp: style({ padding: screenUtils.isDesktopScreen ? '15px 15px' : '6px 4px' }),
                // cellOp: style({ padding: screenUtils.isDesktopScreen ? '4px 15px' : '6px 4px' }),
                dataSource: mergeArray([
                  now(initalList) as Stream<(RequestTrade | IPositionIncrease | IPositionDecrease)[]>,
                  // constant(initalList, periodic(3000)),
                  requestTradeRow
                ]),
                // $container: $defaultTableContainer(screenUtils.isDesktopScreen ? style({ flex: '1 1 0', minHeight: '100px' }) : style({})),
                scrollConfig: {
                  insertAscending: true
                },
                columns: [
                  {
                    $head: $text('Time'),
                    columnOp: O(style({ maxWidth: '100px' })),

                    $$body: map((req) => {
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
                    columnOp: O(style({ flex: 1 })),

                    $$body: map((pos) => {
                      const $requestRow = $row(style({ alignItems: 'center' }))

                      if ('key' in pos) {
                        const direction = pos.__typename === 'IncreasePosition' ? '↑' : '↓'
                        const txHash = pos.id.split(':').slice(-1)[0]
                        return $row(layoutSheet.spacingSmall)(
                          $txHashRef(txHash, w3p.chain.id, $text(`${direction} ${formatReadableUSD(pos.price)}`))
                        )
                      }

                      const activePositionAdjustment = take(1, filter(ev => {
                        const key = getPositionKey(ev.args.account, pos.state.isIncrease ? ev.args.path.slice(-1)[0] : ev.args.path[0], ev.args.indexToken, ev.args.isLong)

                        return key === pos.state.position.key
                      }, adjustPosition))

                      return $row(layoutSheet.spacingSmall)(
                        $txHashRef(
                          pos.ctx.transactionHash, w3p.chain.id,
                          $text(`${isIncrease ? '↑' : '↓'} ${formatReadableUSD(pos.acceptablePrice)} ${isIncrease ? '<' : '>'}`)
                        ),

                        switchLatest(mergeArray([
                          now($spinner),
                          map(req => {
                            const isRejected = req.eventName === 'CancelIncreasePosition' // || req.eventName === 'CancelDecreasePosition'

                            const message = $text(`${isRejected ? `✖ ${formatReadableUSD(req.args.acceptablePrice)}` : `✔ ${formatReadableUSD(req.args.acceptablePrice)}`}`)

                            return $requestRow(
                              $txHashRef(req.transactionHash!, w3p.chain.id, message),
                              $infoTooltip('transaction was sent, keeper will execute the request, the request will either be executed or rejected'),
                            )
                          }, activePositionAdjustment),
                        ]))
                      )

                    })
                  },
                  ...screenUtils.isDesktopScreen
                    ? [
                      {
                        $head: $text('PnL Realised'),
                        columnOp: O(style({ flex: .5, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),
                        $$body: map((req: RequestTrade | IPositionIncrease | IPositionDecrease) => {
                          const fee = -getMarginFees('ctx' in req ? req.state.sizeDeltaUsd : req.fee)

                          if ('ctx' in req) {
                            return $text(formatReadableUSD(fee))
                          }

                          return $text(formatReadableUSD(-req.fee))
                        })
                      }
                    ] : [],
                  {
                    $head: $text('Collateral change'),
                    columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),

                    $$body: map((req) => {
                      const isKeeperReq = 'ctx' in req
                      const delta = isKeeperReq
                        ? req.state.isIncrease
                          ? req.state.collateralDeltaUsd : -req.state.collateralDeltaUsd : req.__typename === 'IncreasePosition'
                          ? req.collateralDelta : -req.collateralDelta

                      return $text(formatReadableUSD(delta))
                    })
                  },
                  {
                    $head: $text('Size change'),
                    columnOp: O(style({ flex: .7, placeContent: 'flex-end', textAlign: 'right', alignItems: 'center' })),
                    $$body: map((req) => {
                      const isKeeperReq = 'ctx' in req
                      const delta = isKeeperReq
                        ? req.state.isIncrease
                          ? req.state.sizeDeltaUsd : -req.state.sizeDeltaUsd : req.__typename === 'IncreasePosition'
                          ? req.sizeDelta : -req.sizeDelta

                      return $text(formatReadableUSD(delta))
                    })
                  },
                ]
              })({})
            }, combineObject({ activeTrade }))
          })({}),
        )
      )

    ),

    {
      changeRoute,
    }
  ]
})





