import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { component, INode, $element, attr, style, $text, nodeEvent, stylePseudo, $node, styleBehavior, motion, MOTION_NO_WOBBLE } from "@aelea/dom"
import { $row, layoutSheet, $icon, $column, state, $NumberTicker, $Checkbox } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import {
  ARBITRUM_ADDRESS_LEVERAGE, AddressZero, TOKEN_DESCRIPTION_MAP, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, ARBITRUM_ADDRESS, formatFixed, readableNumber,
  MAX_LEVERAGE_NORMAL, TradeAddress, TOKEN_SYMBOL, parseFixed, formatReadableUSD, BASIS_POINTS_DIVISOR,
  getDenominator,
  DEDUCT_FOR_GAS, ITrade, IVaultPosition, IChainParamApi, USD_DECIMALS, isTradeSettled, calculatePositionDelta, IPositionDelta, getTokenAmount, getRatio, getMultiplier
} from "@gambitdao/gmx-middleware"
import { $IntermediateTx, $tokenIconMap, $tokenLabelFromSummary } from "@gambitdao/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { merge, multicast, awaitPromises, mergeArray, now, snapshot, map, switchLatest, filter, skipRepeats, combine, empty, startWith, delay } from "@most/core"
import { Stream } from "@most/types"
import { $ButterflySlider, $defaultThumb } from "../$ButterflySlider"
import { $ButtonPrimary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $card } from "../../elements/$common"
import { $caretDown } from "../../elements/$icons"
import { connectTrade, connectVault } from "../../logic/contract/trade"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { ERC20__factory } from "@gambitdao/gbc-contracts"
import { CHAIN_NATIVE_TO_ADDRESS, getTokenDescription, resolveAddress, resolveLongPath } from "./utils"
import { IEthereumProvider } from "eip1193-provider"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { WALLET } from "../../logic/provider"
import { $TradePnlHistory } from "./$TradeCardPreview"
import { MouseEventParams } from "lightweight-charts"
import { $label } from "../../common/$TextField"



interface ITradeBox {
  chain: IChainParamApi['chain'],

  state: {
    trade: Stream<ITrade | null>

    collateralToken: Stream<TradeAddress>
    collateralTokenPrice: Stream<bigint>
    focusInput: Stream<number>

    sizeToken: Stream<ARBITRUM_ADDRESS_LEVERAGE>

    vaultPosition: Stream<IVaultPosition | null>,

    leverage: Stream<number>
    directionDiv: Stream<number>
  }

  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">
}




export const $TradeBox = ({ state, walletLink, walletStore, chain }: ITradeBox) => component((
  [inputCollateralDelta, inputCollateralDeltaTether]: Behavior<INode, bigint>,
  [inputSizeDelta, inputSizeDeltaTether]: Behavior<INode, bigint>,
  [isReduceOnly, isReduceOnlyTether]: Behavior<boolean, boolean>,

  [changeInputAddress, changeInputAddressTether]: Behavior<TradeAddress, TradeAddress>,
  [changeOutputAddress, changeOutputAddressTether]: Behavior<TradeAddress, TradeAddress>,
  [clickMaxBalance, clickMaxBalanceTether]: Behavior<PointerEvent, PointerEvent>,
  [clickPrimary, clickPrimaryTether]: Behavior<any, any>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,

  // [changeOrderMode, changeOrderModeTether]: Behavior<boolean, boolean>,

  [changeLeverage, changeLeverageTether]: Behavior<number, number>,
  [directionDiv, directionDivTether]: Behavior<number, number>,
  // [changeOrderDirection, changeOrderDirectionTether]: Behavior<OrderType, OrderType>,


  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,

) => {


  const trade = connectTrade(walletLink)
  const vault = connectVault(walletLink)

  const $field = $element('input')(attr({ placeholder: '0.0' }), style({ transition: 'background 500ms ease-in', flex: 1, padding: '0 16px 0 0', fontSize: '1.5em', background: 'transparent', border: 'none', height: '35px', outline: 'none', color: pallete.message }))

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


  const executionFee = multicast(trade.executionFee)


  const inputTradeAddressMinPriceUsd = awaitPromises(combineArray(async (contract, address) => {
    const matchAddress = resolveAddress(USE_CHAIN, address)
    return (await contract.getMinPrice(matchAddress)).toBigInt()
  }, vault.contract, state.collateralToken))

  const outputTradeAddressMaxPriceUsd = awaitPromises(combineArray(async (contract, address) => {
    const matchAddress = resolveAddress(USE_CHAIN, address)
    return (await contract.getMaxPrice(matchAddress)).toBigInt()
  }, vault.contract, state.sizeToken))


  const walletBalance = awaitPromises(combineArray(async (inp, w3p, account) => {
    if (w3p === null || account === null) {
      throw new Error('no wallet provided')
    }
    if (inp === AddressZero) {
      return (await w3p.getSigner().getBalance()).toBigInt()
    }

    const ercp = ERC20__factory.connect(inp, w3p.getSigner())

    return (await ercp.balanceOf(account)).toBigInt()
  }, state.collateralToken, walletLink.provider, walletLink.account))

  const inputTokenDescription = map(address => getTokenDescription(USE_CHAIN, address), state.collateralToken)

  const REDUCED_FOR_TX_FEES = DEDUCT_FOR_GAS * 2n
  // const clickMaxBalanceValue = snapshot(balance => balance - REDUCED_FOR_TX_FEES, walletBalance, clickMaxBalance)

  const sizeRatioMultiplier = map(ratio => BigInt(Math.floor(ratio * Number(BASIS_POINTS_DIVISOR))), state.directionDiv)

  const tradeParams = replayLatest(multicast(combineObject(state)))


  const reduceSizeSliderRatio = filter(ratio => ratio < 0n, sizeRatioMultiplier)
  const increaseCollateralSliderRatio = filter(ratio => ratio > 0n, sizeRatioMultiplier)

  const increaseCollateralDeltaSlider = snapshot((token, { increaseCollateralSliderRatio, walletBalance }) => {
    if (token === AddressZero && increaseCollateralSliderRatio === BASIS_POINTS_DIVISOR) {
      return walletBalance - REDUCED_FOR_TX_FEES
    }

    return walletBalance * increaseCollateralSliderRatio / BASIS_POINTS_DIVISOR

  }, state.collateralToken, combineObject({ walletBalance, increaseCollateralSliderRatio }))

  const increaseCollateralDelta = mergeArray([
    increaseCollateralDeltaSlider,
    inputCollateralDelta
  ])

  const increaseCollateralDeltaUsd = combineArray(
    (amount, tokenDesc, price) => amount * price / getDenominator(tokenDesc.decimals),
    increaseCollateralDelta, inputTokenDescription, inputTradeAddressMinPriceUsd
  )

  const reduceSizeDeltaSlider = snapshot((currentPosition, ratio) => {
    if (currentPosition === null) {
      return 0n
      // throw new Error('Unable to reduce non existing positon')
    }

    return currentPosition.size * ratio / BASIS_POINTS_DIVISOR
  }, state.vaultPosition, reduceSizeSliderRatio)



  const reduceSizeDelta = mergeArray([
    reduceSizeDeltaSlider,
    inputSizeDelta
  ])

  const inputTokenAmount = skipRepeats(mergeArray([inputCollateralDelta, increaseCollateralDelta]))
  const inputTokenWeight = switchLatest(map(address => {

    if (address === AddressZero) {
      return vault.getTokenWeight(CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN])
    }

    return vault.getTokenWeight(address)
  }, state.collateralToken))

  const inputTokenDebtUsd = switchLatest(map(address => {

    if (address === AddressZero) {
      return vault.getTokenDebtUsd(CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN])
    }

    return vault.getTokenDebtUsd(address)
  }, state.collateralToken))


  const outputTokenWeight = switchLatest(map(address => vault.getTokenWeight(address), state.sizeToken))
  const outputTokenDebtUsd = switchLatest(map(address => vault.getTokenDebtUsd(address), state.sizeToken))

  const outputTokenDescription = map(address => getTokenDescription(USE_CHAIN, address), state.sizeToken)


  // view change
  const increaseCollateralToSize = combineArray((collateral, leverage, tokenDescription, price) => {

    const leverageMultiplier = BigInt(Math.floor(Number(BASIS_POINTS_DIVISOR) * Math.abs(leverage) * MAX_LEVERAGE_NORMAL))

    const size = collateral * leverageMultiplier
    const sizeUsd = size * price / getDenominator(tokenDescription.decimals) / BASIS_POINTS_DIVISOR

    return sizeUsd

  }, increaseCollateralDelta, state.leverage, inputTokenDescription, inputTradeAddressMinPriceUsd)

  const reduceSizeToCollateralUsd = snapshot((params, ratio) => {
    const position = params.vaultPosition

    if (position === null) {
      return 0n
      // throw new Error('Unable to reduce non existing positon')
    }

    const delta = calculatePositionDelta(params.collateralTokenPrice, position.averagePrice, position.isLong, position)
    const amountUsd = position.collateral + delta.delta

    return amountUsd * ratio / BASIS_POINTS_DIVISOR
  }, tradeParams, reduceSizeSliderRatio)

  const reduceCollateralDeltaSlider = combineArray((ratio, currentPosition) => {
    if (currentPosition === null) {
      return 0n
      // throw new Error('Unable to reduce non existing positon')
    }

    return currentPosition.collateral * ratio / BASIS_POINTS_DIVISOR
  }, reduceSizeSliderRatio, state.vaultPosition)

  // const directionChange = skipRepeats(map(ratio => ratio > 0, leverageRatioState))




  // const tradeBalance = replayLatest(multicast(combineArray(
  //   (
  //     totalTokenWeight, usdgSupply,

  //     inputTradeAddressState, inputTokenDescription, inputTradeAddressMinPriceUsd, inputAmount, inputWeight, inputDebtUsd,
  //     outputTradeAddressState, outputTokenDescription, outputTradeAddressMaxPriceUsd, outputWeight, outputDebtUsd,

  //     currentPosition,

  //     leverage, sizeRatio
  //   ) => {

  //     const isIncrease = sizeRatio > 0

  //     const leverageMultiplier = BigInt(Math.floor(Number(BASIS_POINTS_DIVISOR) * Math.abs(leverage) * MAX_LEVERAGE_NORMAL))

  //     const size = inputAmount * leverageMultiplier

  //     const inputUsd = inputAmount * inputTradeAddressMinPriceUsd / getDenominator(inputTokenDescription.decimals)
  //     const sizeUsd = size * inputTradeAddressMinPriceUsd / 10n ** BigInt(inputTokenDescription.decimals) / BASIS_POINTS_DIVISOR

  //     const swapFeeBasisPoints = inputTokenDescription.isStable && outputTokenDescription.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
  //     const taxBasisPoints = inputTokenDescription.isStable && outputTokenDescription.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS

  //     const usdgAmount = adjustForDecimals(
  //       inputAmount * inputTradeAddressMinPriceUsd / USD_PERCISION,
  //       inputTokenDescription.decimals,
  //       18
  //     )

  //     const inputFeeBps = getFeeBasisPoints(
  //       inputDebtUsd,
  //       inputWeight,
  //       usdgAmount,
  //       swapFeeBasisPoints,
  //       taxBasisPoints,
  //       true,
  //       usdgSupply,
  //       totalTokenWeight
  //     )

  //     const outputFeeBps = getFeeBasisPoints(
  //       outputDebtUsd,
  //       outputWeight,
  //       usdgAmount,
  //       swapFeeBasisPoints,
  //       taxBasisPoints,
  //       false,
  //       usdgSupply,
  //       totalTokenWeight
  //     )
  //     const feeBasisPoints = inputFeeBps > outputFeeBps ? inputFeeBps : outputFeeBps

  //     const fromUsdMinAfterFee = feeBasisPoints ? inputUsd * (BASIS_POINTS_DIVISOR - feeBasisPoints) / BASIS_POINTS_DIVISOR : inputUsd

  //     const toNumerator = fromUsdMinAfterFee * leverageMultiplier * BASIS_POINTS_DIVISOR
  //     const toDenominator = MARGIN_FEE_BASIS_POINTS * leverageMultiplier + BASIS_POINTS_DIVISOR * BASIS_POINTS_DIVISOR

  //     const nextToUsd = toNumerator / toDenominator

  //     const outputAmountUsd = nextToUsd * getDenominator(outputTokenDescription.decimals) / outputTradeAddressMaxPriceUsd

  //     const path = resolveLongPath(inputTradeAddressState, outputTradeAddressState)
  //     const isLong = leverage > 0


  //     return { size, sizeRatio, leverage, currentPosition, sizeUsd, inputTradeAddressState, outputTradeAddressState, path, isLong, inputUsd, inputAmount, outputAmountUsd, inputTokenDescription, outputTokenDescription, fromUsdMinAfterFee }
  //   },
  //   vault.totalTokenWeight, vault.usdgAmount,

  //   state.collateralToken, inputTokenDescription, inputTradeAddressMinPriceUsd, inputTokenAmount, inputTokenWeight, inputTokenDebtUsd,
  //   state.sizeToken, outputTokenDescription, outputTradeAddressMaxPriceUsd, outputTokenWeight, outputTokenDebtUsd,

  //   state.vaultPosition,

  //   state.leverage,
  //   state.directionDiv,
  // )))



  // const tradeParamsState = multicast(combineObject({ inputTradeAddressState: state.collateralToken, outputTradeAddressState: state.sizeToken, tradeBalance, leverageState: state.leverage, outputTradeAddressPriceUsd: outputTradeAddressMaxPriceUsd, inputTradeAddressPriceUsd: inputTradeAddressMinPriceUsd, executionFee }))

  const requestTrade = snapshot(({ tradeParams, vault, increaseCollateralDelta, reduceSizeDelta, executionFee }) => {

    const path = resolveLongPath(tradeParams.collateralToken, tradeParams.sizeToken)
    const isLong = tradeParams.leverage > 0

    return tradeParams.collateralToken === AddressZero
      ? vault.createIncreasePositionETH(
        path,
        tradeParams.sizeToken,
        0,
        increaseCollateralDelta,
        isLong,
        tradeParams.collateralTokenPrice,
        executionFee,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        { value: increaseCollateralDelta + executionFee }
      )
      : vault.createIncreasePosition(
        path,
        tradeParams.sizeToken,
        tradeParams.collateralToken,
        0,
        increaseCollateralDelta,
        isLong,
        tradeParams.collateralTokenPrice,
        executionFee,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        { value: executionFee }
      )

  }, combineObject({ tradeParams, vault: trade.contract, reduceSizeDelta, increaseCollateralDelta, executionFee }), clickPrimary)


  const isDirectionIncrease = skipRepeats(map(ratio => ratio > 0, state.directionDiv))

  const changeDirDivUsingInput = mergeArray([
    combineArray((wallet, amount) => {
      return formatFixed((amount * BASIS_POINTS_DIVISOR) / wallet * BASIS_POINTS_DIVISOR, 4) / Number(BASIS_POINTS_DIVISOR)
    }, walletBalance, inputCollateralDelta),
    combineArray((pos, delta) => {
      if (pos) {
        return -getRatio(delta, pos.size)
      }

      return 0
    }, state.vaultPosition, inputSizeDelta),
  ])


  const collateralDeltaHint = mergeArray([
    snapshot((pos, amount) => pos ? pos.collateral + amount : amount, state.vaultPosition, increaseCollateralDeltaUsd),
    snapshot((pos, sizeDelta) => pos ? pos.collateral + (sizeDelta * pos.collateral / pos.size) : sizeDelta, state.vaultPosition, reduceSizeDelta),
  ])

  return [
    $column(layoutSheet.spacing)(
      $card(style({ gap: '20px', padding: '15px' }))(


        // $row(layoutSheet.spacingSmall, style({ padding: '0' }))(
        //   $label(layoutSheet.spacingSmall, style({ alignItems: 'center', flexDirection: 'row', fontSize: '0.75em' }))(
        //     $Checkbox({
        //       value: orderModeState
        //     })({
        //       check: changeOrderModeTether()
        //     }),
        //     $text('Edit'),
        //   ),
        //   // $ButtonToggle({
        //   //   selected: orderModeState,
        //   //   options: [OrderType.INCREASE, OrderType.REDUCE],
        //   //   $$option: combine((selectedDir, option) => {

        //   //     const isSelected = selectedDir === option

        //   //     return $row(
        //   //       $text(option === OrderType.INCREASE ? 'Increase' : 'Reduce')
        //   //     )


        //   //   }, orderModeState)
        //   // })({ select: changeOrderModeTether() }),

        //   $node(style({ flex: 1 }))(),

        //   // $Dropdown<OrderType>({
        //   //   $container: $row(style({ position: 'relative', alignSelf: 'center' })),
        //   //   $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
        //   //     switchLatest(map(option => {
        //   //       return $text(option === OrderType.ADD ? 'Add' : option === OrderType.REDUCE ? 'Reduce' : 'Trigger')
        //   //     }, mergeArray([orderTypeInit, changeOrderType]))),
        //   //     $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
        //   //   ),
        //   //   value: {
        //   //     value: orderTypeInit,
        //   //     $container: $defaultSelectContainer(style({ minWidth: '300px', right: 0 })),
        //   //     $$option: map(option => {

        //   //       return $text(option === OrderType.ADD ? 'Add' : option === OrderType.REDUCE ? 'Reduce' : 'Trigger')
        //   //     }),
        //   //     list: [
        //   //       OrderType.ADD,
        //   //       OrderType.REDUCE,
        //   //       OrderType.TRIGGER,
        //   //     ],
        //   //   }
        //   // })({
        //   //   select: changeOrderTypeTether()
        //   // }),

        //   // O(stylePseudo(':hover', { color: pallete.primary }))(
        //   //   $hintInput('Balance', map(b => readableNumber(formatFixed(b)).toString(), walletBalance))
        //   // ),

        // ),

        $column(layoutSheet.spacingSmall)(

          $row(
            $hintInput(
              map(isIncrease => isIncrease ? `Collateral` : 'Collateral', isDirectionIncrease), // combineArray((existingPosition) => (existingPosition ? `Collateral` : `Collateral`), config.currentPosition),
              map(position => (position ? formatReadableUSD(position.collateral) : '$0'), state.vaultPosition),
              combineArray((amount) => formatReadableUSD(amount), collateralDeltaHint),
            ),

            $node(style({ flex: 1 }))(),

            O(stylePseudo(':hover', { color: pallete.primary }))(
              $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
                $text(style({ color: pallete.foreground }))(`Balance`),
                $text(combineArray((tokenDesc, balance) => readableNumber(formatFixed(balance, tokenDesc.decimals)).toString(), inputTokenDescription, walletBalance)),
              ),
              // $hintInput(
              //   now('Balance'),
              //   map(b => readableNumber(formatFixed(b)).toString(), walletBalance),
              //   combineArray((trade, walletBalance) => readableNumber(formatFixed(walletBalance - trade.inputAmount, trade.inputTokenDescription.decimals)), tradeBalance, walletBalance),
              // )
            ),
          ),

          $row(style({ position: 'relative' }))(

            $field(styleBehavior(map(isIncrease => isIncrease ? {} : { pointerEvents: 'none', color: pallete.foreground }, isDirectionIncrease)))(
              O(
                map(node =>
                  merge(
                    now(node),
                    filter(() => false, combineArray((tokenDescription, val) => {
                      // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                      node.element.value = formatFixed(val, tokenDescription.decimals).toString()
                    }, inputTokenDescription, mergeArray([
                      snapshot(
                        ({ inputTokenDescription, inputTradeAddressMinPriceUsd }, amountUsd) => getTokenAmount(amountUsd, inputTradeAddressMinPriceUsd, inputTokenDescription),
                        combineObject({ inputTokenDescription, inputTradeAddressMinPriceUsd }), reduceSizeToCollateralUsd
                      ),
                      combineArray((balance, delta) => delta, walletBalance, increaseCollateralDeltaSlider)
                    ])))
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
              }, inputTokenDescription)),
            )(),
            $Dropdown<TradeAddress>({
              $container: $row(style({ position: 'relative', alignSelf: 'center' })),
              $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                switchLatest(map(option => {
                  const symbol = option === CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN]
                    ? TOKEN_SYMBOL.WETH
                    : CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : option]

                  return $icon({ $content: $tokenIconMap[symbol], width: '34px', viewBox: '0 0 32 32' })
                }, state.collateralToken)),
                $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
              ),
              value: {
                value: state.collateralToken,
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
              select: changeInputAddressTether()
            }),
          ),
        ),


        style({ margin: '0 -15px' })(
          $ButterflySlider({
            positiveColor: pallete.primary,
            negativeColor: pallete.indeterminate,
            value: mergeArray([changeDirDivUsingInput, state.directionDiv]),
            thumbSize: 60,
            thumbText: map(n => {
              const newLocal = Math.floor(n * 100)

              return (n > 0 ? '+' : ' ') + newLocal + '%'
            })
          })({
            change: directionDivTether()
          })
        ),


        $column(layoutSheet.spacingSmall)(
          $row(
            $field(styleBehavior(map(isIncrease => isIncrease ? { pointerEvents: 'none', color: pallete.foreground } : {}, isDirectionIncrease)))(
              O(
                map(node =>
                  merge(
                    now(node),
                    filter(() => false, map((val) => {
                      // const valF = formatFixed(val.outputAmountUsd, val.outputTokenDescription.decimals)
                      const valF = formatFixed(val, 30)
                      // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                      node.element.value = valF.toString()

                    }, mergeArray([reduceSizeDeltaSlider, increaseCollateralToSize])))
                  )
                ),
                switchLatest
              ),
              inputSizeDeltaTether(nodeEvent('input'), map((inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  throw new Error('Target is not type of input')
                }

                return BigInt(parseFixed(target.value.replace(/(\+|-)/, ''), USD_DECIMALS))
              }))

            )(),

            $Dropdown<TradeAddress>({
              $container: $row(style({ position: 'relative', alignSelf: 'center' })),
              $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                switchLatest(map(option => {
                  const tokenDesc = TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                  return $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', viewBox: '0 0 32 32' })
                }, state.sizeToken)),
                $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
              ),
              value: {
                value: state.sizeToken,
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
              select: changeOutputAddressTether()
            }),
          ),
          $row(style({ placeContent: 'space-between', padding: '0' }))(
            $hintInput(
              combineArray((existingPosition) => (existingPosition ? `Size` : 'Size'), state.vaultPosition),
              map(pos => (pos ? formatReadableUSD(pos.size) : '$0'), state.vaultPosition),
              map(formatReadableUSD, mergeArray([
                combineArray((pos, sizeDelta) => pos ? pos.size + sizeDelta : sizeDelta, state.vaultPosition, reduceSizeDelta),
                combineArray((pos, sizeDelta) => pos ? pos.size + sizeDelta : sizeDelta, state.vaultPosition, increaseCollateralToSize)
              ]))
            ),

            $node(style({ flex: 1 }))(),

            $label(layoutSheet.spacingSmall, style({ alignItems: 'center', flexDirection: 'row', fontSize: '0.75em' }))(
              $Checkbox({
                disabled: map(isIncrease => isIncrease, isDirectionIncrease),
                value: isReduceOnly
              })({
                check: isReduceOnlyTether()
              }),
              $text('Reduce Only'),
            ),
          ),
        ),


        style({ margin: '0 -15px' })(
          $ButterflySlider({
            $thumb: $defaultThumb(style({})),
            disabled: startWith(false, isReduceOnly),
            value: mergeArray([
              state.leverage,
              combineArray((sizeDelta, collateralDelta, currentPosition) => {
                if (currentPosition === null) {
                  return 0
                  // throw new Error('no position to reduce')
                }

                const lev = getMultiplier(currentPosition.size + sizeDelta, currentPosition.collateral + collateralDelta) / MAX_LEVERAGE_NORMAL

                return currentPosition.isLong ? lev : -lev
              }, inputSizeDelta, reduceCollateralDeltaSlider, state.vaultPosition)
            ]),
            thumbText: map(n => {
              const newLocal = readableNumber(Math.abs(n * MAX_LEVERAGE_NORMAL), 1) + 'x'
              return newLocal
            })
          })({
            change: changeLeverageTether()
          })
        ),

        switchLatest(map(trade => {
          if (trade === null) {
            return empty()
          }

          const hoverChartPnl: Stream<IPositionDelta> = multicast(switchLatest(combineArray((trade) => {

            if (isTradeSettled(trade)) {
              return now({ delta: trade.realisedPnl - trade.fee, deltaPercentage: trade.realisedPnlPercentage })
            }

            return map(price => calculatePositionDelta(price, trade.averagePrice, trade.isLong, trade), state.collateralTokenPrice)

          }, now(trade))))
          const chartRealisedPnl = map(ss => formatFixed(ss.delta, 30), hoverChartPnl)

          return $column(
            $column(style({ position: 'relative', margin: '-15px -15px -85px -15px', zIndex: 0, height: '170px' }))(
              style({
                textAlign: 'center',
                fontSize: '1.75em', alignItems: 'baseline', paddingTop: '26px',
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
                trade, latestPrice: state.collateralTokenPrice, chain
              })({
                crosshairMove: crosshairMoveTether()
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
                disabled: combineArray((pos, params, sizeDelta, collateralDelta) => {

                  if (params.directionDiv > 0 && collateralDelta > 0) {
                    return false
                  }

                  if (pos && params.directionDiv < 0 && sizeDelta < 0) {
                    return false
                  }


                  return true
                }, state.vaultPosition, tradeParams, reduceSizeDelta, increaseCollateralDelta),
                $content: $text(map(params => {
                  const outputToken = getTokenDescription(USE_CHAIN, params.sizeToken)
                  const modLabel = params.vaultPosition
                    ? params.directionDiv > 0 ? 'Increase' : 'Decrease'
                    : 'Open'
                  return `${modLabel} ${params.leverage > 0 ? 'Long' : 'Short'} ${outputToken.symbol}`
                }, tradeParams)),
              })({
                click: clickPrimaryTether()
              })
            }),
            ensureNetwork: true,
            walletLink: walletLink
          })({ walletChange: walletChangeTether() })
        )

      ),

      $IntermediateTx({
        query: requestTrade,
        chain: USE_CHAIN
      })({})

    ),

    {
      changeInputAddress,
      changeOutputAddress,
      requestTrade,
      changeLeverage,
      walletChange,
      directionDiv,
    }
  ]
})

