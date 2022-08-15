import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { component, INode, $element, attr, style, $text, nodeEvent, stylePseudo, $node, styleBehavior, motion, MOTION_NO_WOBBLE } from "@aelea/dom"
import { $row, layoutSheet, $icon, $column, state, $NumberTicker, $Checkbox } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import {
  ARBITRUM_ADDRESS_LEVERAGE, AddressZero, TOKEN_DESCRIPTION_MAP, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, ARBITRUM_ADDRESS, formatFixed, readableNumber,
  MAX_LEVERAGE_NORMAL, TradeAddress, TOKEN_SYMBOL, parseFixed, formatReadableUSD, BASIS_POINTS_DIVISOR,
  getDenominator,
  DEDUCT_FOR_GAS, ITrade, IVaultPosition, IChainParamApi, isTradeSettled, calculatePositionDelta, IPositionDelta, MAX_LEVERAGE, STABLE_SWAP_FEE_BASIS_POINTS, STABLE_TAX_BASIS_POINTS, TAX_BASIS_POINTS, SWAP_FEE_BASIS_POINTS, USD_PERCISION, MARGIN_FEE_BASIS_POINTS, USDG_DECIMALS, ADDRESS_STABLE, ARBITRUM_ADDRESS_TRADE, getBasisMultiplier, getTokenAmount, getLiquidationPriceFromDelta, USD_DECIMALS
} from "@gambitdao/gmx-middleware"
import { $IntermediateTx, $tokenIconMap, $tokenLabelFromSummary } from "@gambitdao/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { merge, multicast, awaitPromises, mergeArray, now, snapshot, map, switchLatest, filter, skipRepeats, combine, empty, constant, startWith, tap } from "@most/core"
import { Stream } from "@most/types"
import { $ButterflySlider } from "../$ButterflySlider"
import { $ButtonPrimary, $ButtonSecondary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $card } from "../../elements/$common"
import { $caretDown } from "../../elements/$icons"
import { connectTrade, connectVault } from "../../logic/contract/trade"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { ERC20__factory } from "@gambitdao/gbc-contracts"
import { adjustForDecimals, CHAIN_NATIVE_TO_ADDRESS, getFeeBasisPoints, getTokenDescription, resolveLongPath } from "./utils"
import { IEthereumProvider } from "eip1193-provider"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { WALLET } from "../../logic/provider"
import { $TradePnlHistory } from "./$TradeCardPreview"
import { $label } from "../../common/$TextField"



interface ITradeBox {
  chain: IChainParamApi['chain'],

  state: {
    trade: Stream<ITrade | null>

    depositToken: Stream<TradeAddress>
    depositTokenPrice: Stream<bigint>,
    collateralTokenPrice: Stream<bigint>
    indexTokenPrice: Stream<bigint>
    focusFactor: Stream<number>

    collateralToken: Stream<ARBITRUM_ADDRESS_TRADE>
    indexToken: Stream<ARBITRUM_ADDRESS_LEVERAGE>

    vaultPosition: Stream<IVaultPosition | null>,

    leverage: Stream<number>
    editMode: Stream<boolean>
    collateral: Stream<bigint>
    size: Stream<bigint>
    // isLong: Stream<boolean>
    // directionDiv: Stream<number>
  }

  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">
}


const REDUCED_FOR_TX_FEES = DEDUCT_FOR_GAS * 2n


export const $TradeBox = ({ state, walletLink, walletStore, chain }: ITradeBox) => component((
  [inputCollateralDelta, inputCollateralDeltaTether]: Behavior<INode, bigint>,
  [inputSizeDelta, inputSizeDeltaTether]: Behavior<INode, bigint>,
  // [isReduceOnly, isReduceOnlyTether]: Behavior<boolean, boolean>,

  [changeDepositToken, changeDepositTokenTether]: Behavior<TradeAddress, TradeAddress>,

  [changeCollateralToken, changeCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_TRADE, ARBITRUM_ADDRESS_TRADE>,
  [changeIndexToken, changeIndexTokenTether]: Behavior<TradeAddress, TradeAddress>,

  [clickMaxDeposit, clickMaxDepositTether]: Behavior<PointerEvent, PointerEvent>,
  [clickMaxWithdraw, clickMaxWithdrawTether]: Behavior<PointerEvent, PointerEvent>,

  [clickPrimary, clickPrimaryTether]: Behavior<any, any>,
  // [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  // [switchIsLong, switchIsLongTether]: Behavior<INode, boolean>,
  [editMode, editModeTether]: Behavior<boolean, boolean>,
  [focusCollateral, focusCollateralTether]: Behavior<INode, FocusEvent>,
  [focusSize, focusSizeTether]: Behavior<INode, FocusEvent>,
  // [changeOrderDirection, changeOrderDirectionTether]: Behavior<OrderType, OrderType>,

  [slideCollateralRatio, slideCollateralRatioTether]: Behavior<number, number>,
  [slideLeverage, slideLeverageTether]: Behavior<number, number>,

  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
) => {


  const trade = connectTrade(walletLink)
  const vault = connectVault(walletLink)

  const $field = $element('input')(attr({ value: '0.0', type: 'number' }), style({ minWidth: '0', transition: 'background 500ms ease-in', flex: 1, padding: '0 16px 0 0', fontSize: '1.65em', background: 'transparent', border: 'none', height: '35px', outline: 'none', color: pallete.message }))

  const $hintInput = (label: Stream<string>, val: Stream<string>, change: Stream<string>) => $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
    $text(style({}))(val),
    $icon({
      svgOps: style({ transform: 'rotate(-90deg)' }),
      width: '16px',
      $content: $caretDown,
      viewBox: '0 0 32 32',
      fill: pallete.foreground,
    }),
    $text(style({}))(change),
    $text(style({ color: pallete.foreground }))(label),
  )

  const changeSizeRatioState = mergeArray([
    slideCollateralRatio,
    now(0),
    constant(-1, clickMaxWithdraw),
    constant(1, clickMaxDeposit),
  ])

  const executionFee = multicast(trade.executionFee)

  const collateralTokenWeight = switchLatest(map(address => {
    if (address === AddressZero) {
      return vault.getTokenWeight(CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN])
    }

    return vault.getTokenWeight(address)
  }, state.depositToken))

  const collateralTokenDebtUsd = switchLatest(map(address => {
    if (address === AddressZero) {
      return vault.getTokenDebtUsd(CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN])
    }

    return vault.getTokenDebtUsd(address)
  }, state.depositToken))

  const indexTokenWeight = switchLatest(map(address => vault.getTokenWeight(address), state.indexToken))
  const indexTokenDebtUsd = switchLatest(map(address => vault.getTokenDebtUsd(address), state.indexToken))

  const walletBalance = multicast(awaitPromises(combineArray(async (inp, w3p, account) => {
    if (w3p === null || account === null) {
      throw new Error('no wallet provided')
    }
    if (inp === AddressZero) {
      return (await w3p.getSigner().getBalance()).toBigInt()
    }

    const ercp = ERC20__factory.connect(inp, w3p.getSigner())

    return (await ercp.balanceOf(account)).toBigInt()
  }, state.depositToken, walletLink.provider, walletLink.account)))

  const depositTokenDescription = map(address => getTokenDescription(USE_CHAIN, address), state.depositToken)
  const indexTokenDescription = map(address => getTokenDescription(USE_CHAIN, address), state.indexToken)
  const stateParams = replayLatest(multicast(combineObject(state)))




  const sliderLeverageMultiplierFactor = multicast(snapshot(
    (focusFactor, leverage) => ({ focusFactor, leverage }),
    state.focusFactor, state.leverage)
  )

  const changeCollateralLeverage = mergeArray([now(0), filter(({ focusFactor }) => focusFactor === 0, sliderLeverageMultiplierFactor)])
  const changeSizeLeverage = mergeArray([now(0), filter(({ focusFactor }) => focusFactor === 1, sliderLeverageMultiplierFactor)])



  const tradeParams = replayLatest(multicast(combine((params, envParams) => ({ ...params, ...envParams }), stateParams, combineObject({
    walletBalance, depositTokenDescription, indexTokenDescription,
    collateralTokenWeight, collateralTokenDebtUsd,
    indexTokenWeight, indexTokenDebtUsd,
    totalTokenWeight: vault.totalTokenWeight, usdgSupply: vault.usdgAmount, editPositionRatio: changeSizeRatioState
  }))))

  const clickMaxBalanceValue = snapshot(({ tradeParams, walletBalance }) => {
    if (tradeParams.depositToken === AddressZero) {
      return walletBalance - REDUCED_FOR_TX_FEES
      // const total = walletBalance - REDUCED_FOR_TX_FEES
      // return total > 0n ? total : 0n
    }

    return walletBalance
  }, combineObject({ walletBalance, tradeParams }), clickMaxDeposit)

  const clickMaxEditPosition = snapshot(({ tradeParams, walletBalance }) => {
    if (!tradeParams.vaultPosition) {
      return 0n
    }

    return tradeParams.vaultPosition.size
  }, combineObject({ walletBalance, tradeParams }), clickMaxWithdraw)


  const depositCollateralToSize = snapshot(params => {
    if (params.editMode) {
      const ratio = BigInt(Math.floor(Math.abs(params.editPositionRatio) * Number(BASIS_POINTS_DIVISOR)))

      if (params.editPositionRatio > 0) {
        return params.walletBalance
      }

      if (!params.vaultPosition) {
        throw new Error('no positon to modify')
      }
      const deltaProfit = calculatePositionDelta(params.indexTokenPrice, params.vaultPosition.averagePrice, params.vaultPosition.isLong, params.vaultPosition)

      const sizeUsd = params.vaultPosition.size * ratio / BASIS_POINTS_DIVISOR
      // const sizeAmount = getTokenAmount(sizeUsd, params.indexTokenPrice, params.indexTokenDescription)
      // const deltaProfit = calculatePositionDelta(params.indexTokenPrice, params.vaultPosition.averagePrice, params.vaultPosition.isLong, params.vaultPosition)
      // const collateralUsd = params.vaultPosition.size * BASIS_POINTS_DIVISOR / ratio
      // const netAmount = getTokenAmount(collateralUsd + deltaProfit.delta, params.indexTokenPrice, params.indexTokenDescription)

      return sizeUsd
    }

    const leverage = MAX_LEVERAGE * BigInt(Math.floor(Math.abs(params.leverage) * Number(BASIS_POINTS_DIVISOR))) / BASIS_POINTS_DIVISOR

    const inputUsd = params.collateral * params.depositTokenPrice / getDenominator(params.depositTokenDescription.decimals)
    const feeBps = getSwapFeeBps(params, params.collateral)

    const fromUsdMinAfterFee = feeBps ? inputUsd * (BASIS_POINTS_DIVISOR - feeBps) / BASIS_POINTS_DIVISOR : inputUsd

    const toNumerator = fromUsdMinAfterFee * leverage * BASIS_POINTS_DIVISOR
    const toDenominator = MARGIN_FEE_BASIS_POINTS * leverage + BASIS_POINTS_DIVISOR * BASIS_POINTS_DIVISOR

    const nextToUsd = toNumerator / toDenominator

    // const outputAmountUsd = nextToUsd * getDenominator(params.indexTokenDescription.decimals) / params.indexTokenPrice

    return nextToUsd
  }, tradeParams, mergeArray([clickMaxBalanceValue, changeCollateralLeverage, changeSizeRatioState]))


  const depositSizeToCollateral = snapshot(params => {
    if (params.editMode) {
      const ratio = BigInt(Math.floor(Math.abs(params.editPositionRatio) * Number(BASIS_POINTS_DIVISOR)))

      if (params.editPositionRatio > 0) {
        return params.walletBalance
      }

      if (!params.vaultPosition) {
        throw new Error('no positon to modify')
      }
      const deltaProfit = calculatePositionDelta(params.indexTokenPrice, params.vaultPosition.averagePrice, params.vaultPosition.isLong, params.vaultPosition)

      const sizeUsd = (params.vaultPosition.collateral + deltaProfit.delta) * ratio / BASIS_POINTS_DIVISOR
      const sizeAmount = getTokenAmount(sizeUsd, params.indexTokenPrice, params.indexTokenDescription)
      // const deltaProfit = calculatePositionDelta(params.indexTokenPrice, params.vaultPosition.averagePrice, params.vaultPosition.isLong, params.vaultPosition)
      // const collateralUsd = params.vaultPosition.size * BASIS_POINTS_DIVISOR / ratio
      // const netAmount = getTokenAmount(collateralUsd + deltaProfit.delta, params.indexTokenPrice, params.indexTokenDescription)

      return sizeAmount
    }

    const leverage = MAX_LEVERAGE * BigInt(Math.floor(Math.abs(params.leverage) * Number(BASIS_POINTS_DIVISOR))) / BASIS_POINTS_DIVISOR

    const sizeAmount = params.size * getDenominator(params.indexTokenDescription.decimals) / params.indexTokenPrice
    const sizeUsd = sizeAmount * params.indexTokenPrice / getDenominator(params.indexTokenDescription.decimals)
    const collateral = (sizeUsd * BASIS_POINTS_DIVISOR) / leverage
    const feeBps = getSwapFeeBps(params, collateral)

    const baseFromAmountUsd = sizeUsd * BASIS_POINTS_DIVISOR / leverage
    const fees = params.size * MARGIN_FEE_BASIS_POINTS / BASIS_POINTS_DIVISOR + (feeBps ? baseFromAmountUsd * feeBps / BASIS_POINTS_DIVISOR : 0n)
    const nextFromUsd = baseFromAmountUsd + fees
    const nextFromAmount = nextFromUsd * getDenominator(params.depositTokenDescription.decimals) / params.depositTokenPrice

    return nextFromAmount
  }, tradeParams, mergeArray([clickMaxEditPosition, changeSizeLeverage]))



  const requestTrade = snapshot(({ tradeParams, vault, executionFee }) => {
    const path = resolveLongPath(tradeParams.depositToken, tradeParams.indexToken)

    const isLong = tradeParams.leverage > 0
    return tradeParams.depositToken === AddressZero
      ? vault.createIncreasePositionETH(
        path,
        tradeParams.indexToken,
        0,
        tradeParams.collateral,
        isLong,
        tradeParams.depositTokenPrice,
        executionFee,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        { value: tradeParams.collateral + executionFee }
      )
      : vault.createIncreasePosition(
        path,
        tradeParams.indexToken,
        tradeParams.depositToken,
        0,
        tradeParams.collateral,
        isLong,
        tradeParams.depositTokenPrice,
        executionFee,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        { value: executionFee }
      )
  }, combineObject({ tradeParams: tradeParams, vault: trade.contract, executionFee }), clickPrimary)



  const getSwapFeeBps = (params: typeof tradeParams extends Stream<infer Z> ? Z : never, collateralAmount: bigint) => {
    const swapFeeBasisPoints = params.depositTokenDescription.isStable && params.indexTokenDescription.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = params.depositTokenDescription.isStable && params.indexTokenDescription.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS

    const collateralUsd = adjustForDecimals(
      collateralAmount * params.collateralTokenPrice / USD_PERCISION,
      params.depositTokenDescription.decimals,
      USDG_DECIMALS
    )

    const depositToken = params.depositToken === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : params.collateralToken

    if (params.leverage > 0 && depositToken === params.indexToken) {
      return 0n
    }

    const feeBps0 = getFeeBasisPoints(
      params.collateralTokenDebtUsd,
      params.collateralTokenWeight,
      collateralUsd,
      swapFeeBasisPoints,
      taxBasisPoints,
      true,
      params.usdgSupply,
      params.totalTokenWeight
    )
    const feeBps1 = getFeeBasisPoints(
      params.indexTokenDebtUsd,
      params.indexTokenWeight,
      collateralUsd,
      swapFeeBasisPoints,
      taxBasisPoints,
      false,
      params.usdgSupply,
      params.totalTokenWeight
    )

    return feeBps0 > feeBps1 ? feeBps0 : feeBps1
  }

  return [
    $column(layoutSheet.spacing)(
      $card(style({ gap: '20px', padding: '15px' }))(

        $column(layoutSheet.spacing)(
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $hintInput(
              map(isIncrease => isIncrease ? `Collateral` : 'Collateral', editMode), // combineArray((existingPosition) => (existingPosition ? `Collateral` : `Collateral`), config.currentPosition),
              map(position => (position ? formatReadableUSD(position.collateral) : '$0'), state.vaultPosition),

              snapshot((params, amount) => {
                const collateralUsd = amount * params.collateralTokenPrice / getDenominator(params.depositTokenDescription.decimals)
                const newLocal = formatReadableUSD(params.vaultPosition ? params.vaultPosition.collateral + collateralUsd : collateralUsd)

                return newLocal
              }, tradeParams, state.collateral)
              // combineArray((amount) => formatReadableUSD(amount), collateralDeltaHint),
            ),

            $node(style({ flex: 1 }))(),

            // styleBehavior(map(pos => !pos ? { opacity: '.5', pointerEvents: 'none' } : {}, state.vaultPosition))(
            //   $label(layoutSheet.spacingSmall, style({ alignItems: 'center', flexDirection: 'row', fontSize: '0.75em' }))(

            //     $Checkbox({
            //       value: state.editMode
            //     })({
            //       check: editModeTether()
            //     }),
            //     $text('Edit'),
            //   )
            // ),

            $node(),

            O(stylePseudo(':hover', { color: pallete.primary }))(
              $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
                $text(style({ color: pallete.foreground }))(`Balance`),
                $text(combineArray((tokenDesc, balance) => readableNumber(formatFixed(balance, tokenDesc.decimals)).toString(), depositTokenDescription, walletBalance)),
              ),
              // $hintInput(
              //   now('Balance'),
              //   map(b => readableNumber(formatFixed(b)).toString(), walletBalance),
              //   combineArray((trade, walletBalance) => readableNumber(formatFixed(walletBalance - trade.inputAmount, trade.inputTokenDescription.decimals)), tradeBalance, walletBalance),
              // )
            ),
          ),

          $row(layoutSheet.spacingTiny, style({ position: 'relative', alignItems: 'center' }))(

            $field(
              styleBehavior(map(isIncrease => isIncrease === 0 ? {} : { color: pallete.foreground, backgroundColor: 'transparent' }, state.focusFactor)),
              focusCollateralTether(nodeEvent('focus'))
            )(
              O(
                map(node =>
                  merge(
                    now(node),
                    filter(() => false, snapshot(({ tradeParams, collateralTokenDescription }, val) => {
                      // const tokenDecimals = tradeParams.editMode && pos
                      //   ? pos.collateral
                      //   : tradeParams.leverage > 0 ? tradeParams.sizeToken : collateralTokenDesc.decimals
                      // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                      node.element.value = formatFixed(val, collateralTokenDescription.decimals).toString()
                    }, combineObject({ tradeParams, collateralTokenDescription: depositTokenDescription }), mergeArray([clickMaxBalanceValue, depositSizeToCollateral])))
                  )
                ),
                switchLatest
              ),

              inputCollateralDeltaTether(nodeEvent('input'), combine((tokenDescription, inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  throw new Error('Target is not type of input')
                }

                return BigInt(parseFixed(target.value.replace(/(\+|-)/, ''), tokenDescription.decimals))
              }, depositTokenDescription)),
            )(),

            switchLatest(map(isReduce => {
              if (isReduce) {
                return empty()
              }

              return $ButtonSecondary({
                $content: $text('Max'),
                disabled: combineArray((params, depositDesc, depostToken) => {

                  if (depostToken === AddressZero) {
                    const totalBalance = params.walletBalance - REDUCED_FOR_TX_FEES
                    return totalBalance === params.collateral
                  }

                  if (params.walletBalance >= 0n) {
                    return false
                  }

                  // if (depositDesc === CHAIN_NATIVE_TO_ADDRESS)
                  return true
                }, tradeParams, depositTokenDescription, state.depositToken),
                buttonOp: style({
                  alignSelf: 'center',
                  padding: '3px 6px',
                  fontSize: '.65em'
                }),
              })({
                click: clickMaxDepositTether()
              })
            }, state.editMode)),

            switchLatest(map(params => {

              if (params.editMode) {
                const token = CHAIN_TOKEN_ADDRESS_TO_SYMBOL[params.indexToken]
                // const tokenDesc = TOKEN_DESCRIPTION_MAP[]
                return $icon({ $content: $tokenIconMap[token], svgOps: style({}), fill: pallete.indeterminate, width: '34px', viewBox: '0 0 32 32' })
              }

              return $Dropdown<TradeAddress>({
                $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                  switchLatest(map(option => {
                    const symbol = option === CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN]
                      ? TOKEN_SYMBOL.WETH
                      : CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : option]

                    return $icon({ $content: $tokenIconMap[symbol], width: '34px', viewBox: '0 0 32 32' })
                  }, state.depositToken)),
                  $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
                ),
                value: {
                  value: state.depositToken,
                  $container: $defaultSelectContainer(style({ minWidth: '300px', right: 0 })),
                  $$option: map(option => {
                    const symbol = option === CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN]
                      ? TOKEN_SYMBOL.WETH
                      : CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : option]
                    const tokenDesc = TOKEN_DESCRIPTION_MAP[symbol]

                    return $tokenLabelFromSummary(tokenDesc)
                  }),
                  list: [
                    AddressZero,
                    ARBITRUM_ADDRESS.NATIVE_TOKEN,
                    ARBITRUM_ADDRESS.LINK,
                    ARBITRUM_ADDRESS.UNI,
                    ARBITRUM_ADDRESS.WBTC,
                    ARBITRUM_ADDRESS.USDC,
                    ARBITRUM_ADDRESS.USDT,
                    ARBITRUM_ADDRESS.DAI,
                    ARBITRUM_ADDRESS.FRAX,
                    ARBITRUM_ADDRESS.MIM,
                  ],
                }
              })({
                select: changeDepositTokenTether()
              })
            }, stateParams)),
          ),
        ),


        style({ margin: '0 -15px' })(
          $ButterflySlider({
            positiveColor: pallete.middleground,
            negativeColor: pallete.indeterminate,
            value: changeSizeRatioState,
            thumbSize: 60,
            thumbText: map(n => readableNumber(n * 100, 1) + '%')
          })({
            change: slideCollateralRatioTether()
          })
        ),

        $column(layoutSheet.spacing)(

          $row(style({ placeContent: 'space-between', padding: '0' }))(
            $hintInput(
              combineArray((existingPosition) => (existingPosition ? `Size` : 'Size'), state.vaultPosition),
              map(pos => (pos ? formatReadableUSD(pos.size) : '$0'), state.vaultPosition),

              snapshot((params, amountUsd) => {
                const collateralUsd = params.vaultPosition
                  ? params.vaultPosition.size + amountUsd
                  : amountUsd

                return formatReadableUSD(collateralUsd)
              }, tradeParams, state.size)
            ),

            $node(style({ flex: 1 }))(),


            switchLatest(map(lev => {

              if (lev > 0) {
                return switchLatest(map(option => {
                  const tokenDesc = TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                  return $row(layoutSheet.spacingTiny, style({ fontSize: '.65em', alignItems: 'center' }))(
                    $text(style({ color: pallete.foreground, marginRight: '3px' }))('Profits In'),
                    $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                    $text(tokenDesc.symbol)
                  )
                }, state.indexToken))
              }

              // combineArray((indexToken, isLong) => isLong ? indexToken : ARBITRUM_ADDRESS.NATIVE_TOKEN, state.indexToken, skipRepeats(map(l => l > 0, state.leverage)))


              return $Dropdown<ARBITRUM_ADDRESS_TRADE>({
                $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                  switchLatest(map(option => {
                    const tokenDesc = TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                    return $row(layoutSheet.spacingTiny, style({ fontSize: '.65em', alignItems: 'center' }))(
                      $text(style({ color: pallete.foreground, marginRight: '3px' }))('Profits In'),
                      $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                      $text(tokenDesc.symbol)
                    )
                  }, state.collateralToken)),
                  $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
                ),
                value: {
                  value: state.collateralToken,
                  $container: $defaultSelectContainer(style({ minWidth: '300px', right: 0 })),
                  $$option: map(option => {
                    const tokenDesc = TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                    return $tokenLabelFromSummary(tokenDesc)
                  }),
                  list: [
                    ARBITRUM_ADDRESS.USDC,
                    ARBITRUM_ADDRESS.USDT,
                    ARBITRUM_ADDRESS.DAI,
                    ARBITRUM_ADDRESS.FRAX,
                  ],
                }
              })({
                select: changeCollateralTokenTether()
              })
            }, state.leverage)),

          ),
          $row(layoutSheet.spacingTiny, style({ position: 'relative', alignItems: 'center' }))(

            $field(
              styleBehavior(map(isIncrease => isIncrease === 1 ? {} : { color: pallete.foreground, backgroundColor: 'transparent' }, state.focusFactor)),
              focusSizeTether(nodeEvent('focus'))
            )(
              O(
                map(node =>
                  merge(
                    now(node),
                    filter(() => false, snapshot((tokenDsc, val) => {
                      // const valF = formatFixed(val.outputAmountUsd, val.outputTokenDescription.decimals)
                      const valF = formatFixed(val, USD_DECIMALS)
                      // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                      node.element.value = valF.toString()

                    }, indexTokenDescription, mergeArray([clickMaxEditPosition, depositCollateralToSize])))
                  )
                ),
                switchLatest
              ),
              inputSizeDeltaTether(nodeEvent('input'), snapshot((tokenDesc, inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  throw new Error('Target is not type of input')
                }

                return BigInt(parseFixed(target.value.replace(/(\+|-)/, ''), USD_DECIMALS))
              }, indexTokenDescription))
            )(),

            switchLatest(map(isReduce => {

              if (!isReduce) {
                return empty()
              }

              return $ButtonSecondary({
                $content: $text('Min'),
                disabled: map(params => {

                  if (params.vaultPosition && params.vaultPosition.size !== params.size) {
                    return false
                  }

                  return true
                }, tradeParams),
                buttonOp: style({
                  alignSelf: 'center',
                  padding: '3px 6px',
                  fontSize: '.65em'
                }),
              })({
                click: clickMaxWithdrawTether()
              })
            }, state.editMode)),

            $Dropdown<TradeAddress>({
              $container: $row(style({ position: 'relative', alignSelf: 'center' })),
              $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                switchLatest(map(option => {
                  const tokenDesc = TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                  return $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', viewBox: '0 0 32 32' })
                }, state.indexToken)),
                $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
              ),
              value: {
                value: state.indexToken,
                $container: $defaultSelectContainer(style({ minWidth: '300px', right: 0 })),
                $$option: map(option => {
                  const tokenDesc = option === AddressZero ? TOKEN_DESCRIPTION_MAP.ETH : TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                  return $tokenLabelFromSummary(tokenDesc)
                }),
                list: [
                  ARBITRUM_ADDRESS.NATIVE_TOKEN,
                  ARBITRUM_ADDRESS.LINK,
                  ARBITRUM_ADDRESS.UNI,
                  ARBITRUM_ADDRESS.WBTC,
                ],
              }
            })({
              select: changeIndexTokenTether()
            }),

          ),
        ),

        style({ margin: '0 -15px' })($ButterflySlider({
          value: state.leverage,
          thumbSize: 60,
          thumbText: map(n => readableNumber(Math.abs(n * MAX_LEVERAGE_NORMAL), 1) + 'x')
        })({
          change: slideLeverageTether()
        })),

        switchLatest(map(trade => {
          const $container = $column(style({ position: 'relative', margin: '-15px -15px -85px -15px', zIndex: 0, height: '170px' }))

          if (trade === null) {
            return $container()
          }

          const hoverChartPnl: Stream<IPositionDelta> = multicast(switchLatest(combineArray((trade) => {

            if (isTradeSettled(trade)) {
              return now({ delta: trade.realisedPnl - trade.fee, deltaPercentage: trade.realisedPnlPercentage })
            }

            return map(price => calculatePositionDelta(price, trade.averagePrice, trade.isLong, trade), state.indexTokenPrice)

          }, now(trade))))
          const chartRealisedPnl = map(ss => formatFixed(ss.delta, 30), hoverChartPnl)

          return $column(
            $container(
              style({
                textAlign: 'center',
                fontSize: '1.75em', alignItems: 'baseline', paddingTop: '15px', paddingBottom: '15px', background: 'radial-gradient(rgba(0, 0, 0, 0.37) 9%, transparent 63%)',
                lineHeight: 1,
                fontWeight: "bold",
                zIndex: 10,
                position: 'relative'
              })(
                $NumberTicker({
                  value$: map(Math.round, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, chartRealisedPnl)),
                  incrementColor: pallete.positive,
                  decrementColor: pallete.negative
                })
              ),
              $TradePnlHistory({
                trade, latestPrice: state.indexTokenPrice, chain
              })({
                // crosshairMove: crosshairMoveTether()
              })
            )
          )


        }, state.trade)),

        $row(style({ placeContent: 'center' }))(
          $IntermediateConnectButton({
            walletStore: walletStore,
            $container: $column(layoutSheet.spacingBig, style({ zIndex: 10 })),
            $display: map(() => {

              return $ButtonPrimary({
                disabled: combineArray((pos, params) => {

                  if (!params.editMode && params.collateral > 0n && params.collateral <= params.walletBalance) {
                    return false
                  }

                  if (pos && params.editMode && params.size < 0) {
                    return false
                  }


                  return true
                }, state.vaultPosition, tradeParams),
                $content: $text(map(params => {
                  const outputToken = getTokenDescription(USE_CHAIN, params.indexToken)
                  const modLabel = params.vaultPosition
                    ? params.editMode ? 'Decrease' : 'Increase'
                    : 'Open'
                  return `${modLabel} ${params.leverage > 0 ? 'Long' : 'Short'} ${outputToken.symbol}`
                }, stateParams)),
              })({
                click: clickPrimaryTether()
              })
            }),
            ensureNetwork: true,
            walletLink: walletLink
          })({ walletChange: walletChangeTether() })
        ),

      ),

      $IntermediateTx({
        query: requestTrade,
        clean: tradeParams,
        chain: USE_CHAIN
      })({})

    ),

    {
      changeDepositToken,
      changeIndexToken,
      requestTrade,
      changeLeverage: slideLeverage,
      walletChange,
      editMode,
      changeCollateralToken: changeCollateralToken,
      changeCollateral: mergeArray([
        now(0n),
        depositSizeToCollateral,
        clickMaxBalanceValue,
        inputCollateralDelta,
      ]),
      changeSize: mergeArray([
        now(0n),
        depositCollateralToSize,
        clickMaxEditPosition,
        inputSizeDelta,
      ]),
      focusFactor: skipRepeats(mergeArray([
        constant(0, clickMaxBalanceValue),
        constant(1, clickMaxEditPosition),
        constant(0, focusCollateral),
        constant(1, focusSize)
      ])),
    }
  ]
})

