import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { component, INode, $element, attr, style, $text, nodeEvent, $node, styleBehavior, motion, MOTION_NO_WOBBLE, styleInline, stylePseudo } from "@aelea/dom"
import { $row, layoutSheet, $icon, $column, screenUtils, $TextField, $NumberTicker, $Popover } from "@aelea/ui-components"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import {
  ARBITRUM_ADDRESS, formatFixed, readableNumber, parseFixed, formatReadableUSD, BASIS_POINTS_DIVISOR,
  ITokenDescription, LIMIT_LEVERAGE, bnDiv, replayState,
  div, StateStream, getPnL, MIN_LEVERAGE, formatToBasis, ARBITRUM_ADDRESS_STABLE, AVALANCHE_ADDRESS_STABLE, CHAIN,
  ITokenInput, ITokenIndex, ITokenStable, AddressZero, parseReadableNumber, getTokenUsd, IPricefeed, TRADE_CONTRACT_MAPPING, getTokenAmount, filterNull, ITradeOpen
} from "@gambitdao/gmx-middleware"
import { $anchor, $bear, $bull, $infoTooltip, $IntermediatePromise, $tokenIconMap, $tokenLabelFromSummary, $Tooltip } from "@gambitdao/ui-components"
import {
  merge, multicast, mergeArray, now, snapshot, map, switchLatest,
  skipRepeats, empty, fromPromise, constant, startWith, skipRepeatsWith, awaitPromises, delay, debounce
} from "@most/core"
import { Stream } from "@most/types"
import { $Slider } from "../$Slider"
import { $ButtonPrimary, $ButtonPrimaryCtx, $ButtonSecondary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $caretDown } from "../../elements/$icons"
import { CHAIN_ADDRESS_MAP, getTokenDescription, resolveAddress } from "../../logic/utils"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { BrowserStore } from "../../logic/store"
import { connectTrade, getErc20Balance, IPositionGetter } from "../../logic/contract/trade"
import { MouseEventParams } from "lightweight-charts"
import { $TradePnlHistory } from "./$TradePnlHistory"
import { ContractTransaction } from "@ethersproject/contracts"
import { MaxUint256 } from "@ethersproject/constants"
import { getContractAddress } from "../../logic/common"
import { ERC20__factory } from "../../logic/contract/gmx-contracts"
import { IWalletLink, IWalletName } from "@gambitdao/wallet-link"

export enum ITradeFocusMode {
  collateral,
  size,
}

export interface ITradeParams {
  position: IPositionGetter | null
  isTradingEnabled: boolean
  isIndexTokenApproved: boolean

  inputTokenPrice: bigint
  collateralTokenPrice: bigint
  // availableLiquidityUsd: bigint
  indexTokenPrice: bigint
  walletBalance: bigint

  swapFee: bigint
  marginFee: bigint
  executionFee: bigint
  fee: bigint

  collateralDelta: bigint
  sizeDelta: bigint

  inputTokenDescription: ITokenDescription
  indexTokenDescription: ITokenDescription
  collateralTokenDescription: ITokenDescription

  averagePrice: bigint | null
  liquidationPrice: bigint | null
}

export interface ITradeConfig {
  isLong: boolean

  inputToken: ITokenInput
  shortCollateralToken: ITokenStable
  indexToken: ITokenIndex
  isIncrease: boolean
  focusMode: ITradeFocusMode

  leverage: bigint

  sizeDeltaUsd: bigint
  collateralDeltaUsd: bigint


  slippage: string
}


export interface ITradeState extends ITradeConfig, ITradeParams {

}

interface ITradeBox {
  referralCode: string
  walletLink: IWalletLink

  chainList: CHAIN[],
  tokenIndexMap: Partial<Record<CHAIN, ITokenIndex[]>>
  tokenStableMap: Partial<Record<CHAIN, ITokenStable[]>>
  store: BrowserStore<"ROOT.v1.trade", string>

  tradeConfig: StateStream<ITradeConfig> // ITradeParams
  tradeState: StateStream<ITradeParams>

  pricefeed: Stream<Promise<IPricefeed[]>>
  trade: Stream<Promise<ITradeOpen | null>>
}

export type RequestTradeQuery = {
  ctxQuery: Promise<ContractTransaction>
  state: ITradeState
  acceptablePrice: bigint
}

const BOX_SPACING = 20
const LIMIT_LEVERAGE_NORMAL = formatToBasis(LIMIT_LEVERAGE)

export const $TradeBox = (config: ITradeBox) => component((
  [openEnableTradingPopover, openEnableTradingPopoverTether]: Behavior<any, any>,
  [enableTrading, enableTradingTether]: Behavior<any, boolean>,
  [approveInputToken, approveInputTokenTether]: Behavior<PointerEvent, boolean>,
  [clickEnablePlugin, clickEnablePluginTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,

  [dismissEnableTradingOverlay, dismissEnableTradingOverlayTether]: Behavior<false, false>,

  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,

  [switchFocusMode, switchFocusModeTether]: Behavior<any, ITradeFocusMode>,

  [inputCollateralDeltaUsd, inputCollateralDeltaUsdTether]: Behavior<INode, bigint>,
  [inputSizeDeltaUsd, inputSizeDeltaUsdTether]: Behavior<INode, bigint>,

  [changeInputToken, changeInputTokenTether]: Behavior<ITokenInput, ITokenInput>,
  [changeIndexToken, changeIndexTokenTether]: Behavior<ITokenIndex, ITokenIndex>,
  [changeCollateralToken, changeCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE, ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE>,

  [switchIsIncrease, switchisIncreaseTether]: Behavior<boolean, boolean>,
  [slideLeverage, slideLeverageTether]: Behavior<number, bigint>,
  [changeSlippage, changeSlippageTether]: Behavior<string, string>,

  [walletChange, walletChangeTether]: Behavior<IWalletName, IWalletName>,
  [changeNetwork, changeNetworkTether]: Behavior<CHAIN, CHAIN>,

  [clickRequestTrade, clickRequestTradeTether]: Behavior<PointerEvent, RequestTradeQuery>,

  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [resetTradeMode, resetTradeModeTether]: Behavior<any, any>,
  [clickMax, clickMaxTether]: Behavior<any, any>,


) => {

  const trade = connectTrade(config.walletLink)
  const position = connectTrade(config.walletLink)

  const tradeState: Stream<ITradeState> = replayState({ ...config.tradeState, ...config.tradeConfig })


  const validationError = map((state) => {

    if (state.leverage > LIMIT_LEVERAGE) {
      return `Leverage exceeds ${formatToBasis(LIMIT_LEVERAGE)}x`
    }

    if (state.isIncrease) {
      if (state.collateralDelta > (state.walletBalance + state.executionFee)) {
        return `Not enough ${state.inputTokenDescription.symbol} in connected account`
      }

      if (state.leverage < MIN_LEVERAGE) {
        return `Leverage below 1.1x`
      }

    }

    if (!state.isIncrease && !state.position) {
      return `No ${state.indexTokenDescription.symbol} position to reduce`
    }

    if (state.position && state.liquidationPrice && (state.isLong ? state.liquidationPrice > state.indexTokenPrice : state.liquidationPrice < state.indexTokenPrice)) {
      return `Exceeding liquidation price`
    }

    return null
  }, tradeState)


  const clickMaxCollateralUsd = snapshot(state => {

    if (state.isIncrease) {
      return getTokenUsd(state.walletBalance, state.inputTokenPrice, state.inputTokenDescription.decimals)
    }

    if (!state.position) {
      return 0n
    }

    const collateral = div(state.position.size, LIMIT_LEVERAGE)
    const deltaUsd = collateral - state.position.collateral

    return deltaUsd
  }, tradeState, clickMax)

  const clickMaxBalanceSizeDelta = snapshot((state, maxCollateral) => {
    if (state.position && state.isIncrease === false) {
      return 0n
    }

    const leverageCapped = state.leverage > LIMIT_LEVERAGE ? LIMIT_LEVERAGE : state.leverage
    const collateral = state.position?.collateral || 0n
    const totalCollateralUsd = maxCollateral + collateral
    const sizeUsd = totalCollateralUsd * leverageCapped / BASIS_POINTS_DIVISOR

    const newLocal = sizeUsd - (state.position?.size || 0n)
    return newLocal
  }, tradeState, clickMaxCollateralUsd)

  const slideCollateralLeverage = switchLatest(map((focus) => focus === ITradeFocusMode.collateral ? slideLeverage : empty(), config.tradeConfig.focusMode))

  const leverageCollateralFocus = skipRepeats(snapshot((state, leverage) => {
    if (!state.position) {
      const adjustedCollateral = div(state.sizeDeltaUsd, leverage)

      return adjustedCollateral
    }

    const totalSize = state.sizeDeltaUsd + state.position.size
    const collateral = div(totalSize, leverage)
    const deltaUsd = collateral - state.position.collateral

    const currentMultiplier = div(totalSize, state.position.collateral)

    const multiplierDelta = state.isIncrease ? currentMultiplier - leverage : leverage - currentMultiplier

    if (multiplierDelta < 50) {
      return 0n
    }

    return deltaUsd
  }, tradeState, slideCollateralLeverage))


  const slideSizeLeverage = switchLatest(map((focus) => focus === ITradeFocusMode.size ? slideLeverage : empty(), config.tradeConfig.focusMode))

  const leverageSizeFocus = skipRepeats(snapshot((state, leverage) => {
    if (!state.position) {
      const leverageSizeUsd = state.collateralDeltaUsd * leverage / BASIS_POINTS_DIVISOR

      return leverageSizeUsd
    }


    const totalCollateralUsd = state.collateralDeltaUsd + state.position.collateral
    const toSizeUsd = totalCollateralUsd * leverage / BASIS_POINTS_DIVISOR

    const currentMultiplier = div(state.position.size, totalCollateralUsd)
    const multiplierDelta = state.isIncrease ? leverage - currentMultiplier : currentMultiplier - leverage
    const adjustedDeltaUsd = toSizeUsd - state.position.size

    if (multiplierDelta < 50) {
      return 0n
    }

    return adjustedDeltaUsd
  }, tradeState, slideSizeLeverage))

  const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))

  const pnlCrossHairTime = map((cross: MouseEventParams) => {
    if (cross) {
      return cross.seriesPrices.values().next().value
    }

    return null
  }, pnlCrossHairTimeChange)

  const clickResetVal = constant(0n, resetTradeMode)

  const inTradeMode = replayLatest(multicast(combineArray((sizeDeltaUsd, collateralDeltaUsd) => {
    if (sizeDeltaUsd === 0n && collateralDeltaUsd === 0n) {
      return false
    }

    return true
  }, config.tradeConfig.sizeDeltaUsd, config.tradeConfig.collateralDeltaUsd)))

  const autoFillCollateralOnSizeInput = filterNull(snapshot((state, val) => {
    if (!state.isIncrease) {
      return null
    }

    if (state.position) {
      const totalSize = val + state.position.size

      return div(totalSize, state.leverage) - state.position.collateral
    }


    return div(val, state.leverage)
  }, tradeState, inputSizeDeltaUsd))

  const autoFillSizeOnCollateralInput = filterNull(snapshot((state, val) => {
    if (!state.isIncrease) {
      return null
    }

    if (state.position) {
      const totalCollateral = val + state.position.collateral

      return totalCollateral * state.leverage / BASIS_POINTS_DIVISOR - state.position.size
    }

    return val * state.leverage / BASIS_POINTS_DIVISOR
  }, tradeState, inputCollateralDeltaUsd))



  return [
    $column(style({ borderRadius: `${BOX_SPACING}px`, boxShadow: `2px 2px 13px 3px #00000040`, padding: 0, margin: screenUtils.isMobileScreen ? '0 10px' : '' }))(
      // $row(
      //   // styleInline(map(isIncrease => isIncrease ? { borderColor: 'none' } : {}, config.tradeConfig.isIncrease)),
      //   style({
      //     height: `80px`,
      //     padding: '0 16px',
      //     marginBottom: `-${BOX_SPACING}`,
      //     paddingBottom: `${BOX_SPACING}`,
      //     placeContent: 'space-between',
      //     alignItems: 'center',
      //     // backgroundColor: pallete.horizon,
      //     border: `1px solid ${colorAlpha(pallete.foreground, .15)}`,
      //     // borderTop: 'none',
      //     borderRadius: `${BOX_SPACING} ${BOX_SPACING} 0px 0px`,
      //   })
      // )(

      //   $ButtonToggle({
      //     $container: $row(layoutSheet.spacingSmall),
      //     selected: config.tradeConfig.isLong,
      //     options: [
      //       true,
      //       false,
      //     ],
      //     $$option: map(isLong => {
      //       return $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
      //         $icon({ $content: isLong ? $bull : $bear, width: '18px', viewBox: '0 0 32 32' }),
      //         $text(isLong ? 'Long' : 'Short'),
      //       )
      //     })
      //   })({ select: switchIsLongTether() }),

      //   $ButtonToggle({
      //     $container: $row(layoutSheet.spacingSmall),
      //     selected: config.tradeConfig.isIncrease,
      //     options: [
      //       true,
      //       false,
      //     ],
      //     $$option: map(option => {
      //       return $text(style({}))(option ? 'Deposit' : 'Withdraw')
      //     })
      //   })({ select: switchisIncreaseTether() }),




      // ),

      $column(style({ borderRadius: `${BOX_SPACING}px`, backgroundColor: theme.name === 'dark' ? pallete.horizon : colorAlpha(pallete.horizon, .3) }))(

        $column(layoutSheet.spacingSmall, style({ padding: '16px', borderRadius: '20px 20px 0 0', border: `1px solid ${colorAlpha(pallete.foreground, .15)}` }),
          styleInline(now({ borderBottom: 'none' })),
          styleInline(combineArray((focus, isIncrease) => {
            return focus === ITradeFocusMode.collateral ? { borderColor: isIncrease ? `${pallete.middleground}` : `${pallete.indeterminate}` } : { borderColor: '' }
          }, config.tradeConfig.focusMode, config.tradeConfig.isIncrease))
        )(
          $row(
            $hintInput(
              now(`Collateral`),
              config.tradeConfig.isIncrease,
              'The amount you will deposit to open a leverage position',
              map(pos => formatReadableUSD(pos?.collateral || 0n), config.tradeState.position),
              combineArray(params => {
                const posCollateral = params.position?.collateral || 0n
                const totalCollateral = posCollateral + params.collateralDeltaUsd

                if (params.isIncrease) {
                  return formatReadableUSD(totalCollateral - params.fee)
                }

                if (!params.position) {
                  return formatReadableUSD(0n)
                }

                const pnl = getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, params.position.size)
                const adjustedPnlDelta = pnl < 0n
                  ? -div(params.sizeDeltaUsd * pnl, params.position.size) / BASIS_POINTS_DIVISOR
                  : 0n

                const netCollateral = totalCollateral + adjustedPnlDelta

                return formatReadableUSD(netCollateral)
              }, tradeState)
            ),
            $node(style({ flex: 1 }))(),
            $row(
              layoutSheet.spacingTiny,
              clickMaxTether(nodeEvent('click')),
              style({ fontSize: '0.75em' })
            )(
              $text(style({ color: pallete.foreground }))(`Balance`),
              $text(style({ cursor: 'pointer' }))(
                combineArray((tokenDesc, balance) => {
                  return readableNumber(formatFixed(balance, tokenDesc.decimals)) + ` ${tokenDesc.symbol}`
                }, config.tradeState.inputTokenDescription, config.tradeState.walletBalance)
              ),
            ),
          ),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(

            $field(
              O(
                map(node =>
                  merge(
                    now(node),
                    filterNull(snapshot((params, val) => {
                      if (val === 0n) {
                        node.element.value = ''
                      } else {
                        const amount = getTokenAmount(val, params.inputTokenPrice, params.inputTokenDescription.decimals)
                        const formatted = formatFixed(amount, params.inputTokenDescription.decimals)

                        node.element.value = readableNumber(formatted)
                      }

                      return null
                    }, tradeState, mergeArray([clickResetVal, leverageCollateralFocus, clickMaxCollateralUsd, autoFillCollateralOnSizeInput])))
                  )
                ),
                switchLatest
              ),
              // styleInline(map(focus => focus === ITradeFocusMode.collateral ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(nodeEvent('focus'), constant(ITradeFocusMode.collateral)),
              inputCollateralDeltaUsdTether(nodeEvent('input'), src => snapshot((params, inputEvent) => {
                const target = inputEvent.target

                if (!(target instanceof HTMLInputElement)) {
                  throw new Error('Target is not type of input')
                }

                if (target.value === '') {
                  return 0n
                }

                const val = parseReadableNumber(target.value)
                const parsedInput = parseFixed(val, params.inputTokenDescription.decimals)
                const tokenUsd = getTokenUsd(parsedInput, params.inputTokenPrice, params.inputTokenDescription.decimals)
                return tokenUsd
              }, tradeState, src)),
            )(),

            $Dropdown({
              // $container: $row(style({ position: 'relative', alignSelf: 'center',  })),
              $selection: switchLatest(combineArray((isIncrease) => {
                return $row(
                  stylePseudo(':hover', { borderColor: `${pallete.primary}` }),
                  style({
                    alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '.75em',
                    border: `1px solid ${isIncrease ? pallete.middleground : pallete.indeterminate}`, padding: '6px 12px', borderRadius: '12px'
                  })
                )(
                  $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                    // $icon({
                    //   $content: $bagOfCoins,
                    //   svgOps: styleBehavior(map(isIncrease => ({ fill: isIncrease ? pallete.message : pallete.indeterminate }), config.tradeConfig.isIncrease)),
                    //   width: '18px', viewBox: '0 0 32 32'
                    // }),
                    $text(isIncrease ? 'Deposit' : 'Withdraw'),
                    $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px', marginRight: '-5px' }), viewBox: '0 0 32 32' }),
                  )
                )
              }, config.tradeConfig.isIncrease)),
              value: {
                value: config.tradeConfig.isIncrease,
                $container: $defaultSelectContainer(style({ minWidth: '100px', right: 0 })),
                $$option: map((isIncrease) => {
                  return $text(style({ fontSize: '0.85em' }))(isIncrease ? 'Deposit' : 'Withdraw')
                }),
                list: [
                  true,
                  false,
                ],
              }
            })({
              select: switchisIncreaseTether()
            }),

            // $ButtonToggle({
            //   $container: $row(layoutSheet.spacingSmall),
            //   selected: config.tradeConfig.isIncrease,
            //   options: [
            //     true,
            //     false,
            //   ],
            //   $$option: map(option => {
            //     return $text(style({}))(option ? 'Deposit' : 'Withdraw')
            //   })
            // })({ select: switchisIncreaseTether() }),

            switchLatest(map((w3p) => {
              const chain = w3p ? w3p.chain : CHAIN.ARBITRUM

              return $Dropdown<ITokenInput>({
                $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                  switchLatest(map(option => {
                    return $icon({
                      $content: $tokenIconMap[option.symbol],
                      svgOps: styleBehavior(map(isIncrease => ({ fill: isIncrease ? pallete.message : pallete.indeterminate }), config.tradeConfig.isIncrease)),
                      width: '34px', viewBox: '0 0 32 32'
                    })
                  }, config.tradeState.inputTokenDescription)),
                  $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
                ),
                value: {
                  value: config.tradeConfig.inputToken,
                  $container: $defaultSelectContainer(style({ minWidth: '300px', right: 0 })),
                  $$option: map((option) => {
                    const balanceAmount = fromPromise(getErc20Balance(option, w3p))
                    const tokenDesc = getTokenDescription(chain, option)

                    return $row(style({ placeContent: 'space-between', flex: 1 }))(
                      $tokenLabelFromSummary(tokenDesc),
                      $text(map(bn => readableNumber(formatFixed(bn, tokenDesc.decimals)), balanceAmount))
                    )
                  }),
                  list: [
                    AddressZero,
                    ...config.tokenIndexMap[chain] || [],
                    ...config.tokenStableMap[chain] || [],
                  ],
                }
              })({
                select: changeInputTokenTether()
              })
            }, config.walletLink.wallet)),
          ),
        ),

        $column(style({ height: `2px`, placeContent: 'center' }))(
          $Slider({
            value: map(leverage => {
              if (leverage === null) {
                return 0
              }

              const multiplier = bnDiv(leverage, LIMIT_LEVERAGE)

              return multiplier
            }, config.tradeConfig.leverage),
            // disabled: map(state => {

            //   if (state.trade === null) {
            //     return !state.isIncrease || state.collateralDelta === 0n
            //   }

            //   return false
            // }, tradeState),
            color: map(isIncrease => isIncrease ? pallete.middleground : pallete.indeterminate, config.tradeConfig.isIncrease),
            min: map((state) => {
              if (state.isIncrease) {


                if (state.position) {
                  if (state.focusMode === ITradeFocusMode.collateral) {
                    return bnDiv(MIN_LEVERAGE, LIMIT_LEVERAGE)
                  }

                  const totalCollateral = state.collateralDeltaUsd + state.position.collateral

                  return bnDiv(div(state.position.size, totalCollateral), LIMIT_LEVERAGE)
                }

                return 0
              }

              if (state.focusMode === ITradeFocusMode.collateral) {
                const totalSize = state.sizeDeltaUsd + (state.position?.size || 0n)

                if (state.position) {
                  return bnDiv(div(totalSize, state.position.collateral), LIMIT_LEVERAGE)
                }

                return 0
              }



              return 0
            }, tradeState),
            max: map(state => {

              if (!state.position) {
                return 1
              }


              const totalSize = state.position.size + state.sizeDeltaUsd

              if (state.isIncrease) {
                if (state.focusMode === ITradeFocusMode.collateral) {

                  // return 1
                  const ratio = div(totalSize, state.position.collateral)
                  const newLocal = bnDiv(ratio, LIMIT_LEVERAGE)
                  console.log(newLocal)
                  return newLocal
                }

                return 1
              } else {
                if (state.focusMode === ITradeFocusMode.size) {
                  const totalCollateral = state.position.collateral + state.collateralDeltaUsd
                  const ratio = div(state.position.size, totalCollateral)

                  return bnDiv(ratio, LIMIT_LEVERAGE)
                }
              }

              return 1
            }, tradeState),
            thumbText: map(n => formatLeverageNumber.format(n * LIMIT_LEVERAGE_NORMAL) + '\nx')
          })({
            change: slideLeverageTether(
              map(leverage => {
                const leverageRatio = BigInt(Math.round(Math.abs(leverage) * Number(LIMIT_LEVERAGE)))

                return leverageRatio
              }),
              multicast,
              skipRepeats
            )
          }),
        ),


        $column(layoutSheet.spacingSmall, style({ padding: '16px', borderRadius: '0 0 20px 20px', border: `1px solid ${colorAlpha(pallete.foreground, .15)}` }),
          styleInline(now({ borderTopStyle: 'none' })),
          // style({ backgroundColor: pallete.horizon, padding: '12px', border: `1px solid ${colorAlpha(pallete.foreground, .15)}` }),

          styleInline(combineArray((focus, isIncrease) => {
            return focus === ITradeFocusMode.size ? { borderColor: isIncrease ? `${pallete.middleground}` : `${pallete.indeterminate}` } : { borderColor: '' }
          }, config.tradeConfig.focusMode, config.tradeConfig.isIncrease))
        )(
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(

            $field(
              O(
                map(node =>
                  merge(
                    now(node),
                    filterNull(snapshot((params, value) => {
                      if (value === 0n) {
                        node.element.value = ''
                      } else {
                        const amount = getTokenAmount(value, params.indexTokenPrice, params.indexTokenDescription.decimals)
                        node.element.value = readableNumber(formatFixed(amount, params.indexTokenDescription.decimals))
                      }

                      return null
                    }, tradeState, mergeArray([clickResetVal, leverageSizeFocus, clickMaxBalanceSizeDelta, inputCollateralDeltaUsd, autoFillSizeOnCollateralInput])))
                  )
                ),
                switchLatest
              ),
              // styleInline(map(focus => focus === ITradeFocusMode.size ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(nodeEvent('focus'), constant(ITradeFocusMode.size)),
              inputSizeDeltaUsdTether(nodeEvent('input'), src => snapshot((state, inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  throw new Error('Target is not type of input')
                }

                if (target.value === '') {
                  return 0n
                }

                const decimals = state.indexTokenDescription.decimals
                const parsedInput = parseFixed(parseReadableNumber(target.value), decimals)

                return getTokenUsd(parsedInput, state.indexTokenPrice, decimals)
              }, tradeState, src))
            )(),

            $Dropdown({
              $container: $row(stylePseudo(':hover', { borderColor: `${pallete.primary}` }), style({ position: 'relative', alignSelf: 'center', border: `1px solid ${pallete.middleground}`, padding: '6px 12px', borderRadius: '12px' })),
              $selection: $row(style({ alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '.75em' }))(
                switchLatest(map(isLong => {
                  return $row(layoutSheet.spacingTiny)(
                    $icon({ $content: isLong ? $bull : $bear, width: '18px', viewBox: '0 0 32 32' }),
                    $text(isLong ? 'Long' : 'Short'),
                  )
                }, config.tradeConfig.isLong)),
                $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px', marginRight: '-5px' }), viewBox: '0 0 32 32' }),
              ),
              value: {
                value: config.tradeConfig.isLong,
                $container: $defaultSelectContainer(style({ minWidth: '100px', right: 0 })),
                $$option: map((isLong) => {
                  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $icon({ $content: isLong ? $bull : $bear, width: '18px', viewBox: '0 0 32 32' }),
                    $text(isLong ? 'Long' : 'Short'),
                  )
                }),
                list: [
                  true,
                  false,
                ],
              }
            })({
              select: switchIsLongTether()
            }),


            // $ButtonToggle({
            //   $container: $row(layoutSheet.spacingSmall),
            //   selected: config.tradeConfig.isLong,
            //   options: [
            //     true,
            //     false,
            //   ],
            //   $$option: map(isLong => {
            //     return $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
            //       $icon({ $content: isLong ? $bull : $bear, width: '18px', viewBox: '0 0 32 32' }),
            //       $text(isLong ? 'Long' : 'Short'),
            //     )
            //   })
            // })({ select: switchIsLongTether() }),


            switchLatest(map(chain => {
              return $Dropdown<ITokenIndex>({
                $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                  switchLatest(map(option => {
                    const tokenDesc = getTokenDescription(chain, option)

                    return $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', viewBox: '0 0 32 32' })
                  }, config.tradeConfig.indexToken)),
                  $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
                ),
                value: {
                  value: config.tradeConfig.indexToken,
                  $container: $defaultSelectContainer(style({ minWidth: '300px', right: 0 })),
                  $$option: snapshot((isLong, option) => {

                    // @ts-ignore
                    const token = CHAIN_ADDRESS_MAP[chain] === option ? AddressZero : option

                    const tokenDesc = getTokenDescription(chain, token)
                    // const availableLiquidityUsd = vault.getAvailableLiquidityUsd(chain, option, isLong)

                    return $row(style({ placeContent: 'space-between', flex: 1 }))(
                      $tokenLabelFromSummary(tokenDesc),
                      // $text(map(amountUsd => formatReadableUSD(amountUsd), availableLiquidityUsd))
                    )
                  }, config.tradeConfig.isLong),
                  list: config.tokenIndexMap[chain] || [],
                }
              })({
                select: changeIndexTokenTether()
              })
            }, config.walletLink.network)),
          ),

          $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between', padding: '0' }))(
            $hintInput(
              now(`Size`),
              config.tradeConfig.isIncrease,
              'Amount amplified relative to collateral, higher Size to Collateral means higher risk of being liquidated',
              map(pos => formatReadableUSD(pos ? pos.size : 0n), config.tradeState.position),

              map((params) => {
                const totalSize = params.sizeDeltaUsd + (params.position?.size || 0n)

                return formatReadableUSD(totalSize)
              }, tradeState)
            ),
            $node(style({ flex: 1 }))(),
            switchLatest(combineArray((chain, isLong, indexToken) => {
              if (isLong) {
                const tokenDesc = getTokenDescription(chain, indexToken)

                return $row(layoutSheet.spacing, style({ fontSize: '.75em', alignItems: 'center' }))(
                  $row(layoutSheet.spacingTiny)(
                    $text(style({ color: pallete.foreground }))('Indexed In'),
                    $infoTooltip(`${tokenDesc.symbol} will be borrowed to maintain a Long Position`),
                  ),
                  $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                    $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                    $text(tokenDesc.symbol)
                  )
                )
              }

              return $row(layoutSheet.spacing)(
                $row(layoutSheet.spacingTiny, style({ fontSize: '.75em', alignItems: 'center' }))(
                  $text(style({ color: pallete.foreground }))('Indexed In'),
                  $infoTooltip(map(token => `${getTokenDescription(chain, token).symbol} will be borrowed to maintain a Short Position. you can switch with other USD tokens to receive it later`, config.tradeConfig.shortCollateralToken)),
                ),
                $Dropdown<ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE>({
                  $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                  $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                    switchLatest(combineArray((collateralToken) => {
                      const tokenDesc = getTokenDescription(chain, collateralToken)

                      return $row(layoutSheet.spacingTiny, style({ fontSize: '.75em', alignItems: 'center' }))(
                        $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                        $text(tokenDesc.symbol)
                      )
                    }, config.tradeConfig.shortCollateralToken)),
                    $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
                  ),
                  value: {
                    value: config.tradeConfig.shortCollateralToken,
                    $container: $defaultSelectContainer(style({ minWidth: '300px', right: 0 })),
                    $$option: map(option => {
                      const tokenDesc = getTokenDescription(chain, option)

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
              )
            }, config.walletLink.network, config.tradeConfig.isLong, config.tradeConfig.indexToken)),

          ),
        ),

      ),

      $column(style({
        height: `120px`,
        marginTop: `-${BOX_SPACING - 5}px`,
        paddingTop: `${BOX_SPACING}px`,
        // backgroundColor: pallete.horizon,
        border: `1px solid ${colorAlpha(pallete.foreground, .15)}`,
        borderTop: 'none',
        // borderTop: 'none',
        borderRadius: `0px 0px ${BOX_SPACING}px ${BOX_SPACING}px`,
      }))(
        $IntermediateConnectButton({
          chainList: config.chainList,
          primaryButtonConfig: {
            $container: $element('button')(style({ margin: 'auto', alignSelf: 'center', placeSelf: 'center' })),
            // $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            //   $text('Connect To Trade'),
            //   $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '16px', fill: pallete.background, svgOps: style({ marginTop: '2px' }) }),
            // )
          },
          // $button: style({
          //   alignSelf: 'center'
          // })($ButtonPrimary({
          //   $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
          //     $text('Connect To Trade'),
          //     $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '16px', fill: pallete.background, svgOps: style({ marginTop: '2px' }) }),
          //   )
          // })({})),
          $$display: map(w3p => {

            const routerContractAddress = getContractAddress(TRADE_CONTRACT_MAPPING, w3p.chain, 'Router')
            const positionRouterAddress = getContractAddress(TRADE_CONTRACT_MAPPING, w3p.chain, 'PositionRouter')



            return $column(style({ flex: 1 }))(

              $column(layoutSheet.spacing, style({ padding: '16px', placeContent: 'space-between' }), styleInline(map(mode => ({ display: mode ? 'flex' : 'none' }), inTradeMode)))(
                // $column(layoutSheet.spacingSmall)(


                // ),

                $row(
                  layoutSheet.spacing,
                  style({ placeContent: 'space-between', alignItems: 'center' }),
                )(
                  $column(layoutSheet.spacingTiny)(
                    $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em', placeContent: 'space-between' }))(
                      $Tooltip({
                        $anchor: $text(style({ color: pallete.foreground }))('Fees'),
                        $content: switchLatest(map(params => {
                          const depositTokenNorm = resolveAddress(w3p.chain, params.inputToken)
                          const outputToken = params.isLong ? params.indexToken : params.shortCollateralToken

                          return $column(
                            depositTokenNorm !== outputToken ? $row(layoutSheet.spacingTiny)(
                              $text(style({ color: pallete.foreground }))('Swap'),
                              $text(formatReadableUSD(params.swapFee))
                            ) : empty(),
                            $row(layoutSheet.spacingTiny)(
                              $text(style({ color: pallete.foreground }))('Margin'),
                              $text(formatReadableUSD(params.marginFee))
                            )
                          )
                        }, tradeState))
                      })({}),
                      $text(style({ color: pallete.negative }))(map(params => formatReadableUSD(params.fee), tradeState))
                    ),
                    $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em', placeContent: 'space-between' }))(
                      $Tooltip({
                        $anchor: $text(style({ color: pallete.foreground }))('Discount'),
                        $content: switchLatest(map(params => {

                          return $column(
                            $text(style({ color: pallete.foreground }))('BLUEBERRY Referral applied for 10% discount'),
                            // depositTokenNorm !== params.indexToken ? $row(layoutSheet.spacingTiny)(
                            //   $text(style({ color: pallete.foreground }))('Swap'),
                            //   $text(getRebateDiscountUsd(params.swapFee))
                            // ) : empty(),
                            // $row(layoutSheet.spacingTiny)(
                            //   $text(style({ color: pallete.foreground }))('Margin'),
                            //   $text(getRebateDiscountUsd(params.marginFee))
                            // )
                          )
                        }, tradeState))
                      })({}),
                      $text(style({ color: pallete.positive }))(map(params => getRebateDiscountUsd(params.marginFee), tradeState))
                    ),

                    $TextField({
                      label: 'Slippage %',
                      value: config.tradeConfig.slippage,
                      inputOp: style({ width: '60px', textAlign: 'right', fontWeight: 'normal' }),
                      validation: map(n => {
                        const val = Number(n)
                        const valid = val >= 0
                        if (!valid) {
                          return 'Invalid Basis point'
                        }

                        if (val > 5) {
                          return 'Slippage should be less than 5%'
                        }

                        return null
                      }),
                    })({
                      change: changeSlippageTether()
                    }),
                  ),

                  $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(

                    style({ padding: '8px', fontSize: '.75em', alignSelf: 'center' })(
                      $ButtonSecondary({ $content: $text('Reset') })({
                        click: resetTradeModeTether()
                      })
                    ),

                    switchLatest(combineArray((isPluginEnabled, isEnabled, isInputTokenApproved, indexToken, indexTokenDesc) => {
                      if (!isPluginEnabled || !isEnabled) {
                        return $Popover({
                          $$popContent: map(() => {

                            return $column(layoutSheet.spacing, style({ maxWidth: '400px' }))(
                              $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))(`By using GBC Trading, I agree to the following Disclaimer`),
                              $text(style({ whiteSpace: 'pre-wrap', fontSize: '.75em' }))(`By accessing, I agree that ${document.location.href} is an interface (hereinafter the "Interface") to interact with external GMX smart contracts, and does not have access to my funds.`),
                              $node(
                                $text(style({ whiteSpace: 'pre-wrap', fontSize: '.75em' }))(`By clicking Agree you accept the `),
                                $anchor(attr({ href: '/p/trading-terms-and-conditions' }))($text('Terms & Conditions'))
                              ),

                              !isPluginEnabled
                                ? $ButtonPrimaryCtx({
                                  ctx: clickEnablePlugin,
                                  $content: $text(!isPluginEnabled ? 'Enable Leverage(GMX) & Agree' : 'Agree')
                                })({
                                  click: clickEnablePluginTether(
                                    snapshot((c) => {
                                      return c.approvePlugin(positionRouterAddress)
                                    }, trade.router.contract),
                                    multicast
                                  )
                                })
                                : $ButtonPrimary({
                                  $content: $text('Agree')
                                })({
                                  click: enableTradingTether(
                                    constant(true)
                                  )
                                })
                            )
                          }, openEnableTradingPopover),
                        })(
                          $row(
                            $ButtonSecondary({
                              $content: $text('Enable Trading'),
                              disabled: mergeArray([
                                dismissEnableTradingOverlay,
                                openEnableTradingPopover
                              ])
                            })({
                              click: openEnableTradingPopoverTether()
                            })
                          )
                        )({
                          overlayClick: dismissEnableTradingOverlayTether(constant(false))
                        })
                      }

                      if (!isInputTokenApproved) {

                        return $ButtonPrimary({
                          $content: $text(`Approve ${indexTokenDesc.symbol}`)
                        })({
                          click: approveInputTokenTether(
                            map(async (c) => {
                              const erc20 = ERC20__factory.connect(indexToken, w3p.signer)

                              if (c === null) {
                                return false
                              }

                              await (await erc20.approve(routerContractAddress, MaxUint256)).wait()

                              return true
                            }),
                            awaitPromises
                          )
                        })
                      }

                      return $ButtonPrimaryCtx({
                        ctx: map(req => req.ctxQuery, clickRequestTrade),
                        disabled: combineArray((error, params) => {

                          if (error) {
                            return true
                          }

                          return false
                        }, validationError, tradeState),
                        $content: $text(map(params => {
                          const outputToken = getTokenDescription(w3p.chain, params.indexToken)

                          let modLabel: string

                          if (params.position) {
                            if (params.isIncrease) {
                              modLabel = 'Increase'
                            } else {
                              modLabel = (params.sizeDeltaUsd + params.position.size === 0n) ? 'Close' : 'Reduce'
                            }
                          } else {
                            modLabel = 'Open'
                          }

                          return modLabel
                          // if (screenUtils.isMobileScreen) {
                          //   return modLabel
                          // }

                          // return `${modLabel} ${params.isLong ? 'Long' : 'Short'} ${outputToken.symbol}`
                        }, tradeState)),
                        alert: validationError
                      })({
                        click: clickRequestTradeTether(
                          snapshot(({ state, trade }) => {
                            const signer = trade.signer

                            if (signer === null) {
                              throw new Error('Signer does not exists')
                            }

                            const inputAddress = resolveAddress(w3p.chain, state.inputToken)
                            const outputToken = state.isLong ? state.indexToken : state.shortCollateralToken

                            const path = state.isIncrease
                              ? inputAddress === outputToken ? [state.indexToken] : [inputAddress, outputToken]
                              : inputAddress === outputToken ? [state.indexToken] : [outputToken, inputAddress]

                            const slippageN = BigInt(Number(state.slippage) * 100)
                            const allowedSlippage = state.isLong ? state.isIncrease ? slippageN : -slippageN : state.isIncrease ? -slippageN : slippageN

                            const refPrice = state.isLong ? state.indexTokenPrice : state.indexTokenPrice
                            const priceBasisPoints = BASIS_POINTS_DIVISOR + allowedSlippage // state.isLong ? BASIS_POINTS_DIVISOR + allowedSlippage : BASIS_POINTS_DIVISOR - allowedSlippage

                            const acceptablePrice = refPrice * priceBasisPoints / BASIS_POINTS_DIVISOR



                            const isNative = state.inputToken === AddressZero

                            const ctxQuery = state.isIncrease
                              ? (isNative
                                ? trade.createIncreasePositionETH(
                                  path,
                                  state.indexToken,
                                  0,
                                  state.sizeDeltaUsd,
                                  state.isLong,
                                  acceptablePrice,
                                  state.executionFee,
                                  config.referralCode,
                                  AddressZero,
                                  { value: state.collateralDelta + state.executionFee }
                                )
                                : trade.createIncreasePosition(
                                  path,
                                  state.indexToken,
                                  state.collateralDelta,
                                  0,
                                  state.sizeDeltaUsd,
                                  state.isLong,
                                  acceptablePrice,
                                  state.executionFee,
                                  config.referralCode,
                                  AddressZero,
                                  { value: state.executionFee }
                                ))
                              : trade.createDecreasePosition(
                                path,
                                state.indexToken,
                                // flip values. Contract code is using `uint` integers
                                -state.collateralDelta,
                                -state.sizeDeltaUsd,

                                state.isLong,
                                w3p.address,
                                acceptablePrice,
                                0,
                                state.executionFee,
                                isNative,
                                AddressZero,
                                { value: state.executionFee }
                              )

                            ctxQuery.catch(err => {
                              console.error(err)
                            })


                            return { ctxQuery, state, acceptablePrice }
                          }, combineObject({ trade: position.positionRouter.contract, state: tradeState })),
                          multicast
                        )
                      })
                    }, trade.isPluginEnabled(w3p.address), config.tradeState.isTradingEnabled, config.tradeState.isIndexTokenApproved, config.tradeConfig.indexToken, config.tradeState.indexTokenDescription)),



                  ),
                )
              ),

              styleInline(map(mode => ({ display: mode ? 'none' : 'flex' }), inTradeMode))(
                $IntermediatePromise({
                  query: combineArray((a, b) => Promise.all([a, b]), config.pricefeed, config.trade),
                  $$done: map(([pricefeed, trade]) => {
                    if (trade === null) {
                      return $row(style({ flex: 1, placeContent: 'center', alignItems: 'center' }), styleInline(map(mode => ({ display: mode ? 'none' : 'flex' }), inTradeMode)))(
                        $text(style({ color: pallete.foreground }))('no trade')
                      )
                    }

                    const hoverChartPnl = switchLatest(map((chartCxChange) => {
                      if (Number.isFinite(chartCxChange)) {
                        return now(chartCxChange)
                      }

                      return map(price => {
                        const delta = getPnL(trade.isLong, trade.averagePrice, price, trade.size)
                        const val = formatFixed(delta + trade.realisedPnl - trade.fee, 30)

                        return val
                      }, config.tradeState.indexTokenPrice)

                    }, pnlCrossHairTime))


                    return $column(style({ flex: 1, position: 'relative' }))(
                      style({
                        pointerEvents: 'none',
                        textAlign: 'center',
                        fontSize: '1.5em', alignItems: 'baseline', padding: '6px 15px', background: 'radial-gradient(rgba(0, 0, 0, 0.37) 9%, transparent 63%)',
                        lineHeight: 1,
                        fontWeight: "bold",
                        zIndex: 10,
                        position: 'absolute',
                        width: '50%',
                        left: '50%',
                        transform: 'translateX(-50%)'
                      })(
                        $NumberTicker({
                          value$: map(hoverValue => {
                            const newLocal2 = readableNumber(hoverValue)
                            const newLocal = parseReadableNumber(newLocal2)
                            return newLocal
                          }, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, hoverChartPnl)),
                          incrementColor: pallete.positive,
                          decrementColor: pallete.negative
                        })
                      ),
                      $TradePnlHistory({
                        $container: $column(style({ flex: 1 })),
                        trade: trade,
                        chain: w3p.chain,
                        pricefeed,
                        chartConfig: {},
                        latestPrice: config.tradeState.indexTokenPrice
                      })({
                        crosshairMove: crosshairMoveTether(),
                        // requestPricefeed: requestTradePricefeedTether()
                      })
                    )
                  })
                })({})
              ),
            )
          }),
          walletLink: config.walletLink
        })({
          changeNetwork: changeNetworkTether(),
          walletChange: walletChangeTether(),
        }),
      )

    ),

    {
      switchIsLong,
      changeInputToken,
      changeIndexToken,
      switchFocusMode: mergeArray([
        snapshot(isIncrease => isIncrease ? ITradeFocusMode.size : ITradeFocusMode.collateral, config.tradeConfig.isIncrease, clickMax),
        switchFocusMode,
      ]),
      leverage: mergeArray([
        filterNull(snapshot((state, inputFactorUsd) => {
          const posCollateral = state.position?.collateral || 0n
          const posSize = state.position?.size || 0n

          const collateralDeltaUsd = state.collateralDeltaUsd
          const sizeDeltaUsd = state.sizeDeltaUsd

          const totalSize = posSize + sizeDeltaUsd
          const totalCollateral = posCollateral + collateralDeltaUsd

          if (state.isIncrease) {

            if (state.position === null) {
              return null
            }

            const multiplier = div(totalSize, totalCollateral)
            return multiplier
          }

          // if (!state.trade) {
          //   return 0n
          // }

          const multiplier = div(totalSize, totalCollateral)
          return multiplier
        }, tradeState, debounce(50, mergeArray([autoFillCollateralOnSizeInput, autoFillSizeOnCollateralInput, clickMaxBalanceSizeDelta, clickResetVal])))),
        // initialLeverage,
        slideLeverage
      ]),
      switchIsIncrease,
      changeCollateralToken,
      changeCollateralDeltaUsd: mergeArray([
        clickResetVal,
        leverageCollateralFocus,
        inputCollateralDeltaUsd,
        clickMaxCollateralUsd,
        autoFillCollateralOnSizeInput,
      ]),
      changeSizeDeltaUsd: mergeArray([
        clickResetVal,
        inputSizeDeltaUsd,
        leverageSizeFocus,
        clickMaxBalanceSizeDelta,
        autoFillSizeOnCollateralInput
      ]),
      // changeCollateralRatio: mergeArray([
      //   slideCollateralRatio,
      //   snapshot(params => {
      //     if (params.isIncrease) {
      //       const newLocal = div(params.collateralDelta, params.walletBalance)
      //       return newLocal
      //     }

      //     return params.trade ? div(params.collateralDelta, params.trade.collateral) : 0n
      //   }, tradeState, mergeArray([constant(0n, clickReset), inputCollateral])),

      //   constant(0n, switchIsIncrease)
      // ]),
      walletChange,
      changeSlippage,
      enableTrading: mergeArray([
        awaitPromises(map(async (ctx) => {
          try {
            await ctx
            return true
          } catch (err) {
            return false
          }
        }, clickEnablePlugin)),
        enableTrading
      ]),
      approveInputToken,
      requestTrade: clickRequestTrade,
      changeNetwork,

    }
  ]
})


const formatLeverageNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})



const $field = $element('input')(attr({ placeholder: '0.0' }), style({ width: '100%', lineHeight: '48px', fontFamily: '-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif', minWidth: '0', transition: 'background 500ms ease-in', flex: 1, fontSize: '1.5em', background: 'transparent', border: 'none', outline: 'none', color: pallete.message }))

const $hintInput = (label: Stream<string>, isIncrease: Stream<boolean>, tooltip: string | Stream<string>, val: Stream<string>, change: Stream<string>) => $row(layoutSheet.spacing, style({ placeContent: 'space-between', fontSize: '0.75em' }))(
  $row(layoutSheet.spacingTiny)(
    $text(style({ color: pallete.foreground }))(val),
    $text(styleBehavior(map(isIncrease => isIncrease ? { color: pallete.positive } : { color: pallete.indeterminate }, isIncrease)))('→'),
    $text(style({}))(change),
  ),
  $row(layoutSheet.spacingTiny)(
    $text(style({ color: pallete.foreground }))(label),
    $infoTooltip(tooltip),
  ),
)


function getRebateDiscountUsd(amountUsd: bigint) {
  return formatReadableUSD(amountUsd * 1000n / BASIS_POINTS_DIVISOR)
}
