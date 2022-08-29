import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { component, INode, $element, attr, style, $text, nodeEvent, stylePseudo, $node, styleBehavior, motion, MOTION_NO_WOBBLE } from "@aelea/dom"
import { $row, layoutSheet, $icon, $column, state, $NumberTicker, $Checkbox } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import {
  ARBITRUM_ADDRESS_LEVERAGE, AddressZero, TOKEN_DESCRIPTION_MAP, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, ARBITRUM_ADDRESS, formatFixed, readableNumber,
  MAX_LEVERAGE_NORMAL, TradeAddress, TOKEN_SYMBOL, parseFixed, formatReadableUSD, BASIS_POINTS_DIVISOR,
  ITrade, IVaultPosition, IChainParamApi, isTradeSettled, getDelta, ARBITRUM_ADDRESS_TRADE, USD_DECIMALS, getMultiplier, getTokenAmount, TokenDescription, MAX_LEVERAGE, getBasisMultiplier, getRatio, replayState
} from "@gambitdao/gmx-middleware"
import { $alertIcon, $bear, $bull, $tokenIconMap, $tokenLabelFromSummary, $Tooltip } from "@gambitdao/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { merge, multicast, mergeArray, now, snapshot, map, switchLatest, filter, skipRepeats, empty } from "@most/core"
import { Stream } from "@most/types"
import { $Slider } from "../$ButterflySlider"
import { $ButtonPrimary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $card } from "../../elements/$common"
import { $caretDown } from "../../elements/$icons"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { CHAIN_NATIVE_TO_ADDRESS, getTokenDescription } from "./utils"
import { IEthereumProvider } from "eip1193-provider"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { WALLET } from "../../logic/provider"
import { $TradePnlHistory } from "./$TradeCardPreview"
import { $label } from "../../common/$TextField"
import { BrowserStore } from "../../logic/store"



export interface ITradeState {
  trade: Stream<ITrade | null>
  vaultPosition: Stream<IVaultPosition | null>
  collateralUsd: Stream<bigint>
  inputTokenPrice: Stream<bigint>
  collateralTokenPrice: Stream<bigint>
  indexTokenPrice: Stream<bigint>
  walletBalance: Stream<bigint>

  swapFee: Stream<bigint>
  marginFee: Stream<bigint>
  fee: Stream<bigint>

  inputTokenDescription: Stream<TokenDescription>
  indexTokenDescription: Stream<TokenDescription>
  collateralTokenDescription: Stream<TokenDescription>

  averagePrice: Stream<bigint | null>
  liquidationPrice: Stream<bigint | null>

  // validationError: Stream<string | null>
}

export interface ITradeParams {
  isLong: Stream<boolean>
  // focusFactor: Stream<number>

  inputToken: Stream<TradeAddress>
  collateralToken: Stream<ARBITRUM_ADDRESS_TRADE>
  indexToken: Stream<ARBITRUM_ADDRESS_LEVERAGE>
  isIncrease: Stream<boolean>

  collateralRatio: Stream<number>
  leverage: Stream<number>
  collateral: Stream<bigint>
  size: Stream<bigint>
}

interface ITradeBox {
  store: BrowserStore<string, "ROOT.GBC-TRADING">
  chain: IChainParamApi['chain'],

  tradeParams: ITradeParams
  state: ITradeState

  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">
}


export const $TradeBox = ({ chain, state, tradeParams, walletLink, walletStore, store }: ITradeBox) => component((
  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,

  [inputCollateral, inputCollateralTether]: Behavior<INode, bigint>,
  [inputSizeDelta, inputSizeDeltaTether]: Behavior<INode, bigint>,

  [changeInputToken, changeInputTokenTether]: Behavior<TradeAddress, TradeAddress>,
  [changeCollateralToken, changeCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_TRADE, ARBITRUM_ADDRESS_TRADE>,
  [changeIndexToken, changeIndexTokenTether]: Behavior<TradeAddress, TradeAddress>,

  // [changeWithdrawCollateralToken, changeWithdrawCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_TRADE, ARBITRUM_ADDRESS_TRADE>,
  // [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  // [switchIsLong, switchIsLongTether]: Behavior<INode, boolean>,

  [switchIsIncrease, switchisIncreaseTether]: Behavior<boolean, boolean>,
  // [focusCollateral, focusCollateralTether]: Behavior<INode, FocusEvent>,
  // [focusSize, focusSizeTether]: Behavior<INode, FocusEvent>,

  [slideCollateralRatio, slideCollateralRatioTether]: Behavior<number, number>,
  [slideLeverage, slideLeverageTether]: Behavior<number, number>,

  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,

  [clickPrimary, clickPrimaryTether]: Behavior<any, any>,

) => {


  // const {
  //   averagePrice, collateralTokenDescription, collateralTokenPrice, collateralUsd, fee, indexTokenDescription,
  //   indexTokenPrice, inputTokenDescription, inputTokenPrice, liquidationPrice, marginFee,
  //   swapFee, trade, vaultPosition, walletBalance
  // } = config.state
  // const {
  //   collateral, collateralRatio, collateralToken, indexToken, inputToken, isIncrease, isLong, leverage, size
  // } = config.tradeParams


  // walletLink, walletStore, chain, 

  const tradeState = replayState({ ...state, ...tradeParams })


  const validationError = map((params) => {

    if (params.leverage > 1) {
      return `Leverage exceeds ${MAX_LEVERAGE_NORMAL}x`
    }

    if (params.isIncrease) {
      const minLeverage = params.leverage * MAX_LEVERAGE_NORMAL

      if (params.collateral > params.walletBalance) {
        return `Not enough ${params.inputTokenDescription.symbol} in connected account`
      }

      if (minLeverage < 1.1) {
        return `Leverage below 1.1x`
      }

    }

    if (!params.isIncrease && !params.vaultPosition) {
      return `No ${params.indexTokenDescription.symbol} position to reduce`
    }

    if (params.vaultPosition && !params.isIncrease) {

      const totalSize = params.vaultPosition.size - params.size
      const pnl = getDelta(params.vaultPosition.averagePrice, params.indexTokenPrice, totalSize)

      const netCollateral = params.vaultPosition.collateral + pnl

      if (params.collateralUsd + params.fee > netCollateral) {
        return `Exceeding liquidation price`
      }
    }

    return null
  }, tradeState)

  return [
    $card(style({ gap: '20px', padding: '15px' }))(

      $column(layoutSheet.spacing)(
        $row(layoutSheet.spacingSmall, style({ position: 'relative', alignItems: 'center' }))(

          // (
          //   // styleBehavior(map(isIncrease => isIncrease === 0 ? {} : { color: pallete.foreground, backgroundColor: 'transparent' }, state.focusFactor)),
          //   focusCollateralTether(nodeEvent('focus'))
          // )
          $field(
            O(
              map(node =>
                merge(
                  now(node),
                  filter(() => false, snapshot(params => {
                    node.element.value = formatFixed(params.collateral, params.isIncrease ? params.inputTokenDescription.decimals : params.inputTokenDescription.decimals).toString()
                  }, tradeState, mergeArray([slideCollateralRatio, tradeParams.isIncrease])))
                )
              ),
              switchLatest
            ),

            inputCollateralTether(nodeEvent('input'), snapshot((params, inputEvent) => {
              const target = inputEvent.currentTarget

              if (!(target instanceof HTMLInputElement)) {
                throw new Error('Target is not type of input')
              }

              const decimals = params.isIncrease ? params.inputTokenDescription.decimals : params.indexTokenDescription.decimals
              return BigInt(parseFixed(target.value.replace(/(\+|-)/, ''), decimals))
            }, tradeState)),
          )(),

          $label(layoutSheet.spacingSmall, style({ alignItems: 'center', flexDirection: 'row', fontSize: '0.75em' }))(
            $Checkbox({
              value: map(x => !x, tradeParams.isIncrease)
            })({
              check: switchisIncreaseTether(map(x => !x))
            }),
            $text('Withdraw'),
          ),

          $Dropdown<TradeAddress>({
            $container: $row(style({ position: 'relative', alignSelf: 'center' })),
            $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
              switchLatest(map(option => {
                const symbol = option === CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN]
                  ? TOKEN_SYMBOL.WETH
                  : CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : option]

                return $icon({
                  $content: $tokenIconMap[symbol],
                  svgOps: styleBehavior(map(isIncrease => ({ fill: isIncrease ? pallete.message : pallete.indeterminate }), tradeParams.isIncrease)),
                  width: '34px', viewBox: '0 0 32 32'
                })
              }, tradeParams.inputToken)),
              $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
            ),
            value: {
              value: tradeParams.inputToken,
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
            select: changeInputTokenTether()
          }),
        ),
        $row(layoutSheet.spacingSmall, style({ alignItems: 'center', placeContent: 'stretch' }))(
          $hintInput(
            now(`Collateral`),
            map(pos => formatReadableUSD(pos?.collateral || 0n), state.vaultPosition),
            combineArray((collateralUsd, vaultPosition, isIncrease, collateralRatio) => {

              const posCollateral = vaultPosition?.collateral || 0n

              if (isIncrease) {
                return formatReadableUSD(posCollateral + collateralUsd)
              }

              const ratio = BigInt(Math.floor(Math.abs(collateralRatio) * Number(BASIS_POINTS_DIVISOR)))
              const netCollateral = posCollateral - collateralUsd

              return formatReadableUSD(netCollateral * (BASIS_POINTS_DIVISOR - ratio) / BASIS_POINTS_DIVISOR)
            }, state.collateralUsd, state.vaultPosition, tradeParams.isIncrease, tradeParams.collateralRatio)

            // map((params) => {
            //   const posCollateral = params.vaultPosition?.collateral || 0n

            //   if (params.isIncrease) {
            //     return formatReadableUSD(posCollateral + params.collateralUsd - params.fee)
            //   }

            //   if (!params.vaultPosition || params.size === params.vaultPosition.size) {
            //     return formatReadableUSD(0n)
            //   }

            //   const pnl = getDelta(params.vaultPosition.averagePrice, params.indexTokenPrice, params.vaultPosition.size)
            //   const adjustedPnlDelta = pnl * params.size / params.vaultPosition.size

            //   const netCollateral = (params.vaultPosition.collateral || 0n) + adjustedPnlDelta
            //   const ratio = BigInt(Math.floor(Math.abs(params.collateralRatio) * Number(BASIS_POINTS_DIVISOR)))

            //   return formatReadableUSD(netCollateral * (BASIS_POINTS_DIVISOR - ratio) / BASIS_POINTS_DIVISOR)
            // }, tradeState)
          ),

          $node(style({ flex: 1 }))(),

          O(stylePseudo(':hover', { color: pallete.primary }))(
            $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
              $text(style({ color: pallete.foreground }))(`Balance`),
              $text(combineArray((tokenDesc, balance) => {

                return readableNumber(formatFixed(balance, tokenDesc.decimals)).toString()
              }, state.indexTokenDescription, state.walletBalance)),
            ),
          ),
        ),
      ),

      style({ margin: '0 -15px' })(
        $Slider({
          color: map(isIncrease => isIncrease ? pallete.middleground : pallete.indeterminate, tradeParams.isIncrease),
          step: 0.01,
          value: tradeParams.collateralRatio,
          thumbSize: 60,
          thumbText: map(n => Math.round(n * 100) + '%')
        })({
          change: slideCollateralRatioTether()
        })
      ),

      $column(layoutSheet.spacing)(
        $row(layoutSheet.spacingSmall, style({ position: 'relative', alignItems: 'center' }))(

          // (
          //   // styleBehavior(map(isIncrease => isIncrease === 1 ? {} : { color: pallete.foreground, backgroundColor: 'transparent' }, state.focusFactor)),
          //   focusSizeTether(nodeEvent('focus'))
          // )
          $field(
            O(
              map(node =>
                merge(
                  now(node),
                  filter(() => false, map(val => {
                    // const valF = formatFixed(val.outputAmountUsd, val.outputTokenDescription.decimals)
                    const valF = formatFixed(val.size, USD_DECIMALS)
                    // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                    node.element.value = valF.toString()

                  }, tradeState))
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
            }, state.indexTokenDescription))
          )(),

          $Dropdown<boolean>({
            $container: $row(style({ position: 'relative' })),
            $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
              switchLatest(map(option => {
                return $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                  $icon({ $content: option ? $bull : $bear, width: '14px', viewBox: '0 0 32 32' }),
                  $text(style({ fontSize: '.75em' }))(option ? 'Long' : 'Short'),
                )
              }, tradeParams.isLong)),
              $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px' }), viewBox: '0 0 32 32' }),
            ),
            value: {
              value: tradeParams.isLong,
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

          $Dropdown<TradeAddress>({
            $container: $row(style({ position: 'relative', alignSelf: 'center' })),
            $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
              switchLatest(map(option => {
                const tokenDesc = TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                return $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', viewBox: '0 0 32 32' })
              }, tradeParams.indexToken)),
              $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
            ),
            value: {
              value: tradeParams.indexToken,
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
            }, tradeState)
          ),

          $node(style({ flex: 1 }))(),

          switchLatest(combineArray((isLong, isIncrease) => {
            if (!isIncrease) {
              return empty()
            }

            if (isLong) {
              return switchLatest(map(option => {
                const tokenDesc = TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                return $row(layoutSheet.spacingTiny, style({ fontSize: '.75em', alignItems: 'center' }))(
                  $text(style({ color: pallete.foreground, marginRight: '3px' }))('Collateral In'),
                  $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                  $text(tokenDesc.symbol)
                )
              }, tradeParams.indexToken))
            }

            return $Dropdown<ARBITRUM_ADDRESS_TRADE>({
              $container: $row(style({ position: 'relative', alignSelf: 'center' })),
              $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                switchLatest(map(option => {
                  const tokenDesc = TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                  return $row(layoutSheet.spacingTiny, style({ fontSize: '.75em', alignItems: 'center' }))(
                    $text(style({ color: pallete.foreground, marginRight: '3px' }))('Collateral In'),
                    $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                    $text(tokenDesc.symbol)
                  )
                }, tradeParams.collateralToken)),
                $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
              ),
              value: {
                value: tradeParams.collateralToken,
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
          }, tradeParams.isLong, tradeParams.isIncrease)),
        ),
      ),

      style({ margin: '0 -15px' })($Slider({
        value: tradeParams.leverage,
        thumbSize: 60,
        color: map(isLong => isLong ? pallete.positive : pallete.negative, tradeParams.isLong),
        min: snapshot((params, { pos, isIncrease }) => {
          if (!isIncrease) {
            return 0
          }

          const totalCollateral = (pos?.collateral || 0n) + params.collateralUsd
          const totalSize = pos?.size || 0n
          const multiplier = getMultiplier(totalSize, totalCollateral) / MAX_LEVERAGE_NORMAL
          return multiplier
        }, tradeState, combineObject({ collateral: tradeParams.collateral, pos: state.vaultPosition, isIncrease: tradeParams.isIncrease })),
        max: snapshot((params, { pos, isIncrease }) => {
          if (isIncrease) {
            return 1
          }

          // const collateralUsd = getTokenUsd(collateral, params.indexTokenPrice, params.indexTokenDescription)
          const totalCollateral = (pos?.collateral || 0n) - params.collateralUsd
          const totalSize = pos?.size || 0n
          const multiplier = getMultiplier(totalSize, totalCollateral) / MAX_LEVERAGE_NORMAL

          return multiplier
        }, tradeState, combineObject({ collateral: tradeParams.collateral, pos: state.vaultPosition, isIncrease: tradeParams.isIncrease })),
        thumbText: map(n => formatLeverageNumber.format(n * MAX_LEVERAGE_NORMAL) + 'x')
      })({
        change: slideLeverageTether()
      })),

      $row(
        $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
          $text(style({ color: pallete.foreground }))('Fees'),
          $Tooltip({
            $anchor: $text(map(params => formatReadableUSD(params.fee), tradeState)),
            $content: switchLatest(map(params => {
              const depositTokenNorm = params.inputToken === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : params.inputToken


              return $column(
                depositTokenNorm !== params.indexToken ? $row(layoutSheet.spacingTiny)(
                  $text(style({ color: pallete.foreground }))('Swap'),
                  $text(formatReadableUSD(params.swapFee))
                ) : empty(),
                $row(layoutSheet.spacingTiny)(
                  $text(style({ color: pallete.foreground }))('Margin'),
                  $text(formatReadableUSD(params.marginFee))
                )
              )
            }, tradeState))
          })({})
        )
      ),

      switchLatest(map(trade => {
        const $container = $column(style({ position: 'relative', margin: '-15px -15px -85px -15px', zIndex: 0, height: '170px' }))

        if (trade === null) {
          return $container()
        }

        const hoverChartPnl: Stream<bigint> = multicast(switchLatest(combineArray(t => {
          if (isTradeSettled(t)) {
            return now(t.realisedPnl - t.fee)
          }

          return map(price => getDelta(t.averagePrice, price, t.size), state.indexTokenPrice)

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

            return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $ButtonPrimary({
                disabled: map(params => {

                  const minLeverage = params.leverage * MAX_LEVERAGE_NORMAL

                  if (params.isIncrease && params.leverage <= 1 && minLeverage >= 1.1 && (params.collateral > 0n || params.size > 0n) && params.collateral <= params.walletBalance) {
                    return false
                  }


                  if (
                    params.vaultPosition && !params.isIncrease && params.leverage <= 1 && (params.size > 0n || params.collateral > 0n)
                    && (params.isLong
                      ? params.liquidationPrice && params.liquidationPrice <= params.indexTokenPrice
                      : params.liquidationPrice && params.liquidationPrice >= params.indexTokenPrice)
                  ) {
                    return false
                  }


                  return true
                }, tradeState),
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
                }, tradeState)),
              })({
                click: clickPrimaryTether()
              }),

              switchLatest(map(error => {
                if (error === null) {
                  return empty()
                }

                return $Tooltip({
                  $content: $text(style({ fontSize: '.75em' }))(error),
                  $anchor: $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '28px', svgOps: style({ fill: pallete.negative, padding: '3px', filter: 'drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 1px)' }) })
                })({})
              }, skipRepeats(validationError)))
            )
          }),
          ensureNetwork: true,
          walletLink: walletLink
        })({ walletChange: walletChangeTether() })
      ),

    ),

    {
      switchIsLong,
      changeInputToken,
      changeIndexToken,
      slideCollateralRatio,
      leverage: mergeArray([
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
        }, tradeState, mergeArray([state.collateralUsd, tradeParams.isIncrease])),
        slideLeverage
      ]),
      switchIsIncrease,
      changeCollateralToken,
      changeCollateral: mergeArray([
        snapshot((params, ratioN) => {
          const ratio = BigInt(Math.floor(Math.abs(ratioN) * Number(BASIS_POINTS_DIVISOR)))

          if (params.isIncrease) {
            return params.walletBalance * ratio / BASIS_POINTS_DIVISOR
          }


          if (!params.vaultPosition) {
            return 0n
          }

          const sizeUsd = (params.vaultPosition.collateral) * ratio / BASIS_POINTS_DIVISOR
          const sizeAmount = getTokenAmount(sizeUsd, params.inputTokenPrice, params.inputTokenDescription)

          return sizeAmount
        }, tradeState, slideCollateralRatio),
        snapshot((params, inIncrease) => {
          const ratio = BigInt(Math.floor(Math.abs(params.collateralRatio) * Number(BASIS_POINTS_DIVISOR)))

          if (inIncrease) {
            return params.walletBalance * ratio / BASIS_POINTS_DIVISOR
          }

          if (!params.vaultPosition) {
            return 0n
          }

          const sizeUsd = (params.vaultPosition.collateral) * ratio / BASIS_POINTS_DIVISOR
          const sizeAmount = getTokenAmount(sizeUsd, params.indexTokenPrice, params.indexTokenDescription)

          return sizeAmount
        }, tradeState, tradeParams.isIncrease),
        inputCollateral,
      ]),
      changeSize: mergeArray([
        // slideLeverage,
        inputSizeDelta,
        snapshot((params, leverage) => {
          const leverageRatio = BigInt(Math.floor(Math.abs(leverage) * Number(BASIS_POINTS_DIVISOR)))
          const leverageMultiplier = MAX_LEVERAGE * leverageRatio / BASIS_POINTS_DIVISOR

          if (!params.vaultPosition) {

            const maxSizeUsd = (params.collateralUsd * MAX_LEVERAGE / BASIS_POINTS_DIVISOR)
            const sizeDelta = (maxSizeUsd * leverageRatio / BASIS_POINTS_DIVISOR)

            return sizeDelta
          }


          if (params.isIncrease) {
            const addCollateral = params.collateralUsd - params.fee
            const collateral = addCollateral + params.vaultPosition.collateral

            const positionMultiplier = getBasisMultiplier(params.vaultPosition.size, collateral)
            const posLeverage = formatFixed(positionMultiplier, 4) / MAX_LEVERAGE_NORMAL

            if (posLeverage === params.leverage) {
              return 0n
            }

            const maxSizeUsd = (collateral * MAX_LEVERAGE / BASIS_POINTS_DIVISOR)
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
          // const outputAmountUsd = nextToUsd * getDenominator(params.indexTokenDescription.decimals) / params.indexTokenPrice

          return params.vaultPosition.size - sizeM
        }, tradeState, slideLeverage),
        // snapshot((params) => {
        //   const posCollateral = params.vaultPosition?.collateral || 0n
        //   const posSize = params.vaultPosition?.size || 0n
        //   const totalSize = posSize + params.size

        //   if (params.isIncrease) {
        //     const totalCollateral = posCollateral + params.collateralUsd
        //     return getMultiplier(totalSize, totalCollateral) / MAX_LEVERAGE_NORMAL
        //   }

        //   if (!params.vaultPosition) {
        //     return 0
        //   }

        //   return getMultiplier(posSize - params.size, posCollateral - params.collateralUsd) / MAX_LEVERAGE_NORMAL
        // }, tradeState, mergeArray([state.collateralUsd, delay(30, inputSizeDelta), state.vaultPosition]))
      ]),

      // focusFactor: skipRepeats(mergeArray([
      //   mergeArray([constant(1, slideLeverage), constant(0, slideCollateralRatio)]),
      //   // constant(0, clickMaxBalanceValue),
      //   // constant(1, clickMaxEditPosition),
      //   constant(0, focusCollateral),
      //   constant(1, focusSize)
      // ])),
      walletChange,

      changeCollateralRatio: mergeArray([
        slideCollateralRatio,
        snapshot(params => {
          if (params.isIncrease) {
            return getRatio(params.walletBalance, params.collateral)
          }

          return params.vaultPosition ? getRatio(params.vaultPosition.collateral, params.collateral) : 0n
        }, tradeState, combineObject({ switchIsIncrease, inputCollateral }))
      ]),

      // state
      // changeCollateralUsd,

      // fee, swapFee, marginFee,
      // averagePrice, liquidationPrice,
      // walletBalance, inputTokenDescription, collateralTokenDescription,
      // indexTokenDescription, indexTokenCumulativeFundingRate,


      // // none trade related


      // requestTrade,

      // state
    }
  ]
})


const formatLeverageNumber = new Intl.NumberFormat("en-US", {
  // style: "currency",
  // currency: "USD",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})



const $field = $element('input')(attr({ value: '0.0', type: 'number' }), style({ fontFamily: '-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif', minWidth: '0', transition: 'background 500ms ease-in', flex: 1, fontSize: '1.55em', background: 'transparent', border: 'none', height: '35px', outline: 'none', color: pallete.message }))

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
