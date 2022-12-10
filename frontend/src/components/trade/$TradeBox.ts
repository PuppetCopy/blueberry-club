import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { component, INode, $element, attr, style, $text, nodeEvent, $node, styleBehavior, motion, MOTION_NO_WOBBLE, styleInline } from "@aelea/dom"
import { $row, layoutSheet, $icon, $column, screenUtils, $TextField, $NumberTicker, $Popover } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import {
  ARBITRUM_ADDRESS, formatFixed, readableNumber, parseFixed, formatReadableUSD, BASIS_POINTS_DIVISOR,
  ITrade, getTokenAmount, ITokenDescription, LIMIT_LEVERAGE, bnDiv, replayState,
  div, StateStream, getPnL, MIN_LEVERAGE, formatToBasis, ARBITRUM_ADDRESS_STABLE, AVALANCHE_ADDRESS_STABLE, CHAIN, ITokenInput, ITokenIndex, ITokenStable, AddressZero, parseReadableNumber, getTokenUsd, IPricefeed, IPricefeedParamApi, TRADE_CONTRACT_MAPPING
} from "@gambitdao/gmx-middleware"
import { $anchor, $bear, $bull, $infoTooltip, $tokenIconMap, $tokenLabelFromSummary, $Tooltip } from "@gambitdao/ui-components"
import {
  merge, multicast, mergeArray, now, snapshot, map, switchLatest, filter,
  skipRepeats, empty, combine, fromPromise, constant, sample, startWith, skipRepeatsWith, awaitPromises, delay
} from "@most/core"
import { Stream } from "@most/types"
import { $Slider } from "../$Slider"
import { $ButtonPrimary, $ButtonPrimaryCtx, $ButtonSecondary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $caretDown } from "../../elements/$icons"
import { CHAIN_ADDRESS_MAP, getTokenDescription, resolveAddress } from "../../logic/utils"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { BrowserStore } from "../../logic/store"
import { connectTrade, getErc20Balance } from "../../logic/contract/trade"
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
  isTradingEnabled: boolean
  isInputTokenApproved: boolean

  trade: ITrade | null
  collateralDeltaUsd: bigint
  sizeDeltaUsd: bigint
  inputTokenPrice: bigint
  collateralTokenPrice: bigint
  // availableLiquidityUsd: bigint
  indexTokenPrice: bigint
  walletBalance: bigint

  swapFee: bigint
  marginFee: bigint
  executionFee: bigint
  fee: bigint

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

  collateralRatio: bigint
  leverage: bigint
  collateralDelta: bigint
  sizeDelta: bigint

  slippage: string
}


export interface ITradeState extends ITradeConfig, ITradeParams {

}

interface ITradeBox {
  referralCode: string
  walletLink: IWalletLink

  tradePricefeed: Stream<IPricefeed[]>

  chainList: CHAIN[],
  tokenIndexMap: Partial<Record<CHAIN, ITokenIndex[]>>
  tokenStableMap: Partial<Record<CHAIN, ITokenStable[]>>
  store: BrowserStore<"ROOT.v1.trade", string>

  tradeConfig: StateStream<ITradeConfig> // ITradeParams
  tradeState: StateStream<ITradeParams>
}

export type RequestTradeQuery = {
  ctxQuery: Promise<ContractTransaction>
  state: ITradeState
  acceptablePrice: bigint
}

const BOX_SPACING = '20px'
const LIMIT_LEVERAGE_NORMAL = formatToBasis(LIMIT_LEVERAGE)

export const $TradeBox = (config: ITradeBox) => component((
  [openEnableTradingPopover, openEnableTradingPopoverTether]: Behavior<any, any>,
  [enableTrading, enableTradingTether]: Behavior<any, boolean>,
  [approveInputToken, approveInputTokenTether]: Behavior<PointerEvent, boolean>,
  [clickEnablePlugin, clickEnablePluginTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,

  [dismissEnableTradingOverlay, dismissEnableTradingOverlayTether]: Behavior<false, false>,

  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,

  [switchFocusMode, switchFocusModeTether]: Behavior<any, ITradeFocusMode>,

  [inputCollateralDelta, inputCollateralDeltaTether]: Behavior<INode, bigint>,
  [inputSizeDelta, inputSizeDeltaTether]: Behavior<INode, bigint>,

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
  [clickMaxBalance, clickMaxBalanceTether]: Behavior<any, any>,

  [requestTradePricefeed, requestTradePricefeedTether]: Behavior<IPricefeedParamApi, IPricefeedParamApi>,

) => {

  const trade = connectTrade(config.walletLink)
  const position = connectTrade(config.walletLink)

  const tradeState: Stream<ITradeState> = replayState({ ...config.tradeState, ...config.tradeConfig })


  const validationError = map((state) => {

    if (state.leverage > LIMIT_LEVERAGE) {
      return `Leverage exceeds ${formatToBasis(LIMIT_LEVERAGE)}x`
    }

    if (state.isIncrease) {
      if (state.collateralDelta > state.walletBalance) {
        return `Not enough ${state.inputTokenDescription.symbol} in connected account`
      }

      if (state.leverage < MIN_LEVERAGE) {
        return `Leverage below 1.1x`
      }

    }

    if (!state.isIncrease && !state.trade) {
      return `No ${state.indexTokenDescription.symbol} position to reduce`
    }

    if (state.trade && state.liquidationPrice && (state.isLong ? state.liquidationPrice > state.indexTokenPrice : state.liquidationPrice < state.indexTokenPrice)) {
      return `Exceeding liquidation price`
    }

    return null
  }, tradeState)


  const maxBalance = sample(config.tradeState.walletBalance, clickMaxBalance)

  const sizeDeltaFromMaxBalance = snapshot((state) => {
    const leverageCapped = state.leverage > LIMIT_LEVERAGE ? LIMIT_LEVERAGE : state.leverage
    const collateral = state.trade?.collateral || 0n
    const totalCollateralUsd = getTokenUsd(state.walletBalance, state.inputTokenPrice, state.inputTokenDescription.decimals) + collateral
    const sizeUsd = totalCollateralUsd * leverageCapped / BASIS_POINTS_DIVISOR
    const sizeDelta = getTokenAmount(sizeUsd, state.indexTokenPrice, state.indexTokenDescription.decimals)

    return sizeDelta
  }, tradeState, clickMaxBalance)

  const slideCollateralLeverage = switchLatest(map((focus) => focus === ITradeFocusMode.collateral ? slideLeverage : empty(), config.tradeConfig.focusMode))

  const leverageCollateralFocus = skipRepeats(snapshot((state, leverage) => {
    if (!state.trade) {
      const adjustedCollateral = div(state.sizeDeltaUsd, leverage)

      return getTokenAmount(adjustedCollateral, state.inputTokenPrice, state.inputTokenDescription.decimals)
    }

    const totalSize = state.sizeDeltaUsd + state.trade.size
    const collateral = div(totalSize, leverage)
    const deltaUsd = collateral - state.trade.collateral

    const currentMultiplier = div(totalSize, state.trade.collateral)

    const multiplierDelta = state.isIncrease ? currentMultiplier - leverage : leverage - currentMultiplier

    if (multiplierDelta < 50) {
      return 0n
    }

    const amount = getTokenAmount(deltaUsd, state.inputTokenPrice, state.inputTokenDescription.decimals)

    return amount

  }, tradeState, slideCollateralLeverage))


  const slideSizeLeverage = switchLatest(map((focus) => focus === ITradeFocusMode.size ? slideLeverage : empty(), config.tradeConfig.focusMode))

  const leverageSizeFocus = skipRepeats(snapshot((state, leverage) => {
    if (!state.trade) {
      const adjustedCollateral = div(state.collateralDeltaUsd, leverage)
      const sizeAmount = getTokenAmount(adjustedCollateral, state.indexTokenPrice, state.indexTokenDescription.decimals)

      return sizeAmount
    }


    const totalCollateralUsd = state.collateralDeltaUsd + state.trade.collateral
    const toSizeUsd = totalCollateralUsd * leverage / BASIS_POINTS_DIVISOR

    const currentMultiplier = div(state.trade.size, totalCollateralUsd)
    const multiplierDelta = state.isIncrease ? leverage - currentMultiplier : currentMultiplier - leverage
    const adjustedDeltaUsd = toSizeUsd - state.trade.size

    if (multiplierDelta < 50) {
      return 0n
    }

    const amount = getTokenAmount(adjustedDeltaUsd, state.indexTokenPrice, state.indexTokenDescription.decimals)

    return amount
  }, tradeState, slideSizeLeverage))

  const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))

  const pnlCrossHairTime = map((cross: MouseEventParams) => {
    if (cross) {
      return cross.seriesPrices.values().next().value
    }

    return null
  }, pnlCrossHairTimeChange)

  const clickResetVal = constant(0n, resetTradeMode)

  const inTradeMode = replayLatest(multicast(combineArray((sizeDelta, collateralDelta) => {
    if (sizeDelta === 0n && collateralDelta === 0n) {
      return false
    }

    return true
  }, config.tradeState.sizeDeltaUsd, config.tradeState.collateralDeltaUsd)))



  return [
    $column(style({ borderRadius: BOX_SPACING, boxShadow: `2px 2px 13px 3px #00000040`, padding: 0, margin: screenUtils.isMobileScreen ? '0 10px' : '' }))(
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

      $column(style({ borderRadius: BOX_SPACING, zIndex: 0, backgroundColor: pallete.horizon }))(

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
              map(pos => formatReadableUSD(pos?.collateral || 0n), config.tradeState.trade),
              combineArray(params => {
                const posCollateral = params.trade?.collateral || 0n
                const totalCollateral = posCollateral + params.collateralDeltaUsd
                const collateralUsd = formatReadableUSD(totalCollateral - params.fee)

                if (params.isIncrease) {
                  return collateralUsd
                }

                if (!params.trade) {
                  return formatReadableUSD(0n)
                }

                const pnl = getPnL(params.isLong, params.trade.averagePrice, params.indexTokenPrice, params.trade.size)
                const adjustedPnlDelta = div(pnl * params.sizeDeltaUsd, params.trade.size)
                // const adjustedPnlDelta = pnl < 0n ? pnl * params.sizeDelta / params.trade.size : 0n
                const netCollateral = posCollateral + params.collateralDeltaUsd + adjustedPnlDelta

                return formatReadableUSD(netCollateral)
              }, tradeState)
            ),
            $node(style({ flex: 1 }))(),
            $row(
              layoutSheet.spacingTiny,
              clickMaxBalanceTether(nodeEvent('click')),
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
                    filter(() => false, snapshot((params, val) => {
                      if (val === 0n) {
                        node.element.value = ''
                        return
                      }

                      node.element.value = readableNumber(formatFixed(val, params.isIncrease ? params.inputTokenDescription.decimals : params.inputTokenDescription.decimals))
                    }, tradeState, mergeArray([clickResetVal, leverageCollateralFocus, maxBalance])))
                  )
                ),
                switchLatest
              ),
              // styleInline(map(focus => focus === ITradeFocusMode.collateral ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(nodeEvent('focus'), constant(ITradeFocusMode.collateral)),
              inputCollateralDeltaTether(nodeEvent('input'), combine(({ isIncrease, tokenDescription }, inputEvent) => {
                const target = inputEvent.target

                if (!(target instanceof HTMLInputElement)) {
                  throw new Error('Target is not type of input')
                }

                if (target.value === '') {
                  return 0n
                }

                const decimals = isIncrease ? tokenDescription.decimals : tokenDescription.decimals
                return parseFixed(parseReadableNumber(target.value), decimals)
              }, combineObject({ tokenDescription: config.tradeState.inputTokenDescription, isIncrease: config.tradeConfig.isIncrease }))),
            )(),

            $Dropdown({
              // $container: $row(style({ position: 'relative', alignSelf: 'center',  })),
              $selection: switchLatest(combineArray((isIncrease) => {
                return $row(style({
                  alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '.75em',
                  border: `1px solid ${isIncrease ? pallete.middleground : pallete.indeterminate}`, padding: '6px 12px', borderRadius: '12px'
                }))(
                  $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                    // $icon({
                    //   $content: $bagOfCoins,
                    //   svgOps: styleBehavior(map(isIncrease => ({ fill: isIncrease ? pallete.message : pallete.indeterminate }), config.tradeConfig.isIncrease)),
                    //   width: '18px', viewBox: '0 0 32 32'
                    // }),
                    $text(isIncrease ? 'Increase' : 'Decrease'),
                    $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px', marginRight: '-5px' }), viewBox: '0 0 32 32' }),
                  )
                )
              }, config.tradeConfig.isIncrease)),
              value: {
                value: config.tradeConfig.isIncrease,
                $container: $defaultSelectContainer(style({ minWidth: '100px', right: 0 })),
                $$option: map((isIncrease) => {
                  return $text(style({ fontSize: '0.85em' }))(isIncrease ? 'Increase' : 'Decrease')
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


                if (state.trade) {
                  if (state.focusMode === ITradeFocusMode.collateral) {
                    return bnDiv(MIN_LEVERAGE, LIMIT_LEVERAGE)
                  }

                  const totalCollateral = state.collateralDeltaUsd + state.trade.collateral

                  return bnDiv(div(state.trade.size, totalCollateral), LIMIT_LEVERAGE)
                }

                return 0
              }

              if (state.focusMode === ITradeFocusMode.collateral) {
                const totalSize = state.sizeDeltaUsd + (state.trade?.size || 0n)

                if (state.trade) {
                  return bnDiv(div(totalSize, state.trade.collateral), LIMIT_LEVERAGE)
                }

                return 0
              }



              return 0
            }, tradeState),
            max: map(state => {
              const collateralDeltaUsd = getTokenUsd(state.collateralDelta, state.inputTokenPrice, state.inputTokenDescription.decimals)

              const totalSize = state.sizeDeltaUsd + (state.trade?.size || 0n)

              if (state.isIncrease) {
                if (state.trade) {
                  if (state.focusMode === ITradeFocusMode.collateral) {
                    const currentMultiplier = div(totalSize, state.trade.collateral)
                    return bnDiv(currentMultiplier, LIMIT_LEVERAGE)
                  }
                }

                return 1
              } else {
                if (state.trade && state.focusMode === ITradeFocusMode.size) {
                  const totalCollateral = collateralDeltaUsd + (state.trade.collateral || 0n)
                  const newLocal = div(state.trade.size, totalCollateral)

                  return bnDiv(newLocal, LIMIT_LEVERAGE)
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
                    filter(() => false, combineArray((val, tokenDesc) => {

                      if (val === 0n) {
                        node.element.value = ''
                        return
                      }

                      // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                      node.element.value = readableNumber(formatFixed(val, tokenDesc.decimals))

                    }, mergeArray([clickResetVal, leverageSizeFocus, sizeDeltaFromMaxBalance]), config.tradeState.indexTokenDescription))
                  )
                ),
                switchLatest
              ),
              styleInline(map(focus => focus === ITradeFocusMode.size ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(nodeEvent('focus'), constant(ITradeFocusMode.size)),
              inputSizeDeltaTether(nodeEvent('input'), combine((tokenDesc, inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  throw new Error('Target is not type of input')
                }

                if (target.value === '') {
                  return 0n
                }

                return parseFixed(parseReadableNumber(target.value), tokenDesc.decimals)
              }, config.tradeState.indexTokenDescription))
            )(),

            $Dropdown({
              $container: $row(style({ position: 'relative', alignSelf: 'center', border: `1px solid ${pallete.middleground}`, padding: '6px 12px', borderRadius: '12px' })),
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
                $$option: map((option) => {
                  return $text(style({ fontSize: '0.85em' }))(option ? 'Long' : 'Short')
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
              map(pos => formatReadableUSD(pos ? pos.size : 0n), config.tradeState.trade),

              map((params) => {
                const totalSize = params.sizeDeltaUsd + (params.trade?.size || 0n)

                return formatReadableUSD(totalSize - params.fee)
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
        marginTop: `-${BOX_SPACING}`,
        paddingTop: `${BOX_SPACING}`,
        // backgroundColor: pallete.horizon,
        border: `1px solid ${colorAlpha(pallete.foreground, .15)}`,
        // borderTop: 'none',
        borderRadius: `0px 0px ${BOX_SPACING} ${BOX_SPACING}`,
      }))(
        $IntermediateConnectButton({
          chainList: config.chainList,
          primaryButtonConfig: {
            $container: $element('button')(style({ alignSelf: 'center', placeSelf: 'center' })),
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

            const isSpendApproved = awaitPromises(map(async token => {
              const erc20 = ERC20__factory.connect(token, w3p.signer)
              const spend = await erc20.allowance(w3p.address, routerContractAddress)
              const newLocal = spend.gt(0)

              return newLocal
            }, config.tradeConfig.indexToken))

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

                          if (params.trade) {
                            if (params.isIncrease) {
                              modLabel = 'Increase'
                            } else {
                              modLabel = (params.sizeDeltaUsd - params.trade.size === 0n) ? 'Close' : 'Reduce'
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
                                state.collateralDelta,
                                state.sizeDeltaUsd,
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
                    }, trade.isPluginEnabled(w3p.address), config.tradeState.isTradingEnabled, mergeArray([isSpendApproved, config.tradeState.isInputTokenApproved]), config.tradeConfig.indexToken, config.tradeState.indexTokenDescription)),



                  ),
                )
              ),


              switchLatest(combineArray((trade, pricefeed) => {

                if (trade === null) {
                  return $row(style({ flex: 1, placeContent: 'center', alignItems: 'center' }), styleInline(map(mode => ({ display: mode ? 'none' : 'flex' }), inTradeMode)))(
                    $text(style({ color: pallete.foreground }))('no trade')
                  )
                }

                const hoverChartPnl = switchLatest(map((chartCxChange) => {
                  if (chartCxChange) {
                    return now(Number(readableNumber(chartCxChange)))
                  }

                  return map(price => {
                    const delta = getPnL(trade.isLong, trade.averagePrice, price, trade.size)
                    const val = formatFixed(delta + trade.realisedPnl - trade.fee, 30)

                    return Number(readableNumber(val))
                  }, config.tradeState.indexTokenPrice)

                }, pnlCrossHairTime))

                return $column(style({ flex: 1 }))(
                  style({ position: 'relative' }),
                  styleInline(map(mode => ({ display: mode ? 'none' : 'flex' }), inTradeMode))
                )(
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
                      value$: combineArray((hoverValue, vv) => {
                        return Number(readableNumber(hoverValue))
                      }, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, hoverChartPnl), tradeState),
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

              }, config.tradeState.trade, config.tradePricefeed))
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
        constant(ITradeFocusMode.size, clickMaxBalance),
        switchFocusMode,
      ]),
      leverage: mergeArray([
        snapshot((state, inputFactor) => {
          const posCollateral = state.trade?.collateral || 0n
          const posSize = state.trade?.size || 0n

          const collateralDeltaUsd = state.focusMode === ITradeFocusMode.collateral ? inputFactor : state.collateralDeltaUsd
          const sizeDeltaUsd = state.focusMode === ITradeFocusMode.size ? inputFactor : state.sizeDeltaUsd


          const totalSize = posSize + sizeDeltaUsd
          const totalCollateral = posCollateral + collateralDeltaUsd

          if (state.isIncrease) {
            const multiplier = div(totalSize, totalCollateral)
            return multiplier
          }

          if (!state.trade) {
            return 0n
          }

          const multiplier = div(posSize - sizeDeltaUsd, posCollateral - state.collateralDeltaUsd)
          return multiplier
        }, tradeState, mergeArray([inputCollateralDelta, inputSizeDelta, delay(10, clickResetVal)])),
        // initialLeverage,
        slideLeverage
      ]),
      switchIsIncrease,
      changeCollateralToken,
      changeCollateralDelta: mergeArray([
        clickResetVal,
        leverageCollateralFocus,
        inputCollateralDelta,
        maxBalance,
      ]),
      changeSizeDelta: mergeArray([
        clickResetVal,
        inputSizeDelta,
        leverageSizeFocus,
        sizeDeltaFromMaxBalance,
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
      approveInputToken: mergeArray([
        approveInputToken,
        awaitPromises(snapshot(async (collateralDelta, { w3p, chain, inputToken }) => {
          if (w3p === null) {
            throw new Error('No wallet connected')
          }

          const signer = w3p.getSigner()

          // const erc20 = connectErc20(inputToken, map(w3p => , config.walletProvider))
          const c = ERC20__factory.connect(inputToken, w3p.getSigner())

          if (inputToken === AddressZero) {
            return true
          }

          if (c === null || signer._address === null) {
            return null
          }

          const contractAddress = getContractAddress(TRADE_CONTRACT_MAPPING, chain, 'Router')

          if (contractAddress === null) {
            return null
          }

          const allowedSpendAmount = (await c.allowance(signer._address, contractAddress)).toBigInt()
          return allowedSpendAmount >= collateralDelta
        }, config.tradeConfig.collateralDelta, combineObject({ w3p: config.walletLink.provider, chain: config.walletLink.network, inputToken: config.tradeConfig.inputToken })))
      ]),
      requestTrade: clickRequestTrade,
      changeNetwork,

      requestTradePricefeed,
    }
  ]
})


const formatLeverageNumber = new Intl.NumberFormat("en-US", {
  // style: "currency",
  // currency: "USD",
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
  return formatReadableUSD(amountUsd * 1500n / BASIS_POINTS_DIVISOR)
}
