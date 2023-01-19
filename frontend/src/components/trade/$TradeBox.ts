import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { component, INode, $element, attr, style, $text, nodeEvent, $node, styleBehavior, motion, MOTION_NO_WOBBLE, styleInline, stylePseudo } from "@aelea/dom"
import { $row, layoutSheet, $icon, $column, screenUtils, $NumberTicker } from "@aelea/ui-components"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import {
  ARBITRUM_ADDRESS, formatFixed, readableNumber, parseFixed, formatReadableUSD, BASIS_POINTS_DIVISOR,
  ITokenDescription, LIMIT_LEVERAGE, bnDiv, replayState,
  div, StateStream, getPnL, MIN_LEVERAGE, formatToBasis, ARBITRUM_ADDRESS_STABLE, AVALANCHE_ADDRESS_STABLE,
  ITokenInput, ITokenIndex, ITokenStable, AddressZero, parseReadableNumber, getTokenUsd, IPricefeed,
  TRADE_CONTRACT_MAPPING, filterNull, ITradeOpen, zipState, MARGIN_FEE_BASIS_POINTS, abs, DEDUCT_FOR_GAS, getTokenAmount, safeDiv, getTokenDescription
} from "@gambitdao/gmx-middleware"
import {
  $anchor, $bear, $bull, $hintNumChange, $infoTooltipLabel, $IntermediatePromise,
  $tokenIconMap, $tokenLabelFromSummary, invertColor
} from "@gambitdao/ui-components"
import {
  merge, multicast, mergeArray, now, snapshot, map, switchLatest,
  skipRepeats, empty, fromPromise, constant, startWith, skipRepeatsWith, awaitPromises, zip, sample, delay
} from "@most/core"
import { Stream } from "@most/types"
import { $Slider } from "../$Slider"
import { $ButtonPrimary, $ButtonPrimaryCtx, $ButtonSecondary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $caretDown } from "../../elements/$icons"
import { getNativeTokenDescription, resolveAddress } from "../../logic/utils"
import { $IntermediateConnectButton, $WalletLogoMap } from "../../components/$ConnectAccount"
import { BrowserStore } from "../../logic/store"
import { connectTradeReader, getErc20Balance, IPositionGetter, ITokenPoolInfo } from "../../logic/contract/trade"
import { MouseEventParams } from "lightweight-charts"
import { $TradePnlHistory } from "./$TradePnlHistory"
import { ContractTransaction } from "@ethersproject/contracts"
import { MaxUint256 } from "@ethersproject/constants"
import { getContractAddress } from "../../logic/common"
import { ERC20__factory } from "../../logic/gmx-contracts"
import { CHAIN, IWalletLink, IWalletName } from "@gambitdao/wallet-link"
import { $Popover } from "../$Popover"
import { $card } from "../../elements/$common"

export enum ITradeFocusMode {
  collateral,
  size,
}


export interface ITradeParams {
  position: IPositionGetter
  isTradingEnabled: boolean
  isInputTokenApproved: boolean

  inputTokenPrice: bigint
  collateralTokenPrice: bigint
  availableIndexLiquidityUsd: bigint
  indexTokenPrice: bigint
  walletBalance: bigint
  walletBalanceUsd: bigint

  executionFee: bigint
  swapFee: bigint
  marginFee: bigint
  fundingFee: bigint

  collateralDelta: bigint
  sizeDelta: bigint

  nativeTokenPrice: bigint

  inputTokenDescription: ITokenDescription
  indexTokenDescription: ITokenDescription
  collateralTokenDescription: ITokenDescription

  averagePrice: bigint | null
  liquidationPrice: bigint | null

  collateralTokenPoolInfo: ITokenPoolInfo
}

export interface ITradeConfig {
  isLong: boolean

  inputToken: ITokenInput
  indexToken: ITokenIndex
  collateralToken: ITokenStable

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
  // positionChange: Stream<IPositionGetter>
}

export type RequestTradeQuery = {
  ctxQuery: Promise<ContractTransaction>
  state: ITradeState
  acceptablePrice: bigint
}

const BOX_SPACING = 20
const LIMIT_LEVERAGE_NORMAL = formatToBasis(LIMIT_LEVERAGE)
const MIN_LEVERAGE_NORMAL = formatToBasis(MIN_LEVERAGE) / LIMIT_LEVERAGE_NORMAL

export const $TradeBox = (config: ITradeBox) => component((
  [openEnableTradingPopover, openEnableTradingPopoverTether]: Behavior<any, any>,
  [enableTrading, enableTradingTether]: Behavior<any, boolean>,
  [approveInputToken, approveInputTokenTether]: Behavior<PointerEvent, boolean>,
  [clickEnablePlugin, clickEnablePluginTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,

  [dismissEnableTradingOverlay, dismissEnableTradingOverlayTether]: Behavior<false, false>,

  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,

  [switchFocusMode, switchFocusModeTether]: Behavior<any, ITradeFocusMode>,

  [inputCollateralDeltaUsd, inputCollateralDeltaTetherUsd]: Behavior<INode, bigint>,
  [inputSizeDeltaUsd, inputSizeDeltaTetherUsd]: Behavior<INode, bigint>,

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
  [clickResetTradeMode, clickResetTradeModeTether]: Behavior<any, any>,
  [clickMax, clickMaxTether]: Behavior<any, any>,

) => {

  const tradeReader = connectTradeReader(config.walletLink.provider)

  const { collateralDeltaUsd, collateralToken, focusMode, indexToken, inputToken, isIncrease, isLong, leverage, sizeDeltaUsd, slippage } = config.tradeConfig
  const {
    availableIndexLiquidityUsd, averagePrice, collateralDelta, collateralTokenDescription,
    collateralTokenPoolInfo, collateralTokenPrice, executionFee, fundingFee, indexTokenDescription, indexTokenPrice, inputTokenDescription, inputTokenPrice,
    isInputTokenApproved, isTradingEnabled, liquidationPrice, marginFee, nativeTokenPrice,
    position, sizeDelta, swapFee, walletBalance, walletBalanceUsd
  } = config.tradeState

  const tradeState: Stream<ITradeState> = replayState({ ...config.tradeState, ...config.tradeConfig })




  const validationError = map((state) => {

    if (state.leverage > LIMIT_LEVERAGE) {
      return `Leverage exceeds ${formatToBasis(LIMIT_LEVERAGE)}x`
    }

    if (state.isIncrease) {
      const requiredReserve = state.sizeDeltaUsd - state.collateralDeltaUsd

      if (requiredReserve > state.availableIndexLiquidityUsd) {
        return `Not enough liquidity. current capcity ${formatReadableUSD(state.availableIndexLiquidityUsd)}`
      }

      if (state.collateralDelta > state.walletBalance + DEDUCT_FOR_GAS) {
        return `Not enough ${state.inputTokenDescription.symbol} in connected account`
      }

      if (state.leverage < MIN_LEVERAGE) {
        return `Leverage below 1.1x`
      }
    } else {

      if (state.inputToken !== state.collateralToken) {
        const pnl = getPnL(state.isLong, state.position.averagePrice, state.indexTokenPrice, state.position.size)
        const adjustedPnl = div(abs(state.sizeDeltaUsd) * pnl, state.position.size) / BASIS_POINTS_DIVISOR

        const nextUsdgAmount = state.collateralTokenPoolInfo.usdgAmount + adjustedPnl
        if (nextUsdgAmount > state.collateralTokenPoolInfo.maxUsdgAmount) {
          return `${state.collateralTokenDescription.symbol} pool exceeded, can only Receive ${state.collateralTokenDescription.symbol}`
        }
      }

    }

    if (!state.isIncrease && state.position.averagePrice === 0n) {
      return `No ${state.indexTokenDescription.symbol} position to reduce`
    }

    if (state.position && state.liquidationPrice && (state.isLong ? state.liquidationPrice > state.indexTokenPrice : state.liquidationPrice < state.indexTokenPrice)) {
      return `Exceeding liquidation price`
    }

    return null
  }, tradeState)


  const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))

  const pnlCrossHairTime = map((cross: MouseEventParams) => {
    if (cross) {
      return cross.seriesPrices.values().next().value
    }

    return null
  }, pnlCrossHairTimeChange)

  const resetTrade = constant(0n, mergeArray([delay(50, config.tradeState.position), clickResetTradeMode]))


  const clickMaxCollateralUsd = snapshot(state => {
    if (state.isIncrease) {
      return state.walletBalanceUsd
    }

    if (state.position.averagePrice === 0n) {
      return 0n
    }

    const collateral = div(state.position.size, LIMIT_LEVERAGE)
    const deltaUsd = collateral - state.position.collateral - state.position.entryFundingRate

    return deltaUsd
  }, combineObject({ isIncrease, walletBalanceUsd, position }), clickMax)


  const inTradeMode = replayLatest(multicast(combineArray((sizeDeltaUsd, collateralDeltaUsd) => {
    if (sizeDeltaUsd === 0n && collateralDeltaUsd === 0n) {
      return false
    }

    return true
  }, config.tradeConfig.sizeDeltaUsd, config.tradeConfig.collateralDeltaUsd)))

  const inputTokenChange = snapshot((collateralDeltaUsd, params) => {
    return collateralDeltaUsd
  }, config.tradeConfig.collateralDeltaUsd, zipState({ inputDesc: config.tradeState.inputTokenDescription, price: config.tradeState.inputTokenPrice }))



  const effectCollateral = switchLatest(map((focus) => {
    if (focus === ITradeFocusMode.collateral) {
      return empty()
    }

    const effects = mergeArray([slideLeverage, config.tradeState.inputTokenPrice])
    return sample(config.tradeConfig.sizeDeltaUsd, effects)
  }, config.tradeConfig.focusMode))



  const effectSize = switchLatest(map((focus) => {
    if (focus === ITradeFocusMode.size) {
      return empty()
    }

    const effects = mergeArray([slideLeverage, config.tradeState.indexTokenPrice])
    return sample(config.tradeConfig.collateralDeltaUsd, effects)
  }, config.tradeConfig.focusMode))



  const autoFillCollateralUsd = mergeArray([
    clickMaxCollateralUsd,
    resetTrade,
    skipRepeats(snapshot((state, sizeDeltaUsd) => {

      const size = sizeDeltaUsd + state.position.size
      const collateral = div(size, state.leverage)
      const positionCollateral = state.position.collateral - state.fundingFee
      const collateralDelta = collateral - positionCollateral


      if (state.position.size > 0n) {
        const currentMultiplier = div(size, positionCollateral)
        const nextMultiplier = div(size, positionCollateral + collateralDelta)

        const multiplierDelta = state.isIncrease ? currentMultiplier - nextMultiplier : nextMultiplier - currentMultiplier

        if (multiplierDelta < 100n) {
          return 0n
        }
      }

      const totalCollateral = collateralDelta + state.swapFee + state.marginFee

      if (state.isIncrease && totalCollateral > state.walletBalanceUsd) {
        return state.walletBalanceUsd
      }

      return totalCollateral
    }, combineObject({ position, leverage, fundingFee, walletBalanceUsd, isIncrease, swapFee, marginFee }), mergeArray([inputSizeDeltaUsd, effectCollateral])))
  ])

  const autoFillSizeUsd = mergeArray([
    resetTrade,
    filterNull(snapshot((state, collateralDeltaUsd) => {
      const positionCollateral = state.position.collateral - state.fundingFee

      const totalCollateral = collateralDeltaUsd + positionCollateral - state.swapFee
      const delta = (totalCollateral * state.leverage / BASIS_POINTS_DIVISOR - state.position.size) * BASIS_POINTS_DIVISOR


      if (state.position.size > 0n) {
        const minMultiplier = div(state.position.size, totalCollateral)
        const multiplierDelta = state.isIncrease ? state.leverage - minMultiplier : minMultiplier - state.leverage

        if (multiplierDelta < 100n) {
          return 0n
        }
      }


      if (!state.isIncrease && state.leverage <= MIN_LEVERAGE) {
        return -state.position.size
      }


      const toNumerator = delta * BASIS_POINTS_DIVISOR
      const toDenominator = MARGIN_FEE_BASIS_POINTS * state.leverage + BASIS_POINTS_DIVISOR * BASIS_POINTS_DIVISOR

      const deltaAfterFees = toNumerator / toDenominator
      return deltaAfterFees
    }, combineObject({ leverage, position, fundingFee, swapFee, isIncrease }), mergeArray([inputCollateralDeltaUsd, effectSize, clickMaxCollateralUsd])))
  ])


  const autoFillCollateralToken = snapshot((state, amountUsd) => {
    return getTokenAmount(amountUsd, state.inputTokenPrice, state.inputTokenDescription.decimals)
  }, combineObject({ inputTokenPrice, inputTokenDescription }), autoFillCollateralUsd)

  const autoFillSizeToken = snapshot((state, amountUsd) => {
    return getTokenAmount(amountUsd, state.indexTokenPrice, state.indexTokenDescription.decimals)
  }, combineObject({ indexTokenPrice, indexTokenDescription }), autoFillSizeUsd)




  return [
    $card(style({ padding: 0, gap: 0, background: theme.name === 'dark' ? 'rgb(0 0 0 / 15%)' : '' }))(
      // $row(
      //   // styleInline(map(isIncrease => isIncrease ? { borderColor: 'none' } : {}, config.tradeConfig.isIncrease)),
      //   style({

      //     //       margin-bottom: -15px;
      //     // border-radius: 20px 20px 0 0;
      //     // padding-bottom: 15px;

      //     height: `75px`,
      //     padding: '0 16px 15px',
      //     marginBottom: `-${BOX_SPACING}px`,
      //     paddingBottom: `${BOX_SPACING}px`,
      //     placeContent: 'space-between',
      //     alignItems: 'center',
      //     // backgroundColor: pallete.horizon,
      //     border: `1px solid ${colorAlpha(pallete.foreground, .15)}`,
      //     // borderTop: 'none',
      //     borderRadius: `${BOX_SPACING}px ${BOX_SPACING}px 0px 0px`,
      //   })
      // )(
      //   $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      //     style({ padding: '2px', fontSize: '.75em' })(
      //       $ButtonSecondary({
      //         $content: $icon({ $content: $xCross, width: '24px', svgOps: style({ padding: '4px' }), viewBox: '0 0 32 32' })
      //       })({
      //         click: clickResetTradeModeTether()
      //       })
      //     ),
      //     $text(style({ fontWeight: 'bold' }))(map(state => {
      //       if (state.position.averagePrice > 0n) {
      //         return state.isIncrease ? 'Increase' : 'Decrease'
      //       }

      //       return 'Open'
      //     }, tradeState)),
      //   ),

      //   $Popover({
      //     $target: $row(clickOpenTradeConfigTether(nodeEvent('click')), style({ fontSize: '.75em', padding: '6px 12px', border: `2px solid ${pallete.horizon}`, borderRadius: '30px' }))(
      //       $text('Advanced'),
      //       $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginRight: '-5px' }), viewBox: '0 0 32 32' }),
      //     ),
      //     $popContent: map((_) => {
      //       return $text('fff')
      //     }, clickOpenTradeConfig),
      //   })({
      //     // overlayClick: clickPopoverClaimTether()
      //   })

      //   // $ButtonToggle({
      //   //   $container: $row(layoutSheet.spacingSmall),
      //   //   selected: config.tradeConfig.isLong,
      //   //   options: [
      //   //     true,
      //   //     false,
      //   //   ],
      //   //   $$option: map(isLong => {
      //   //     return $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
      //   //       $icon({ $content: isLong ? $bull : $bear, width: '18px', viewBox: '0 0 32 32' }),
      //   //       $text(isLong ? 'Long' : 'Short'),
      //   //     )
      //   //   })
      //   // })({ select: switchIsLongTether() }),

      //   // $ButtonToggle({
      //   //   $container: $row(layoutSheet.spacingSmall),
      //   //   selected: config.tradeConfig.isIncrease,
      //   //   options: [
      //   //     true,
      //   //     false,
      //   //   ],
      //   //   $$option: map(option => {
      //   //     return $text(style({}))(option ? 'Deposit' : 'Withdraw')
      //   //   })
      //   // })({ select: switchisIncreaseTether() }),

      // ),

      $column(style({ borderRadius: `${BOX_SPACING}px`, backgroundColor: theme.name === 'dark' ? pallete.horizon : colorAlpha(pallete.horizon, .3) }))(
        $column(layoutSheet.spacingSmall, style({ padding: '16px', borderRadius: '20px 20px 0 0', border: `1px solid ${colorAlpha(pallete.foreground, .15)}` }),
          styleInline(now({ borderBottom: 'none' })),
          styleInline(combineArray((focus, isIncrease) => {
            return focus === ITradeFocusMode.collateral ? { borderColor: isIncrease ? `${pallete.middleground}` : `${pallete.indeterminate}` } : { borderColor: '' }
          }, config.tradeConfig.focusMode, config.tradeConfig.isIncrease))
        )(
          $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between' }))(
            // $row(
            //   layoutSheet.spacingTiny,
            //   clickMaxTether(nodeEvent('click'))
            // )(
            //   style({ flexDirection: 'row-reverse' })($hintNumChange({
            //     label: `Wallet`,
            //     change: map(state => {
            //       const change = state.walletBalance + -state.collateralDelta
            //       return readableNumber(formatFixed(change, state.inputTokenDescription.decimals)) + (screenUtils.isDesktopScreen ? ` ${state.inputTokenDescription.symbol}` : '')
            //     }, tradeState),
            //     isIncrease: map(isIncrease => !isIncrease, config.tradeConfig.isIncrease),
            //     val: zip((tokenDesc, balance) => {
            //       return readableNumber(formatFixed(balance, tokenDesc.decimals)) + (screenUtils.isDesktopScreen ? ` ${tokenDesc.symbol}` : '')
            //     }, config.tradeState.inputTokenDescription, config.tradeState.walletBalance)
            //   })),
            // ),
            $row(
              layoutSheet.spacingTiny,
              clickMaxTether(nodeEvent('click')),
              style({ fontSize: '0.75em' })
            )(
              $text(style({ color: pallete.foreground }))(`Wallet`),
              $text(style({ cursor: 'pointer' }))(
                zip((tokenDesc, balance) => {
                  return readableNumber(formatFixed(balance, tokenDesc.decimals)) + (screenUtils.isDesktopScreen ? ` ${tokenDesc.symbol}` : '')
                }, config.tradeState.inputTokenDescription, config.tradeState.walletBalance)
              ),
            ),
            $hintNumChange({
              label: screenUtils.isDesktopScreen ? `Collateral` : undefined,
              change: combineArray(state => {
                const posCollateral = state.position.collateral - state.fundingFee
                const totalCollateral = posCollateral + state.collateralDeltaUsd - state.swapFee - state.marginFee

                if (state.isIncrease) {
                  return formatReadableUSD(totalCollateral)
                }

                if (state.position.averagePrice === 0n) {
                  return formatReadableUSD(0n)
                }

                const pnl = getPnL(state.isLong, state.position.averagePrice, state.indexTokenPrice, state.position.size)
                const adjustedPnlDelta = !state.isIncrease
                  ? -div(abs(state.sizeDeltaUsd) * pnl, state.position.size) / BASIS_POINTS_DIVISOR
                  : 0n

                const netCollateral = totalCollateral + adjustedPnlDelta

                return formatReadableUSD(netCollateral)
              }, combineObject({ sizeDeltaUsd, position, indexTokenPrice, isIncrease, collateralDeltaUsd, swapFee, marginFee, isLong, fundingFee })),
              isIncrease: config.tradeConfig.isIncrease,
              tooltip: 'The amount deposited to maintain a leverage position',
              val: combineArray((pos, fundingFee) => formatReadableUSD(pos.collateral - fundingFee), config.tradeState.position, config.tradeState.fundingFee),
            }),
          ),
          $row(layoutSheet.spacing, style({ alignItems: 'center' }))(


            $Dropdown({
              // $container: $row(style({ position: 'relative', alignSelf: 'center',  })),
              $selection: switchLatest(combineArray((isIncrease, wallet) => {
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
                    // $text(isIncrease ? 'Deposit' : 'Withdraw'),
                    $WalletLogoMap[wallet?.walletName || IWalletName.none],
                    // $icon({ $content: isIncrease ? $walletConnectLogo : $walletConnectLogo, width: '18px', viewBox: '0 0 32 32' }),

                    $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginRight: '-5px' }), viewBox: '0 0 32 32' }),
                  )
                )
              }, config.tradeConfig.isIncrease, config.walletLink.wallet)),
              value: {
                value: config.tradeConfig.isIncrease,
                // $container: $defaultSelectContainer(style({ minWidth: '100px', right: 0 })),
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

            switchLatest(map((provider) => {
              const chain: CHAIN = provider ? provider.network.chainId : CHAIN.ARBITRUM

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
                  $container: $defaultSelectContainer(style({ minWidth: '350px', left: 0 })),
                  $$option: map(option => {
                    const token = resolveAddress(chain, option)
                    const balanceAmount = fromPromise(getErc20Balance(option, provider))
                    const price = tradeReader.getPrimaryPrice(token)
                    const tokenDesc = option === AddressZero ? getNativeTokenDescription(chain) : getTokenDescription(option)

                    return $row(style({ placeContent: 'space-between', flex: 1 }))(
                      $tokenLabelFromSummary(tokenDesc),
                      $column(style({ alignItems: 'flex-end' }))(
                        $text(map(bn => readableNumber(formatFixed(bn, tokenDesc.decimals)), balanceAmount)),
                        $text(style({ color: pallete.foreground, fontSize: '0.75em' }))(combineArray((bn, price) => {
                          return formatReadableUSD(getTokenUsd(bn, price, tokenDesc.decimals))
                        }, balanceAmount, price)),
                      )
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
            }, config.walletLink.provider)),

            $field(
              O(
                map(node =>
                  merge(
                    now(node),
                    filterNull(snapshot((state, val) => {
                      if (val === 0n) {
                        node.element.value = ''
                      } else {
                        const formatted = formatFixed(val, state.inputTokenDescription.decimals)

                        node.element.value = readableNumber(formatted)
                      }

                      return null
                    }, combineObject({ inputTokenDescription }), autoFillCollateralToken))
                  )
                ),
                switchLatest
              ),
              styleInline(map(focus => focus === ITradeFocusMode.collateral ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(nodeEvent('focus'), constant(ITradeFocusMode.collateral)),
              inputCollateralDeltaTetherUsd(nodeEvent('input'), src => snapshot((state, inputEvent) => {
                const target = inputEvent.target

                if (!(target instanceof HTMLInputElement)) {
                  console.warn(new Error('Target is not type of input'))
                  return 0n
                }

                if (target.value === '') {
                  return 0n
                }

                const val = parseReadableNumber(target.value)
                const parsedInput = parseFixed(val, state.inputTokenDescription.decimals)
                return getTokenUsd(parsedInput, state.inputTokenPrice, state.inputTokenDescription.decimals)
              }, combineObject({ inputTokenDescription, inputTokenPrice }), src)),
            )(),
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
                if (state.position.averagePrice > 0n) {

                  if (state.focusMode === ITradeFocusMode.size) {
                    const ratio = div(state.position.size + state.sizeDeltaUsd, state.walletBalanceUsd + state.position.collateral - state.fundingFee)
                    return bnDiv(ratio, LIMIT_LEVERAGE)
                  }
                  const totalCollateral = state.collateralDeltaUsd + state.position.collateral - state.fundingFee

                  return Math.max(MIN_LEVERAGE_NORMAL, bnDiv(div(state.position.size, totalCollateral), LIMIT_LEVERAGE))
                }

                return MIN_LEVERAGE_NORMAL
              }

              if (state.focusMode === ITradeFocusMode.size) {
                const totalSize = state.sizeDeltaUsd + state.position.size

                if (state.position.averagePrice > 0n) {
                  return bnDiv(div(totalSize, state.position.collateral - state.fundingFee), LIMIT_LEVERAGE)
                }

                return 0
              }



              return 0
            }, combineObject({ sizeDeltaUsd, walletBalanceUsd, position, collateralDeltaUsd, fundingFee, focusMode, isIncrease })),
            max: map(state => {

              if (state.position.averagePrice === 0n) {
                return 1
              }


              const totalSize = state.position.size + state.sizeDeltaUsd

              if (state.isIncrease) {
                if (state.focusMode === ITradeFocusMode.size) {

                  // return 1
                  const ratio = div(totalSize, state.position.collateral - state.fundingFee)
                  const newLocal = bnDiv(ratio, LIMIT_LEVERAGE)
                  return Math.min(1, newLocal)
                }

                return 1
              } else {
                if (state.focusMode === ITradeFocusMode.collateral) {
                  const totalCollateral = state.position.collateral - state.fundingFee + state.collateralDeltaUsd
                  const ratio = div(state.position.size, totalCollateral)

                  return Math.min(1, bnDiv(ratio, LIMIT_LEVERAGE))
                }
              }

              return 1
            }, combineObject({ position, fundingFee, collateralDeltaUsd, sizeDeltaUsd, focusMode, isIncrease })),
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
          $row(layoutSheet.spacing, style({ alignItems: 'center' }))(


            $Dropdown({
              $container: $row(stylePseudo(':hover', { borderColor: `${pallete.primary}` }), style({ position: 'relative', alignSelf: 'center', border: `1px solid ${pallete.middleground}`, padding: '6px 12px', borderRadius: '12px' })),
              $selection: $row(style({ alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '.75em' }))(
                switchLatest(map(isLong => {
                  return $row(layoutSheet.spacingTiny)(
                    $icon({ $content: isLong ? $bull : $bear, width: '18px', viewBox: '0 0 32 32' }),
                    // $text(isLong ? 'Long' : 'Short'),
                  )
                }, config.tradeConfig.isLong)),
                $icon({ $content: $caretDown, width: '24px', svgOps: style({ marginRight: '-5px' }), viewBox: '0 0 32 32' }),
              ),
              value: {
                value: config.tradeConfig.isLong,
                // $container: $defaultSelectContainer(style({ minWidth: '100px', right: 0 })),
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


            switchLatest(map(chain => {
              return $Dropdown<ITokenIndex>({
                $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                  switchLatest(map(option => {
                    const tokenDesc = getTokenDescription(option)

                    return $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', viewBox: '0 0 32 32' })
                  }, config.tradeConfig.indexToken)),
                  $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
                ),
                value: {
                  value: config.tradeConfig.indexToken,
                  $container: $defaultSelectContainer(style({ minWidth: '350px', right: 0 })),
                  $$option: snapshot((isLong, option) => {
                    const tokenDesc = getTokenDescription(option)
                    const liquidity = tradeReader.getAvailableLiquidityUsd(now(option), config.tradeConfig.collateralToken)
                    const fundingRate = tradeReader.getTokenFundingRate(now(option))

                    return $row(style({ placeContent: 'space-between', flex: 1 }))(
                      $tokenLabelFromSummary(tokenDesc),

                      $column(style({ alignItems: 'flex-end' }))(
                        $text(map(rate => readableNumber(formatToBasis(rate)), fundingRate)),
                        $text(style({ fontSize: '.75em', color: pallete.foreground }))(map(amountUsd => formatReadableUSD(amountUsd), liquidity))
                      )
                    )
                  }, config.tradeConfig.isLong),
                  list: config.tokenIndexMap[chain] || [],
                }
              })({
                select: changeIndexTokenTether()
              })
            }, config.walletLink.network)),

            $field(
              O(
                map(node =>
                  merge(
                    now(node),
                    filterNull(snapshot((state, value) => {
                      if (value === 0n) {
                        node.element.value = ''
                      } else {
                        node.element.value = readableNumber(formatFixed(value, state.indexTokenDescription.decimals))
                      }

                      return null
                    }, combineObject({ indexTokenDescription }), autoFillSizeToken))
                  )
                ),
                switchLatest
              ),
              styleInline(map(focus => focus === ITradeFocusMode.size ? { color: pallete.message } : { color: pallete.foreground }, config.tradeConfig.focusMode)),
              switchFocusModeTether(nodeEvent('focus'), constant(ITradeFocusMode.size)),
              inputSizeDeltaTetherUsd(nodeEvent('input'), src => snapshot((state, inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  console.warn(new Error('Target is not type of input'))

                  return 0n
                }

                if (target.value === '') {
                  return 0n
                }

                const parsedInput = parseFixed(parseReadableNumber(target.value), state.indexTokenDescription.decimals)

                return getTokenUsd(parsedInput, state.indexTokenPrice, state.indexTokenDescription.decimals)
              }, combineObject({ indexTokenDescription, indexTokenPrice }), src))
            )(),
          ),

          $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between' }))(
            switchLatest(combineArray((isLong, indexToken) => {
              if (isLong) {
                const tokenDesc = getTokenDescription(indexToken)

                return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                  $row(layoutSheet.spacingTiny, style({ alignItems: 'center', fontSize: '.75em' }))(
                    $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                    $text(tokenDesc.symbol)
                  ),
                  $infoTooltipLabel(
                    `${tokenDesc.symbol} will be deposited & borrowed to maintain a Long Position`,
                    screenUtils.isDesktopScreen ? 'Indexed In' : undefined
                  ),
                )
              }

              return $row(layoutSheet.spacingSmall)(
                $infoTooltipLabel(
                  $text(map(token => `${getTokenDescription(token).symbol} will be borrowed to maintain a Short Position. you can switch with other USD tokens to receive it later`, config.tradeConfig.collateralToken)),
                  screenUtils.isDesktopScreen ? 'Indexed In' : undefined,
                ),
                $Dropdown<ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE>({
                  $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                  $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                    switchLatest(combineArray((collateralToken) => {
                      const tokenDesc = getTokenDescription(collateralToken)

                      return $row(layoutSheet.spacingTiny, style({ fontSize: '.75em', alignItems: 'center' }))(
                        $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                        $text(tokenDesc.symbol)
                      )
                    }, config.tradeConfig.collateralToken)),
                    $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
                  ),
                  value: {
                    value: config.tradeConfig.collateralToken,
                    $container: $defaultSelectContainer(style({ minWidth: '300px', right: 0 })),
                    $$option: map(option => {
                      const tokenDesc = getTokenDescription(option)
                      const liquidity = tradeReader.getAvailableLiquidityUsd(config.tradeConfig.indexToken, now(option))
                      const fundingRate = tradeReader.getTokenFundingRate(now(option))

                      return $row(style({ placeContent: 'space-between', flex: 1 }))(
                        $tokenLabelFromSummary(tokenDesc),

                        $column(style({ alignItems: 'flex-end' }))(
                          $text(map(rate => readableNumber(formatToBasis(rate)), fundingRate)),
                          $text(style({ fontSize: '.75em', color: pallete.foreground }))(map(amountUsd => formatReadableUSD(amountUsd), liquidity))
                        )
                      )
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
            }, config.tradeConfig.isLong, config.tradeConfig.indexToken)),

            $hintNumChange({
              label: screenUtils.isDesktopScreen ? `Size` : undefined,
              change: map((params) => {
                const totalSize = params.sizeDeltaUsd + (params.position.size)

                return formatReadableUSD(totalSize)
              }, combineObject({ sizeDeltaUsd, position })),
              isIncrease: config.tradeConfig.isIncrease,
              tooltip: $column(layoutSheet.spacingSmall)(
                $text('Size amplified by deposited Collateral and Leverage chosen'),
                $text('higher leverage increases liquidation price'),
              ),
              val: map(pos => formatReadableUSD(pos ? pos.size : 0n), config.tradeState.position)
            }),
          ),
        ),
      ),

      $column(style({
        height: `100px`,
        marginTop: `-${BOX_SPACING - 5}px`,
        paddingTop: `${BOX_SPACING - 5}px`,
        placeContent: 'center',
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
              $row(layoutSheet.spacing, style({ padding: '0 16px', margin: 'auto 0', placeContent: 'space-between', alignItems: 'center' }), styleInline(map(mode => ({ display: mode ? 'flex' : 'none' }), inTradeMode)))(
                $column(layoutSheet.spacingTiny)(
                  // $TextField({
                  //   label: 'Slippage %',
                  //   labelStyle: { flex: 1 },
                  //   value: config.tradeConfig.slippage,
                  //   inputOp: style({ width: '60px', maxWidth: '60px', textAlign: 'right', fontWeight: 'normal' }),
                  //   validation: map(n => {
                  //     const val = Number(n)
                  //     const valid = val >= 0
                  //     if (!valid) {
                  //       return 'Invalid Basis point'
                  //     }

                  //     if (val > 5) {
                  //       return 'Slippage should be less than 5%'
                  //     }

                  //     return null
                  //   }),
                  // })({
                  //   change: changeSlippageTether()
                  // }),

                  $row(style({ placeContent: 'space-between' }))(
                    $infoTooltipLabel(

                      $column(layoutSheet.spacingSmall)(
                        $text('Collateral deducted upon your deposit including Borrow fee at the start of every hour. the rate changes based on utilization, it is calculated as (assets borrowed) / (total assets in pool) * 0.01%'),

                        switchLatest(map(params => {
                          const depositTokenNorm = resolveAddress(w3p.chain, params.inputToken)
                          const outputToken = params.isLong ? params.indexToken : params.collateralToken
                          const totalSizeUsd = params.position.size + params.sizeDeltaUsd
                          const nextSize = totalSizeUsd * params.collateralTokenPoolInfo.rate / BASIS_POINTS_DIVISOR / 100n

                          return $column(
                            depositTokenNorm !== outputToken ? $row(layoutSheet.spacingTiny)(
                              $text(style({ color: pallete.foreground }))('Swap'),
                              $text(style({ color: pallete.indeterminate }))(formatReadableUSD(params.swapFee))
                            ) : empty(),
                            $row(layoutSheet.spacingTiny)(
                              $text(style({ color: pallete.foreground }))('Margin'),
                              $text(style({ color: pallete.indeterminate }))(formatReadableUSD(params.marginFee))
                            ),
                            $row(layoutSheet.spacingTiny)(
                              $text(style({ color: pallete.foreground }))('Borrow Rate'),
                              $row(layoutSheet.spacingTiny)(
                                $text(style({ color: pallete.indeterminate }))(formatReadableUSD(nextSize) + ' '),
                                $text(` / 1hr`)
                              )
                            )
                          )
                        }, combineObject({ sizeDeltaUsd, collateralToken, indexToken, swapFee, collateralTokenPoolInfo, position, isLong, inputToken, marginFee })))

                      ),
                      'Fees'
                    ),
                    $text(style({ fontSize: '0.75em', color: pallete.indeterminate }))(map(params => formatReadableUSD(params.marginFee + params.swapFee), combineObject({ swapFee, marginFee }))),
                  ),
                  switchLatest(map(isIncrease => {

                    if (isIncrease) {
                      return $row(layoutSheet.spacing)(
                        $infoTooltipLabel(
                          $column(layoutSheet.spacingTiny)(
                            $text('BLUEBERRY Payback(Referral) code is used to provide a 10% payback'),
                            $text('Payback accumulates every time you trade and is distributed once every week back to your account in ETH or AVAX.'),
                            $row(layoutSheet.spacingTiny)(
                              $text(style({ color: pallete.foreground }))('Open + Close Payback'),
                              $text(style({ color: pallete.positive }))(map(params => getRebateDiscountUsd(params.marginFee * 2n), combineObject({ marginFee })))
                            ),
                            $text('Testnet competition incentives'),
                            $text(style({ color: pallete.positive }))('Tournament competition prize pool is boosted during testnet'),
                          ),
                          'Payback'
                        ),
                        $text(style({ color: pallete.positive, fontSize: '0.75em' }))(map(params => getRebateDiscountUsd(params.marginFee * 2n), combineObject({ marginFee })))
                      )
                    }

                    return $row(layoutSheet.spacing)(
                      $infoTooltipLabel(
                        $column(layoutSheet.spacingTiny)(
                          $text('BLUEBERRY Payback(Referral) code is used to provide a 10% payback'),
                          $text('Payback accumulates every time you trade and is distributed once every week back to your account in ETH or AVAX.'),
                        ),
                        'Receive'
                      ),
                      $text(style({ color: pallete.positive, fontSize: '0.75em' }))(map(params => {

                        if (params.position.averagePrice === 0n) {
                          return 0n
                        }

                        const delta = getPnL(params.isLong, params.position.averagePrice, params.indexTokenPrice, -params.sizeDeltaUsd)
                        const adjustedSizeDelta = safeDiv(-params.sizeDeltaUsd * delta, params.position.size)
                        const fees = params.swapFee + params.marginFee
                        const collateralDelta = -params.sizeDeltaUsd === params.position.size
                          ? params.position.collateral - params.fundingFee
                          : -params.collateralDeltaUsd

                        const total = collateralDelta + adjustedSizeDelta - fees
                        const tokenAmount = getTokenAmount(total, params.inputTokenPrice, params.inputTokenDescription.decimals)

                        return `${readableNumber(formatFixed(tokenAmount, params.inputTokenDescription.decimals))} ${params.inputTokenDescription.symbol} (${formatReadableUSD(total)})`
                      }, combineObject({ sizeDeltaUsd, position, collateralDeltaUsd, inputTokenDescription, inputTokenPrice, marginFee, swapFee, indexTokenPrice, isLong, fundingFee })))
                    )
                  }, config.tradeConfig.isIncrease))


                ),

                $column(layoutSheet.spacingSmall, style({ flex: 1, alignItems: 'flex-end' }))(
                  switchLatest(combineArray((isPluginEnabled, isEnabled, isInputTokenApproved, inputToken, inputTokenDesc) => {
                    if (!isPluginEnabled || !isEnabled) {
                      return $Popover({
                        $target: $row(
                          $ButtonSecondary({
                            $content: $text('Enable GMX'),
                            disabled: mergeArray([
                              dismissEnableTradingOverlay,
                              openEnableTradingPopover
                            ])
                          })({
                            click: openEnableTradingPopoverTether()
                          })
                        ),
                        $popContent: map(() => {

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
                                $content: $text(!isPluginEnabled ? 'Enable GMX & Agree' : 'Agree')
                              })({
                                click: clickEnablePluginTether(
                                  snapshot((router) => {
                                    return router.approvePlugin(positionRouterAddress)
                                  }, tradeReader.routerReader.contract),
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
                      })({
                        overlayClick: dismissEnableTradingOverlayTether(constant(false))
                      })
                    }

                    if (!isInputTokenApproved) {

                      return $ButtonPrimary({
                        $content: $text(`Approve ${inputTokenDesc.symbol}`)
                      })({
                        click: approveInputTokenTether(
                          map(async (c) => {
                            const erc20 = ERC20__factory.connect(inputToken, w3p.signer)

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

                    return $row(layoutSheet.spacingSmall)(
                      style({ padding: '8px', fontSize: '.75em', alignSelf: 'center' })(
                        $ButtonSecondary({ $content: $text('Reset') })({
                          click: clickResetTradeModeTether()
                        })
                      ),
                      $ButtonPrimaryCtx({
                        ctx: map(req => req.ctxQuery, clickRequestTrade),
                        disabled: map((error) => {

                          if (error) {
                            return true
                          }

                          return false
                        }, validationError),
                        $content: $text(map(params => {
                          // const outputToken = getTokenDescription(params.indexToken)

                          let modLabel: string

                          if (params.position.averagePrice > 0n) {
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
                        }, combineObject({ position, sizeDeltaUsd, isIncrease }))),
                        alert: validationError
                      })({
                        click: clickRequestTradeTether(
                          snapshot(({ state, positionRouter }) => {

                            const inputAddress = resolveAddress(w3p.chain, state.inputToken)
                            const outputToken = state.isLong ? state.indexToken : state.collateralToken

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
                                ? positionRouter.createIncreasePositionETH(
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
                                : positionRouter.createIncreasePosition(
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
                              : positionRouter.createDecreasePosition(
                                path,
                                state.indexToken,
                                // flip values. Contract code is using `uint` integers
                                -state.collateralDeltaUsd,
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
                          }, combineObject({ state: tradeState, positionRouter: tradeReader.positionRouterReader.contract })),
                          multicast
                        )
                      })
                    )
                  }, tradeReader.getIsPluginEnabled(w3p.address), config.tradeState.isTradingEnabled, config.tradeState.isInputTokenApproved, config.tradeConfig.inputToken, config.tradeState.inputTokenDescription))
                ),
              ),

              styleInline(map(mode => ({ display: mode ? 'none' : 'flex' }), inTradeMode))(
                $IntermediatePromise({
                  query: combineArray((a, b) => Promise.all([a, b]), config.pricefeed, config.trade),
                  $$done: snapshot((pos, [pricefeed, trade]) => {
                    if (trade === null) {
                      const tokenDesc = getTokenDescription(pos.indexToken)
                      const route = pos.isLong ? `Long-${tokenDesc.symbol}` : `Short-${tokenDesc.symbol}/${getTokenDescription(pos.collateralToken).symbol}`

                      return $row(style({ flex: 1, placeContent: 'center', alignItems: 'center' }), styleInline(map(mode => ({ display: mode ? 'none' : 'flex' }), inTradeMode)))(
                        $text(style({ color: pallete.foreground }))(`no ${route} position open`)
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
                        fontSize: '1.5em', alignItems: 'baseline', padding: '20px', background: `radial-gradient(${colorAlpha(invertColor(pallete.message), .7)} 9%, transparent 63%)`,
                        lineHeight: 1,
                        fontWeight: "bold",
                        zIndex: 10,
                        position: 'absolute',
                        width: '50%',
                        left: '50%',
                        top: '50%',
                        transform: 'translate3d(-50%, -70%, 0)'
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
                        chartConfig: {
                          timeScale: {
                            visible: false
                          }
                        },
                        latestPrice: config.tradeState.indexTokenPrice
                      })({
                        crosshairMove: crosshairMoveTether(),
                        // requestPricefeed: requestTradePricefeedTether()
                      })
                    )
                  }, config.tradeState.position)
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
        snapshot(isIncrease => isIncrease ? ITradeFocusMode.collateral : ITradeFocusMode.size, config.tradeConfig.isIncrease, clickMax),
        switchFocusMode,
      ]),
      leverage: mergeArray([
        filterNull(snapshot(state => {
          if (state.position.size === 0n) {
            return null
          }

          return div(state.position.size, state.position.collateral - state.fundingFee)
        }, combineObject({ position, fundingFee }), resetTrade)),
        slideLeverage
      ]),
      switchIsIncrease,
      changeCollateralToken,
      changeCollateralDeltaUsd: mergeArray([
        inputCollateralDeltaUsd,
        autoFillCollateralUsd
      ]),
      changeSizeDeltaUsd: mergeArray([
        autoFillSizeUsd,
        inputSizeDeltaUsd,
      ]),
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



const $field = $element('input')(attr({ placeholder: '0.0', type: 'text' }), style({ width: '100%', textAlign: 'right', lineHeight: '34px', margin: '14px 0', fontFamily: '-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif', minWidth: '0', transition: 'background 500ms ease-in', flex: 1, fontSize: '1.5em', background: 'transparent', border: 'none', outline: 'none', color: pallete.message }))



function getRebateDiscountUsd(amountUsd: bigint) {
  return formatReadableUSD(amountUsd * 1000n / BASIS_POINTS_DIVISOR)
}
