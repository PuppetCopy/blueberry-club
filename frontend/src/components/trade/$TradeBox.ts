import { Behavior, combineArray, combineObject, O } from "@aelea/core"
import { component, INode, $element, attr, style, $text, nodeEvent, stylePseudo, $node, styleBehavior, motion, MOTION_NO_WOBBLE } from "@aelea/dom"
import { $row, layoutSheet, $icon, $column, state, $NumberTicker, $Checkbox } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import {
  ARBITRUM_ADDRESS_LEVERAGE, AddressZero, TOKEN_DESCRIPTION_MAP, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, ARBITRUM_ADDRESS, formatFixed, readableNumber,
  MAX_LEVERAGE_NORMAL, TradeAddress, TOKEN_SYMBOL, parseFixed, formatReadableUSD, BASIS_POINTS_DIVISOR,
  DEDUCT_FOR_GAS, ITrade, IVaultPosition, IChainParamApi, isTradeSettled, getDelta, MAX_LEVERAGE, STABLE_SWAP_FEE_BASIS_POINTS, STABLE_TAX_BASIS_POINTS, TAX_BASIS_POINTS, SWAP_FEE_BASIS_POINTS, ARBITRUM_ADDRESS_TRADE, USD_DECIMALS, getMultiplier, getTokenUsd, getTokenAmount, replayState, getBasisMultiplier
} from "@gambitdao/gmx-middleware"
import { $alertIcon, $bear, $bull, $IntermediateTx, $tokenIconMap, $tokenLabelFromSummary, $Tooltip } from "@gambitdao/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { merge, multicast, awaitPromises, mergeArray, now, snapshot, map, switchLatest, filter, skipRepeats, constant, empty } from "@most/core"
import { Stream } from "@most/types"
import { $Slider } from "../$ButterflySlider"
import { $ButtonPrimary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $card } from "../../elements/$common"
import { $caretDown } from "../../elements/$icons"
import { connectTrade, connectVault } from "../../logic/contract/trade"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { ERC20__factory } from "@gambitdao/gbc-contracts"
import { CHAIN_NATIVE_TO_ADDRESS, getFeeBasisPoints, getTokenDescription, resolveLongPath } from "./utils"
import { IEthereumProvider } from "eip1193-provider"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { WALLET } from "../../logic/provider"
import { $TradePnlHistory } from "./$TradeCardPreview"
import { $label } from "../../common/$TextField"



interface ITradeBox {
  chain: IChainParamApi['chain'],

  state: {
    trade: Stream<ITrade | null>

    isLong: Stream<boolean>
    depositToken: Stream<TradeAddress>
    focusFactor: Stream<number>

    collateralToken: Stream<ARBITRUM_ADDRESS_TRADE>
    indexToken: Stream<ARBITRUM_ADDRESS_LEVERAGE>

    vaultPosition: Stream<IVaultPosition | null>,

    leverage: Stream<number>
    isIncrease: Stream<boolean>
    collateral: Stream<bigint>
    collateralUsd: Stream<bigint>
    size: Stream<bigint>
  }

  depositTokenPrice: Stream<bigint>,
  collateralTokenPrice: Stream<bigint>
  indexTokenPrice: Stream<bigint>

  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">
}


const REDUCED_FOR_TX_FEES = DEDUCT_FOR_GAS * 2n


export const $TradeBox = ({ state, walletLink, walletStore, chain, collateralTokenPrice, depositTokenPrice, indexTokenPrice }: ITradeBox) => component((
  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,

  [inputCollateralDelta, inputCollateralDeltaTether]: Behavior<INode, bigint>,
  [inputSizeDelta, inputSizeDeltaTether]: Behavior<INode, bigint>,
  // [isIncreaseOnly, isIncreaseOnlyTether]: Behavior<boolean, boolean>,

  [changeDepositToken, changeDepositTokenTether]: Behavior<TradeAddress, TradeAddress>,

  [changeCollateralToken, changeCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_TRADE, ARBITRUM_ADDRESS_TRADE>,
  [changeIndexToken, changeIndexTokenTether]: Behavior<TradeAddress, TradeAddress>,

  [clickMaxDeposit, clickMaxDepositTether]: Behavior<PointerEvent, PointerEvent>,
  [clickMaxWithdraw, clickMaxWithdrawTether]: Behavior<PointerEvent, PointerEvent>,

  [clickPrimary, clickPrimaryTether]: Behavior<any, any>,
  // [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  // [switchIsLong, switchIsLongTether]: Behavior<INode, boolean>,
  [isIncrease, switchisIncrease]: Behavior<boolean, boolean>,
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

  const changeCollateralRatio = mergeArray([
    slideCollateralRatio,
    constant(-1, clickMaxWithdraw),
    constant(1, clickMaxDeposit),
  ])

  const collateralRatio = mergeArray([
    now(0),
    changeCollateralRatio
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
  const indexTokenCumulativeFundingRate = switchLatest(map(address => vault.getTokenCumulativeFundingRate(address), state.indexToken))

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
  const collateralTokenDescription = map(address => getTokenDescription(USE_CHAIN, address), state.collateralToken)


  const tradeConfig = multicast(combineObject(state))

  const tradeParams = replayState({
    ...state,
    collateralTokenPrice, depositTokenPrice,
    walletBalance, depositTokenDescription, collateralTokenDescription,
    collateralTokenWeight, collateralTokenDebtUsd,
    indexTokenWeight, indexTokenDebtUsd, indexTokenDescription, indexTokenPrice, indexTokenCumulativeFundingRate,
    totalTokenWeight: vault.totalTokenWeight, usdgSupply: vault.usdgAmount, collateralRatio
  })

  const validationError = map(params => {

    if (params.leverage > 1) {
      return `leverage exceeds ${MAX_LEVERAGE_NORMAL}x`
    }

    if (params.vaultPosition) {
      const totalSize = params.size - params.vaultPosition.size
      const delta = getDelta(params.vaultPosition.isLong, params.vaultPosition.averagePrice, params.indexTokenPrice, totalSize)

      if (params.collateralUsd > params.vaultPosition.collateral + delta) {
        return `Exceeding liquidation price`
      }
    }

    return null
  }, tradeParams)

  const swapFeesUsd = combineArray(params => {

    if (!params.isIncrease) {
      return 0n
    }

    const swapFeeBasisPoints = params.depositTokenDescription.isStable && params.indexTokenDescription.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = params.depositTokenDescription.isStable && params.indexTokenDescription.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS
    const depositToken = params.depositToken === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : params.collateralToken

    if (depositToken === params.indexToken) {
      return 0n
    }

    const feeBps0 = getFeeBasisPoints(
      params.collateralTokenDebtUsd,
      params.collateralTokenWeight,
      params.collateralUsd,
      swapFeeBasisPoints,
      taxBasisPoints,
      true,
      params.usdgSupply,
      params.totalTokenWeight
    )
    const feeBps1 = getFeeBasisPoints(
      params.indexTokenDebtUsd,
      params.indexTokenWeight,
      params.collateralUsd,
      swapFeeBasisPoints,
      taxBasisPoints,
      false,
      params.usdgSupply,
      params.totalTokenWeight
    )

    const feeBps = feeBps0 > feeBps1 ? feeBps0 : feeBps1

    const addedSwapFee = feeBps ? params.collateralUsd * feeBps / BASIS_POINTS_DIVISOR : 0n
    // swapFees = fromUsdMin.mul(feeBasisPoints).div(BASIS_POINTS_DIVISOR);
    return addedSwapFee
  }, tradeParams)

  // const clickMaxBalanceValue = snapshot(({ tradeParams, walletBalance }) => {
  //   if (tradeParams.depositToken === AddressZero) {
  //     return walletBalance - REDUCED_FOR_TX_FEES
  //   }

  //   return walletBalance
  // }, combineObject({ walletBalance, tradeParams }), clickMaxDeposit)

  // const clickMaxEditPosition = snapshot(({ tradeParams, walletBalance }) => {
  //   if (!tradeParams.vaultPosition) {
  //     return 0n
  //   }

  //   return tradeParams.vaultPosition.size
  // }, combineObject({ walletBalance, tradeParams }), clickMaxWithdraw)


  const slideCollateral = snapshot((params, ratioN) => {
    const ratio = BigInt(Math.floor(Math.abs(ratioN) * Number(BASIS_POINTS_DIVISOR)))

    if (params.isIncrease) {
      return params.walletBalance * ratio / BASIS_POINTS_DIVISOR
    }


    if (!params.vaultPosition) {
      return 0n
    }

    const sizeUsd = (params.vaultPosition.collateral) * ratio / BASIS_POINTS_DIVISOR
    const sizeAmount = getTokenAmount(sizeUsd, params.indexTokenPrice, params.indexTokenDescription)

    return sizeAmount

    // if (params.vaultPosition) {

    //   if (ratioN > 0) {
    //     return params.walletBalance * ratio / BASIS_POINTS_DIVISOR
    //   }

    //   if (!params.vaultPosition) {
    //     throw new Error('no positon to modify')
    //   }


    // }

    // const leverage = MAX_LEVERAGE * BigInt(Math.floor(Math.abs(params.leverage) * Number(BASIS_POINTS_DIVISOR))) / BASIS_POINTS_DIVISOR

    // const sizeAmount = params.size * getDenominator(params.indexTokenDescription.decimals) / params.indexTokenPrice
    // const sizeUsd = sizeAmount * params.indexTokenPrice / getDenominator(params.indexTokenDescription.decimals)
    // // const collateral = (sizeUsd * BASIS_POINTS_DIVISOR) / leverage
    // // const feeBps = getSwapFeeBps(params, collateral)
    // const feeBps = 0n

    // const baseFromAmountUsd = sizeUsd * BASIS_POINTS_DIVISOR / leverage
    // const fees = params.size * MARGIN_FEE_BASIS_POINTS / BASIS_POINTS_DIVISOR + (feeBps ? baseFromAmountUsd * feeBps / BASIS_POINTS_DIVISOR : 0n)
    // const nextFromUsd = baseFromAmountUsd + fees
    // const nextFromAmount = nextFromUsd * getDenominator(params.depositTokenDescription.decimals) / params.depositTokenPrice

    // return nextFromAmount
  }, tradeParams, collateralRatio)


  const slideSize = snapshot(params => {
    const leverageRatio = BigInt(Math.floor(Math.abs(params.leverage) * Number(BASIS_POINTS_DIVISOR)))
    const leverageMultiplier = MAX_LEVERAGE * leverageRatio / BASIS_POINTS_DIVISOR


    // const depositUsd = getTokenUsd(params.collateral, params.depositTokenPrice, params.depositTokenDescription)

    if (!params.vaultPosition) {

      const maxSizeUsd = (params.collateralUsd * MAX_LEVERAGE / BASIS_POINTS_DIVISOR)
      const sizeDelta = (maxSizeUsd * leverageRatio / BASIS_POINTS_DIVISOR)

      return sizeDelta
    }


    if (params.isIncrease) {
      const ttlCollateral = params.collateralUsd + params.vaultPosition.collateral
      const positionMultiplier = getBasisMultiplier(params.vaultPosition.size, ttlCollateral)
      const posLeverage = formatFixed(positionMultiplier, 4) / MAX_LEVERAGE_NORMAL

      if (posLeverage === params.leverage) {
        return 0n
      }

      const maxSizeUsd = (ttlCollateral * MAX_LEVERAGE / BASIS_POINTS_DIVISOR)
      const sizeDelta = (maxSizeUsd * leverageRatio / BASIS_POINTS_DIVISOR) - params.vaultPosition.size

      return sizeDelta
    }
    

    const ttlCollateral = params.vaultPosition.collateral - params.collateralUsd
    const positionMultiplier = getBasisMultiplier(params.vaultPosition.size, ttlCollateral)
    const posLeverage = formatFixed(positionMultiplier, 4) / MAX_LEVERAGE_NORMAL


    if (posLeverage === params.leverage) {
      return 0n
    }

    const currentLeverageMultiplier = leverageMultiplier * BASIS_POINTS_DIVISOR / positionMultiplier

    const sizeM = params.vaultPosition.size * currentLeverageMultiplier / BASIS_POINTS_DIVISOR

    // const feeBps = getSwapFeeBps(params, params.collateral)

    // const addedSwapFee = feeBps ? collateralUsd * (BASIS_POINTS_DIVISOR - feeBps) / BASIS_POINTS_DIVISOR : 0n
    // const fromUsdMinAfterFee = collateralUsd + addedSwapFee

    // const toNumerator = (fromUsdMinAfterFee + positionSizeUsd) * leverage * BASIS_POINTS_DIVISOR
    // const toDenominator = MARGIN_FEE_BASIS_POINTS * leverage + BASIS_POINTS_DIVISOR * BASIS_POINTS_DIVISOR

    // const nextToUsd = toNumerator / toDenominator

    // const outputAmountUsd = nextToUsd * getDenominator(params.indexTokenDescription.decimals) / params.indexTokenPrice

    return (params.vaultPosition.size) - sizeM
    // return positionSizeUsd - maxSizeUsd
  }, tradeParams, slideLeverage)




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



  return [
    $column(layoutSheet.spacing)(
      $card(style({ gap: '20px', padding: '15px' }))(

        $column(layoutSheet.spacing)(
          $row(layoutSheet.spacingTiny, style({ position: 'relative', alignItems: 'center' }))(

            $field(
              styleBehavior(map(isIncrease => isIncrease === 0 ? {} : { color: pallete.foreground, backgroundColor: 'transparent' }, state.focusFactor)),
              focusCollateralTether(nodeEvent('focus'))
            )(
              O(
                map(node =>
                  merge(
                    now(node),
                    filter(() => false, snapshot((tradeParams) => {
                      node.element.value = formatFixed(tradeParams.collateral, tradeParams.isIncrease ? tradeParams.depositTokenDescription.decimals : tradeParams.indexTokenDescription.decimals).toString()
                    }, tradeParams, mergeArray([slideCollateral, state.isIncrease])))
                  )
                ),
                switchLatest
              ),

              inputCollateralDeltaTether(nodeEvent('input'), snapshot((params, inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  throw new Error('Target is not type of input')
                }

                const decimals = params.isIncrease ? params.depositTokenDescription.decimals : params.indexTokenDescription.decimals
                return BigInt(parseFixed(target.value.replace(/(\+|-)/, ''), decimals))
              }, tradeParams)),
            )(),

            switchLatest(map(params => {

              if (!params.isIncrease) {
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
            }, tradeParams)),
          ),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center', placeContent: 'stretch' }))(
            $hintInput(
              now(`Collateral`),
              combineArray((params, swapFee) => {
                if (!params.vaultPosition) {
                  return 0n
                }

                const posCollateral = params.vaultPosition.collateral || 0n
                return formatReadableUSD(posCollateral)

              }, tradeParams, swapFeesUsd),

              combineArray((params, swapFee) => {
                if (!params.vaultPosition) {
                  return 0n
                }

                const posCollateral = params.vaultPosition.collateral || 0n
                const totalUsd = posCollateral + params.collateralUsd

                if (params.isIncrease) {
                  return formatReadableUSD(totalUsd - swapFee)
                }

                const deltaProfit = getDelta(params.vaultPosition.isLong, params.indexTokenPrice, params.vaultPosition.averagePrice, params.vaultPosition.size)
                const netCollateral = posCollateral // + deltaProfit.delta

                const ratio = BigInt(Math.floor(Math.abs(params.collateralRatio) * Number(BASIS_POINTS_DIVISOR)))

                return formatReadableUSD(netCollateral * (BASIS_POINTS_DIVISOR - ratio) / BASIS_POINTS_DIVISOR)
              }, tradeParams, swapFeesUsd)
            ),

            $node(style({ flex: 1 }))(),

            // switchLatest(combineArray((depositToken, indexToken) => {
            //   const depositTokenNorm = depositToken === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : depositToken

            //   if (depositTokenNorm === indexToken) {
            //     return empty()
            //   }

            //   return $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
            //     $text(style({ color: pallete.foreground }))('Swap'),
            //     $text(map(n => formatReadableUSD(n), swapFeesUsd))
            //   )
            // }, state.depositToken, state.indexToken)),



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

            $Dropdown<boolean>({
              $container: $row(style({ position: 'relative' })),
              $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                switchLatest(map(option => {
                  return $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                    $icon({ $content: option ? $bull : $bear, width: '14px', viewBox: '0 0 32 32' }),
                    $text(style({ fontSize: '.75em' }))(option ? 'Long' : 'Short'),
                  )
                }, state.isLong)),
                $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px' }), viewBox: '0 0 32 32' }),
              ),
              value: {
                value: state.isLong,
                $container: $defaultSelectContainer(style({ minWidth: '100px' })),
                $$option: map(option => {
                  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $icon({ $content: option ? $bull : $bear, fill: option ? pallete.positive : pallete.negative, width: '18px', viewBox: '0 0 32 32' }),
                    $text(option ? 'Long' : 'Short'),
                  )
                }),
                list: [
                  true,
                  false
                ],
              }
            })({
              select: switchIsLongTether()
            }),
          ),
        ),


        style({ margin: '0 -15px' })(
          $Slider({
            color: map(isIncrease => isIncrease ? pallete.middleground : pallete.indeterminate, state.isIncrease),
            step: 0.01,
            value: collateralRatio,
            thumbSize: 60,
            thumbText: map(n => Math.round(n * 100) + '%')
          })({
            change: slideCollateralRatioTether()
          })
        ),

        $column(layoutSheet.spacing)(
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

                    }, indexTokenDescription, slideSize))
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
          $row(layoutSheet.spacing, style({ placeContent: 'space-between', padding: '0' }))(
            $hintInput(
              now(`Size`),
              map(pos => formatReadableUSD(pos ? pos.size : 0n), state.vaultPosition),

              map((params) => {
                const posSize = params.vaultPosition?.size || 0n

                if (params.isIncrease) {
                  return formatReadableUSD(posSize + params.size)
                }

                return formatReadableUSD(posSize - params.size)
              }, tradeParams)
            ),

            $node(style({ flex: 1 }))(),


            switchLatest(map(isLong => {

              if (isLong) {
                return switchLatest(map(option => {
                  const tokenDesc = TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                  return $row(layoutSheet.spacingTiny, style({ fontSize: '.75em', alignItems: 'center' }))(
                    $text(style({ color: pallete.foreground, marginRight: '3px' }))('Profits In'),
                    $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                    $text(tokenDesc.symbol)
                  )
                }, state.indexToken))
              }

              return $Dropdown<ARBITRUM_ADDRESS_TRADE>({
                $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                  switchLatest(map(option => {
                    const tokenDesc = TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                    return $row(layoutSheet.spacingTiny, style({ fontSize: '.75em', alignItems: 'center' }))(
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
            }, state.isLong)),

            $label(layoutSheet.spacingSmall, style({ alignItems: 'center', flexDirection: 'row', fontSize: '0.75em' }))(
              $Checkbox({
                value: map(x => !x, state.isIncrease)
              })({
                check: switchisIncrease(map(x => !x))
              }),
              $text('Reduce'),
            ),
            // styleBehavior(map(pos => !pos ? { opacity: '.5', pointerEvents: 'none' } : {}, state.vaultPosition))(
            //   $label(layoutSheet.spacingSmall, style({ alignItems: 'center', flexDirection: 'row', fontSize: '0.75em' }))(

            //     $Checkbox({
            //       value: state.isIncrease
            //     })({
            //       check: switchisIncrease()
            //     }),
            //     $text('Reduce'),
            //   )
            // ),

          ),
        ),

        style({ margin: '0 -15px' })($Slider({
          value: state.leverage,
          thumbSize: 60,
          color: map(isLong => isLong ? pallete.positive : pallete.negative, state.isLong),
          min: snapshot((params, { collateral, pos, isIncrease }) => {
            if (!isIncrease) {
              return 0
            }

            const totalCollateral = (pos?.collateral || 0n) + params.collateralUsd
            const totalSize = pos?.size || 0n
            const multiplier = getMultiplier(totalSize, totalCollateral) / MAX_LEVERAGE_NORMAL
            return multiplier
          }, tradeParams, combineObject({ collateral: state.collateral, pos: state.vaultPosition, isIncrease: state.isIncrease })),
          max: snapshot((params, { collateral, pos, isIncrease }) => {
            if (isIncrease) {
              return 1
            }

            // const collateralUsd = getTokenUsd(collateral, params.indexTokenPrice, params.indexTokenDescription)
            const totalCollateral = (pos?.collateral || 0n) - params.collateralUsd
            const totalSize = pos?.size || 0n
            const multiplier = getMultiplier(totalSize, totalCollateral) / MAX_LEVERAGE_NORMAL

            return multiplier
          }, tradeParams, combineObject({ collateral: state.collateral, pos: state.vaultPosition, isIncrease: state.isIncrease })),
          thumbText: map(n => readableNumber(Math.abs(n * MAX_LEVERAGE_NORMAL), 1) + 'x')
        })({
          change: slideLeverageTether()
        })),

        switchLatest(map(trade => {
          const $container = $column(style({ position: 'relative', margin: '-15px -15px -85px -15px', zIndex: 0, height: '170px' }))

          if (trade === null) {
            return $container()
          }

          const hoverChartPnl: Stream<bigint> = multicast(switchLatest(combineArray((trade) => {
            if (isTradeSettled(trade)) {
              return now(trade.realisedPnl - trade.fee)
            }

            return map(price => getDelta(trade.isLong, price, trade.averagePrice, trade.size), indexTokenPrice)

          }, now(trade))))

          const chartRealisedPnl = map(delta => formatFixed(delta, 30), hoverChartPnl)

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
                trade, latestPrice: indexTokenPrice, chain
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

              return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                $ButtonPrimary({
                  disabled: combineArray((pos, params) => {

                    if (params.isIncrease && params.leverage <= 1 && (params.collateral > 0n || params.size > 0n) && params.collateral <= params.walletBalance) {
                      return false
                    }


                    if (pos && !params.isIncrease && params.leverage <= 1 && (params.size > 0n || params.collateral > 0n)) {

                      const totalSize = params.size - pos.size
                      const delta = getDelta(pos.isLong, pos.averagePrice, params.indexTokenPrice, totalSize)
                      if (params.collateralUsd > pos.collateral + delta) {
                        return true
                      }

                      return false
                    }


                    return true
                  }, state.vaultPosition, tradeParams),
                  $content: $text(map(params => {
                    const outputToken = getTokenDescription(USE_CHAIN, params.indexToken)

                    let modLabel: string

                    if (params.vaultPosition) {
                      if (params.isIncrease) {
                        modLabel = 'Increase'
                      } else {
                        modLabel = params.size === params.vaultPosition.size || params.collateral === params.vaultPosition.collateral ? 'Close' : 'Decrease'
                      }
                    } else {
                      modLabel = 'Open'
                    }

                    return `${modLabel} ${params.isLong ? 'Long' : 'Short'} ${outputToken.symbol}`
                  }, tradeParams)),
                })({
                  click: clickPrimaryTether()
                }),

                switchLatest(map(error => {
                  if (error === null) {
                    return empty()
                  }

                  return $Tooltip({
                    $content: $text(error),
                    $anchor: $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '28px', svgOps: style({ fill: pallete.negative, padding: '3px', filter: 'drop-shadow(0px 0px 10px black) drop-shadow(0px 0px 1px black)' }) })
                  })({})
                }, skipRepeats(validationError)))
              )
            }),
            ensureNetwork: true,
            walletLink: walletLink
          })({ walletChange: walletChangeTether() })
        ),

      ),

      $IntermediateTx({
        query: requestTrade,
        clean: tradeConfig,
        chain: USE_CHAIN
      })({})

    ),

    {
      switchIsLong,
      changeDepositToken,
      changeIndexToken,
      requestTrade,
      changeLeverage: mergeArray([
        snapshot((params) => {
          const posCollateral = params.vaultPosition?.collateral || 0n
          const posSize = params.vaultPosition?.size || 0n
          const totalSize = posSize + params.size

          if (params.isIncrease) {
            const totalCollateral = posCollateral + params.collateralUsd
            return getMultiplier(totalSize, totalCollateral) / MAX_LEVERAGE_NORMAL
          }

          if (!params.vaultPosition) {
            return 0
          }

          return getMultiplier(posSize - params.size, posCollateral - params.collateralUsd) / MAX_LEVERAGE_NORMAL
        }, tradeParams, mergeArray([state.collateralUsd, state.vaultPosition])),
        slideLeverage
      ]),
      walletChange,
      isIncrease,
      changeCollateralToken,
      changeCollateral: mergeArray([
        // now(0n),
        slideCollateral,
        snapshot((params, inIncrease) => {
          const ratio = BigInt(Math.floor(Math.abs(params.collateralRatio) * Number(BASIS_POINTS_DIVISOR)))

          if (inIncrease) {
            return params.walletBalance * ratio / BASIS_POINTS_DIVISOR
          }


          if (!params.vaultPosition) {
            return 0n
          }

          // const sizeUsd = (params.vaultPosition.collateral + deltaProfit.delta) * ratio / BASIS_POINTS_DIVISOR
          const sizeUsd = (params.vaultPosition.collateral) * ratio / BASIS_POINTS_DIVISOR
          const sizeAmount = getTokenAmount(sizeUsd, params.indexTokenPrice, params.indexTokenDescription)

          return sizeAmount
        }, tradeParams, state.isIncrease),
        inputCollateralDelta,
      ]),
      changeCollateralUsd: snapshot((params, collateral) => {
        if (params.isIncrease) {
          return getTokenUsd(collateral, params.depositTokenPrice, params.depositTokenDescription)
        }

        if (!params.vaultPosition) {
          return 0n
        }

        const withdrawCollateral = getTokenUsd(collateral, params.indexTokenPrice, params.indexTokenDescription)

        return withdrawCollateral
      }, tradeParams, state.collateral),
      changeSize: mergeArray([
        // now(0n),
        slideSize,
        // clickMaxEditPosition,
        inputSizeDelta,
      ]),
      focusFactor: skipRepeats(mergeArray([
        mergeArray([constant(1, slideLeverage), constant(0, slideCollateralRatio)]),
        // constant(0, clickMaxBalanceValue),
        // constant(1, clickMaxEditPosition),
        constant(0, focusCollateral),
        constant(1, focusSize)
      ])),
    }
  ]
})

