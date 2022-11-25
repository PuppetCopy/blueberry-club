import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { component, INode, $element, attr, style, $text, nodeEvent, stylePseudo, $node, styleBehavior, motion, MOTION_NO_WOBBLE } from "@aelea/dom"
import { $row, layoutSheet, $icon, $column, screenUtils, $TextField, $NumberTicker, $Popover } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import {
  ARBITRUM_ADDRESS_INDEX, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, ARBITRUM_ADDRESS, formatFixed, readableNumber,
  parseFixed, formatReadableUSD, BASIS_POINTS_DIVISOR,
  ITrade, IVaultPosition, getTokenAmount, TokenDescription, LIMIT_LEVERAGE, bnDiv, replayState,
  div, StateStream, getPnL, MIN_LEVERAGE, formatToBasis, ARBITRUM_ADDRESS_STABLE, AVALANCHE_ADDRESS_STABLE, AVALANCHE_ADDRESS_INDEX, isTradeSettled, CHAIN, unixTimestampNow, query, fromJson, AddressInput, AddressIndex, AddressStable, AddressZero
} from "@gambitdao/gmx-middleware"
import { $alertIcon, $anchor, $ButtonToggle, $infoTooltip, $tokenIconMap, $tokenLabelFromSummary, $Tooltip, getPricefeedVisibleColumns } from "@gambitdao/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { merge, multicast, mergeArray, now, snapshot, map, switchLatest, filter, skipRepeats, empty, combine, fromPromise, constant, sample, startWith, skipRepeatsWith, awaitPromises, debounce } from "@most/core"
import { Stream } from "@most/types"
import { $Slider } from "../$Slider"
import { $ButtonPrimary, $ButtonPrimaryCtx, $ButtonSecondary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $card } from "../../elements/$common"
import { $caretDown } from "../../elements/$icons"
import { CHAIN_NATIVE_TO_ADDRESS, getTokenDescription, resolveAddress } from "../../logic/utils"
import { IEthereumProvider } from "eip1193-provider"
import { $IntermediateConnectButton } from "../../components/$ConnectAccount"
import { WALLET } from "../../logic/provider"
import { BrowserStore } from "../../logic/store"
import { connectErc20, connectTrade, connectVault, getErc20Balance } from "../../logic/contract/trade"
import { MouseEventParams } from "lightweight-charts"
import { $TradePnlHistory } from "./$TradePnlHistory"
import { ContractTransaction } from "@ethersproject/contracts"
import { MaxUint256 } from "@ethersproject/constants"
import { getContract } from "../../logic/common"



export interface ITradeParams {
  isTradingEnabled: boolean
  isInputTokenApproved: boolean

  vaultPosition: IVaultPosition | null
  collateralDeltaUsd: bigint
  inputTokenPrice: bigint
  collateralTokenPrice: bigint
  // availableLiquidityUsd: bigint
  indexTokenPrice: bigint
  walletBalance: bigint

  swapFee: bigint
  marginFee: bigint
  executionFee: bigint
  fee: bigint

  inputTokenDescription: TokenDescription
  indexTokenDescription: TokenDescription
  collateralTokenDescription: TokenDescription

  averagePrice: bigint | null
  liquidationPrice: bigint | null
}

export interface ITradeConfig {
  trade: ITrade | null
  isLong: boolean

  inputToken: AddressInput
  shortCollateralToken: ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE
  indexToken: ARBITRUM_ADDRESS_INDEX | AVALANCHE_ADDRESS_INDEX
  isIncrease: boolean

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
  chainList: CHAIN[],
  chain: CHAIN | null
  indexTokens: AddressIndex[]
  stableTokens: AddressStable[]
  store: BrowserStore<"ROOT.v1.trade", string>

  tradeConfig: StateStream<ITradeConfig> // ITradeParams
  tradeState: StateStream<ITradeParams>

  walletLink: IWalletLink
  walletStore: BrowserStore<"ROOT.v1.walletStore", WALLET | null>
}


export const $TradeBox = (config: ITradeBox) => component((
  [openEnableTradingPopover, openEnableTradingPopoverTether]: Behavior<any, any>,
  [enableTrading, enableTradingTether]: Behavior<any, boolean>,
  [approveInputToken, approveInputTokenTether]: Behavior<PointerEvent, boolean>,
  [clickEnablePlugin, clickEnablePluginTether]: Behavior<PointerEvent, Promise<ContractTransaction>>,

  [dismissEnableTradingOverlay, dismissEnableTradingOverlayTether]: Behavior<false, false>,

  [switchIsLong, switchIsLongTether]: Behavior<boolean, boolean>,

  [inputCollateral, inputCollateralTether]: Behavior<INode, bigint>,
  [inputSizeDelta, inputSizeDeltaTether]: Behavior<INode, bigint>,

  [changeInputToken, changeInputTokenTether]: Behavior<AddressInput, AddressInput>,
  [changeIndexToken, changeIndexTokenTether]: Behavior<AddressIndex, AddressIndex>,
  [changeCollateralToken, changeCollateralTokenTether]: Behavior<ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE, ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE>,

  [switchIsIncrease, switchisIncreaseTether]: Behavior<boolean, boolean>,
  [slideCollateralRatio, slideCollateralRatioTether]: Behavior<number, bigint>,
  [slideLeverage, slideLeverageTether]: Behavior<number, bigint>,
  [changeSlippage, changeSlippageTether]: Behavior<string, string>,

  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
  [clickRequestTrade, clickRequestTradeTether]: Behavior<PointerEvent, PointerEvent>,

  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  [clickReset, clickResetTether]: Behavior<any, any>,

) => {

  const vault = connectVault(config.walletLink.provider)
  const trade = connectTrade(config.walletLink.provider)
  const position = connectTrade(config.walletLink.provider)

  const chain = config.chain || CHAIN.ARBITRUM
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

    if (!state.isIncrease && !state.vaultPosition) {
      return `No ${state.indexTokenDescription.symbol} position to reduce`
    }

    if (state.vaultPosition && state.liquidationPrice && (state.isLong ? state.liquidationPrice > state.indexTokenPrice : state.liquidationPrice < state.indexTokenPrice)) {
      return `Exceeding liquidation price`
    }

    return null
  }, tradeState)


  const ratioAdjustments = mergeArray([sample(slideCollateralRatio, config.tradeState.walletBalance), slideCollateralRatio])

  const slideCollateral = snapshot((params, ratio) => {
    if (params.isIncrease) {
      return params.walletBalance * ratio / BASIS_POINTS_DIVISOR
    }

    if (!params.vaultPosition) {
      return 0n
    }

    // const positionCollateral = params.vaultPosition.collateral * (BASIS_POINTS_DIVISOR - DEPOSIT_FEE) / BASIS_POINTS_DIVISOR
    const positionCollateralUsd = params.vaultPosition.collateral / BASIS_POINTS_DIVISOR
    const removeCollateral = positionCollateralUsd * ratio
    const amount = getTokenAmount(removeCollateral, params.inputTokenPrice, params.inputTokenDescription)

    return amount
  }, tradeState, ratioAdjustments)


  const changeSizeByRatio = snapshot((params, leverage) => {
    const collateral = params.collateralDeltaUsd + (params.vaultPosition?.collateral || 0n)
    const size = collateral * leverage / BASIS_POINTS_DIVISOR

    if (!params.vaultPosition) {
      return size
    }

    const currentMultiplier = div(params.vaultPosition.size, collateral)

    if (params.isIncrease) {

      if (currentMultiplier >= leverage) {
        return 0n
      }

      return size - params.vaultPosition.size
    }

    const sizeM = (params.vaultPosition.collateral - params.collateralDeltaUsd) * leverage / BASIS_POINTS_DIVISOR

    return params.vaultPosition.size - sizeM

  }, tradeState, slideLeverage)

  const sizeChangeEffect = mergeArray([
    constant(0n, clickReset),
    inputSizeDelta,
    sample(config.tradeConfig.sizeDelta, config.tradeState.collateralDeltaUsd)
  ])

  const initialLeverage = map(pos => {
    if (!pos) {
      return 0n
    }

    return div(pos.size, pos.collateral)
  }, config.tradeState.vaultPosition)



  const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))

  const pnlCrossHairTime = map((cross: MouseEventParams) => {
    if (cross) {
      return cross.seriesPrices.values().next().value
    }

    return null
  }, pnlCrossHairTimeChange)

  const BOX_SPACING = '20px'

  const MAX_LEVERAGE_NORMAL = formatToBasis(LIMIT_LEVERAGE)

  const clickResetVal = constant(0n, clickReset)


  const requestTrade = multicast(snapshot(({ state, trade, account }) => {
    if (trade === null || account === null) {
      throw new Error('No wallet provider connected')
    }

    const inputAddress = resolveAddress(chain, state.inputToken)
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
        ? trade.contract.createIncreasePositionETH(
          path,
          state.indexToken,
          0,
          state.sizeDelta,
          state.isLong,
          acceptablePrice,
          state.executionFee,
          config.referralCode,
          AddressZero,
          { value: state.collateralDelta + state.executionFee }
        )
        : trade.contract.createIncreasePosition(
          path,
          state.indexToken,
          state.collateralDelta,
          0,
          state.sizeDelta,
          state.isLong,
          acceptablePrice,
          state.executionFee,
          config.referralCode,
          AddressZero,
          { value: state.executionFee }
        ))
      : trade.contract.createDecreasePosition(
        path,
        state.indexToken,
        state.collateralDelta,
        state.sizeDelta,
        state.isLong,
        account,
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
  }, combineObject({ trade: position.positionRouter.contract, state: tradeState, account: config.walletLink.account }), clickRequestTrade))



  const newLocal_1 = switchLatest(map(trade => {
    if (!trade) {
      return now(null)
    }

    const to = unixTimestampNow()
    const from = trade.timestamp

    const intervalTime = getPricefeedVisibleColumns(160, from, to)
    const params = { tokenAddress: '_' + trade.indexToken, interval: '_' + intervalTime, from, to }

    const queryFeed = fromPromise(query.graphClientMap[chain](query.document.pricefeedDoc, params as any, { requestPolicy: 'network-only' }))
    const priceFeedQuery = map(res => res.pricefeeds.map(fromJson.pricefeedJson), queryFeed)

    return map(feed => ({ feed, trade }), priceFeedQuery)
  }, config.tradeConfig.trade))



  return [
    $column(

      $card(screenUtils.isDesktopScreen ? layoutSheet.spacing : layoutSheet.spacing, style({ boxShadow: `2px 2px 13px 3px #00000040`, border: `1px solid ${colorAlpha(pallete.foreground, .15)}`, padding: `${BOX_SPACING} ${BOX_SPACING} 0`, margin: screenUtils.isMobileScreen ? '0 10px' : '' }))(
        $column(layoutSheet.spacing)(
          $row(layoutSheet.spacingSmall, style({ position: 'relative', alignItems: 'center' }))(

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

                      node.element.value = formatFixed(val, params.isIncrease ? params.inputTokenDescription.decimals : params.inputTokenDescription.decimals).toString()
                    }, tradeState, mergeArray([slideCollateral, clickResetVal])))
                  )
                ),
                switchLatest
              ),

              inputCollateralTether(nodeEvent('input'), combine(({ isIncrease, tokenDescription }, inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  throw new Error('Target is not type of input')
                }

                const decimals = isIncrease ? tokenDescription.decimals : tokenDescription.decimals
                return BigInt(parseFixed(target.value.replace(/(\+|-)/, ''), decimals))
              }, combineObject({ tokenDescription: config.tradeState.inputTokenDescription, isIncrease: config.tradeConfig.isIncrease }))),
            )(),


            $ButtonToggle({
              selected: config.tradeConfig.isIncrease,
              options: [
                false,
                true,
              ],
              $$option: map(option => {
                return $text(style({ fontSize: '0.85em' }))(option ? 'Increase' : 'Reduce')
              })
            })({ select: switchisIncreaseTether() }),

            $Dropdown<AddressInput>({
              $container: $row(style({ position: 'relative', alignSelf: 'center' })),
              $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                switchLatest(map(option => {
                  const symbol = CHAIN_TOKEN_ADDRESS_TO_SYMBOL[resolveAddress(chain, option)]

                  return $icon({
                    $content: $tokenIconMap[symbol],
                    svgOps: styleBehavior(map(isIncrease => ({ fill: isIncrease ? pallete.message : pallete.indeterminate }), config.tradeConfig.isIncrease)),
                    width: '34px', viewBox: '0 0 32 32'
                  })
                }, config.tradeConfig.inputToken)),
                $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
              ),
              value: {
                value: config.tradeConfig.inputToken,
                $container: $defaultSelectContainer(style({ minWidth: '300px', right: 0 })),
                $$option: combine(({ w3p, account }, option) => {
                  const tokenDesc = getTokenDescription(chain, option)
                  const balanceAmount = fromPromise(getErc20Balance(option, w3p, account))

                  return $row(style({ placeContent: 'space-between', flex: 1 }))(
                    $tokenLabelFromSummary(tokenDesc),
                    $text(map(bn => readableNumber(formatFixed(bn, tokenDesc.decimals)), balanceAmount))
                  )
                }, combineObject({ w3p: config.walletLink.provider, account: config.walletLink.account })),
                list: [
                  AddressZero,
                  ...config.indexTokens,
                  ...config.stableTokens,
                ],
              }
            })({
              select: changeInputTokenTether()
            }),
          ),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center', placeContent: 'stretch' }))(
            $hintInput(
              now(`Collateral`),
              config.tradeConfig.isIncrease,
              'The amount you will deposit to open a leverage position',
              map(pos => formatReadableUSD(pos?.collateral || 0n), config.tradeState.vaultPosition),
              combineArray(params => {

                const posCollateral = params.vaultPosition?.collateral || 0n

                if (params.isIncrease) {
                  const totalCollateral = posCollateral + params.collateralDeltaUsd
                  const collateralUsd = formatReadableUSD(totalCollateral - params.fee)

                  return collateralUsd
                }

                if (!params.vaultPosition) {
                  return formatReadableUSD(0n)
                }

                const pnl = getPnL(params.isLong, params.vaultPosition.averagePrice, params.indexTokenPrice, params.vaultPosition.size)
                const adjustedPnlDelta = pnl < 0n ? pnl * params.sizeDelta / params.vaultPosition.size : 0n
                const netCollateral = posCollateral - params.collateralDeltaUsd + adjustedPnlDelta

                return formatReadableUSD(netCollateral)
              }, tradeState)
            ),

            $node(style({ flex: 1 }))(),

            O(stylePseudo(':hover', { color: pallete.primary }))(
              $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
                $text(style({ color: pallete.foreground }))(`Balance`),
                $text(combineArray((tokenDesc, balance) => {

                  return readableNumber(formatFixed(balance, tokenDesc.decimals))
                }, config.tradeState.inputTokenDescription, config.tradeState.walletBalance)),
              ),
            ),
          ),
        ),

        style({ margin: `0 -${BOX_SPACING}` })(
          $Slider({
            value: map(lm => {
              if (lm === null) {
                return 0
              }

              return bnDiv(lm, BASIS_POINTS_DIVISOR)
            }, config.tradeConfig.collateralRatio),
            color: map(isIncrease => isIncrease ? pallete.middleground : pallete.indeterminate, config.tradeConfig.isIncrease),
            step: 0.01,
            disabled: map(params => !params.isIncrease && params.vaultPosition === null, tradeState),
            // min: map(n => formatBasis(n), state.minCollateralRatio),
            max: map(params => {
              if (params.isIncrease) {
                return 1
              }

              if (!params.vaultPosition) {
                return 0
              }

              const minWithdraw = div(params.vaultPosition.size, LIMIT_LEVERAGE)
              const maxWithdraw = params.vaultPosition.collateral - minWithdraw // - state.fee

              return bnDiv(maxWithdraw, params.vaultPosition.collateral)
            }, tradeState),
            thumbText: map(n => Math.round(n * 100) + '\n%')
          })({
            change: slideCollateralRatioTether(
              map(ratio => {
                const leverageRatio = BigInt(Math.floor(Math.abs(ratio) * Number(BASIS_POINTS_DIVISOR)))

                return leverageRatio
              }),
              multicast
            )
          })
        ),

        $column(layoutSheet.spacing)(
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(


            $field(
              O(
                map(node =>
                  merge(
                    now(node),
                    filter(() => false, combineArray((val, price, tokenDesc) => {

                      if (val === 0n) {
                        node.element.value = ''
                        return
                      }

                      // const valF = formatFixed(val.outputAmountUsd, val.outputTokenDescription.decimals)

                      const amount = getTokenAmount(val, price, tokenDesc)
                      const valF = formatFixed(amount, tokenDesc.decimals)


                      // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                      node.element.value = valF.toString()

                    }, mergeArray([clickResetVal, changeSizeByRatio]), config.tradeState.indexTokenPrice, config.tradeState.indexTokenDescription))
                  )
                ),
                switchLatest
              ),
              inputSizeDeltaTether(nodeEvent('input'), combine((tokenDesc, inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  throw new Error('Target is not type of input')
                }

                return BigInt(parseFixed(target.value.replace(/(\+|-)/, ''), tokenDesc.decimals))
              }, config.tradeState.indexTokenDescription))
            )(),


            $ButtonToggle({
              selected: config.tradeConfig.isLong,
              options: [
                false,
                true,
              ],
              $$option: map(option => {
                return $text(style({ fontSize: '0.85em' }))(option ? 'Long' : 'Short')
              })
            })({ select: switchIsLongTether() }),

            $Dropdown<AddressIndex>({
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
                  const token = CHAIN_NATIVE_TO_ADDRESS[chain] === option ? AddressZero : option

                  const tokenDesc = getTokenDescription(chain, token)
                  const availableLiquidityUsd = vault.getAvailableLiquidityUsd(chain, option, isLong)

                  return $row(style({ placeContent: 'space-between', flex: 1 }))(
                    $tokenLabelFromSummary(tokenDesc),
                    // $text(map(amountUsd => formatReadableUSD(amountUsd), availableLiquidityUsd))
                  )
                }, config.tradeConfig.isLong),
                list: config.indexTokens,
              }
            })({
              select: changeIndexTokenTether()
            }),

          ),

          $row(layoutSheet.spacing, style({ placeContent: 'space-between', padding: '0' }))(
            $hintInput(
              now(`Size`),
              config.tradeConfig.isIncrease,
              'Amount amplified relative to collateral, higher Size to Collateral means higher risk of being liquidated',
              map(pos => formatReadableUSD(pos ? pos.size : 0n), config.tradeState.vaultPosition),

              map((params) => {
                const posSize = params.vaultPosition?.size || 0n

                if (params.isIncrease) {
                  const posCollateral = params.vaultPosition?.collateral || 0n
                  const addCollateral = params.collateralDeltaUsd - params.fee
                  const collateral = addCollateral + posCollateral
                  const sizeDelta = collateral * params.leverage / BASIS_POINTS_DIVISOR

                  return formatReadableUSD(sizeDelta)
                }

                return formatReadableUSD(posSize - params.sizeDelta)
              }, tradeState)
            ),

            $node(style({ flex: 1 }))(),

            switchLatest(combineArray((isLong, indexToken) => {


              if (isLong) {

                const tokenDesc = getTokenDescription(chain, indexToken)

                return $row(layoutSheet.spacingTiny, style({ fontSize: '.75em', alignItems: 'center' }))(
                  $text(style({ color: pallete.foreground, marginRight: '3px' }))('Collateral In'),
                  $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '14px', viewBox: '0 0 32 32' }),
                  $text(tokenDesc.symbol)
                )
              }

              return $Dropdown<ARBITRUM_ADDRESS_STABLE | AVALANCHE_ADDRESS_STABLE>({
                $container: $row(style({ position: 'relative', alignSelf: 'center' })),
                $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
                  switchLatest(combineArray((collateralToken) => {
                    const tokenDesc = getTokenDescription(chain, collateralToken)


                    return $row(layoutSheet.spacingTiny, style({ fontSize: '.75em', alignItems: 'center' }))(
                      $text(style({ color: pallete.foreground, marginRight: '3px' }))('Collateral In'),
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
            }, config.tradeConfig.isLong, config.tradeConfig.indexToken)),
          ),
        ),

        style({ margin: `0 -${BOX_SPACING}` })($Slider({
          value: map(lm => {
            if (lm === null) {
              return 0
            }

            return bnDiv(lm, LIMIT_LEVERAGE)
          }, mergeArray([
            initialLeverage,
            config.tradeConfig.leverage
          ])),
          disabled: map(state => {

            if (state.vaultPosition === null) {
              return !state.isIncrease || state.collateralDelta === 0n
            }

            return false
          }, tradeState),
          color: map(isLong => isLong ? pallete.positive : pallete.negative, config.tradeConfig.isLong),
          min: map(({ collateralDeltaUsd, pos, isIncrease }) => {
            if (!isIncrease) {
              return 0
            }

            const totalCollateral = (pos?.collateral || 0n) + collateralDeltaUsd
            const totalSize = pos?.size || 0n
            const leverage = div(totalSize, totalCollateral)

            const leverageBasis = bnDiv(leverage, LIMIT_LEVERAGE)

            return leverageBasis
          }, combineObject({ collateralDeltaUsd: config.tradeState.collateralDeltaUsd, pos: config.tradeState.vaultPosition, isIncrease: config.tradeConfig.isIncrease })),
          max: map(({ collateralDeltaUsd, pos, isIncrease }) => {
            if (isIncrease) {
              return 1
            }

            const totalCollateral = (pos?.collateral || 0n) - collateralDeltaUsd
            const totalSize = (pos?.size || 0n)
            const multiplier = bnDiv(div(totalSize, totalCollateral), LIMIT_LEVERAGE)

            return multiplier
          }, combineObject({ collateralDeltaUsd: config.tradeState.collateralDeltaUsd, pos: config.tradeState.vaultPosition, isIncrease: config.tradeConfig.isIncrease })),
          thumbText: map(n => formatLeverageNumber.format(n * MAX_LEVERAGE_NORMAL) + '\nx')
        })({
          change: slideLeverageTether(
            map(leverage => {
              const leverageRatio = BigInt(Math.floor(Math.abs(leverage) * Number(BASIS_POINTS_DIVISOR)))
              const leverageMultiplier = LIMIT_LEVERAGE * leverageRatio / BASIS_POINTS_DIVISOR

              return leverageMultiplier
            }),
            multicast
          )
        })),

        $row(layoutSheet.spacing, style({ placeContent: 'space-between', paddingBottom: '18px' }))(
          $column(
            $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
              $Tooltip({
                $anchor: $text(style({ color: pallete.foreground }))('Fees'),
                $content: switchLatest(map(params => {
                  const depositTokenNorm = resolveAddress(chain, params.inputToken)

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
              })({}),
              $text(style({ color: pallete.negative }))(map(params => formatReadableUSD(params.fee), tradeState))
            ),
            $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
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
              inputOp: style({ width: '60px', fontWeight: 'normal' }),
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

          $IntermediateConnectButton({
            chainList: config.chainList,
            walletStore: config.walletStore,
            $connectLabel: $text(screenUtils.isDesktopScreen ? 'Connect To Trade' : 'Connect'),
            $container: $column(layoutSheet.spacingBig, style({})),
            $$display: map(() => {

              return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(

                style({ padding: '8px', placeSelf: 'center', fontSize: '.75em' })(
                  $ButtonSecondary({
                    disabled: map(params => {
                      if (params.sizeDelta > 0n || params.collateralDelta > 0n) {
                        return false
                      }

                      return true
                    }, tradeState),
                    $content: $text('Reset')
                  })({ click: clickResetTether() })
                ),

                switchLatest(combineArray((isPluginEnabled, isEnabled, isInputTokenApproved, inputToken, inputTokenDesc) => {
                  if (!isPluginEnabled || !isEnabled) {
                    return $Popover({
                      $$popContent: map((xx) => {

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
                                  const contractAddress = getContract(chain, 'PositionRouter')
                                  return c!.contract.approvePlugin(contractAddress)
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
                    const erc20 = connectErc20(inputToken, config.walletLink.provider)
                    return $ButtonPrimary({
                      $content: $text(`Approved ${inputTokenDesc.symbol}`)
                    })({
                      click: approveInputTokenTether(
                        snapshot(async (c) => {
                          const contractAddress = getContract(chain, 'PositionRouter')

                          if (c === null) {
                            return false
                          }

                          await c.approve(contractAddress, MaxUint256)

                          return true
                        }, erc20.contract),
                        awaitPromises
                      )
                    })
                  }

                  return $ButtonPrimaryCtx({
                    ctx: map(req => req.ctxQuery, requestTrade),
                    disabled: combineArray((error, params) => {

                      if (error) {
                        return true
                      }

                      if (params.sizeDelta === 0n && params.collateralDelta === 0n) {
                        return true
                      }

                      // if (params.isIncrease && (params.leverage > LIMIT_LEVERAGE || params.leverage < MIN_LEVERAGE)) {
                      //   return true
                      // }

                      // if (params.vaultPosition && params.liquidationPrice! > params.indexTokenPrice) {
                      //   return true
                      // }

                      // if (params.isIncrease && (params.collateralDeltaUsd > 0n || params.sizeDelta > 0n) && params.collateralDelta <= params.walletBalance) {
                      //   return false
                      // }

                      return false
                    }, validationError, tradeState),
                    $content: $text(map(params => {
                      const outputToken = getTokenDescription(chain, params.indexToken)

                      let modLabel: string

                      if (params.vaultPosition) {
                        if (params.isIncrease) {
                          modLabel = 'Increase'
                        } else {
                          modLabel = params.sizeDelta === params.vaultPosition.size || params.collateralDeltaUsd === params.vaultPosition.collateral ? 'Close' : 'Reduce'
                        }
                      } else {
                        modLabel = 'Open'
                      }

                      if (screenUtils.isMobileScreen) {
                        return modLabel
                      }

                      return `${modLabel} ${params.isLong ? 'Long' : 'Short'} ${outputToken.symbol}`
                    }, tradeState)),
                  })({
                    click: clickRequestTradeTether()
                  })
                }, trade.isPluginEnabled(config.walletLink.account), config.tradeState.isTradingEnabled, config.tradeState.isInputTokenApproved, config.tradeConfig.inputToken, config.tradeState.inputTokenDescription)),


                switchLatest(map(error => {
                  if (error === null) {
                    return empty()
                  }

                  return $Tooltip({
                    $content: $text(style({ fontSize: '.75em', }))(error),
                    $container: $column(style({ marginLeft: '-25px', zIndex: 5, backgroundColor: '#000', borderRadius: '50%', })),
                    $anchor: $icon({
                      $content: $alertIcon, viewBox: '0 0 24 24', width: '28px',
                      svgOps: style({ fill: pallete.negative, padding: '3px', filter: 'drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 10px) drop-shadow(black 0px 0px 1px)' })
                    })
                  })({})
                }, skipRepeats(validationError)))
              )
            }),
            ensureNetwork: true,
            walletLink: config.walletLink
          })({ walletChange: walletChangeTether() })
        ),

        $column(style({ height: '100px', position: 'relative', overflow: 'hidden', margin: `0 -${BOX_SPACING}`, zIndex: 0, backgroundColor: pallete.background, borderRadius: '20px', }))(
          switchLatest(map((res) => {
            if (res === null) {
              return empty()
            }

            const { feed, trade } = res

            const hoverChartPnl = switchLatest(map((chartCxChange) => {
              if (chartCxChange) {
                return now(chartCxChange)
              }

              if (isTradeSettled(trade)) {
                return now(formatFixed(trade.realisedPnl - trade.fee, 30))
              }

              return map(price => {
                const delta = getPnL(trade.isLong, trade.averagePrice, price, trade.size)
                const val = formatFixed(delta + trade.realisedPnl - trade.fee, 30)

                return val
              }, config.tradeState.indexTokenPrice)

            }, pnlCrossHairTime))

            return $column(style({}))(
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
                  value$: map(O((n) => readableNumber(n, false), Number), motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, hoverChartPnl)),
                  incrementColor: pallete.positive,
                  decrementColor: pallete.negative
                })
              ),
              $TradePnlHistory({
                $container: $column(style({ height: '100px' })),
                trade,
                pricefeed: feed,
                chartConfig: {},
                latestPrice: config.tradeState.indexTokenPrice
              })({ crosshairMove: crosshairMoveTether() })
            )

          }, newLocal_1))
        )
      )
    ),

    {
      switchIsLong,
      changeInputToken,
      changeIndexToken,
      leverage: mergeArray([
        snapshot((params, size) => {
          const posCollateral = params.vaultPosition?.collateral || 0n
          const posSize = params.vaultPosition?.size || 0n
          const totalSize = posSize + size

          if (params.isIncrease) {
            const totalCollateral = posCollateral + params.collateralDeltaUsd
            return div(totalSize, totalCollateral)
          }

          if (!params.vaultPosition) {
            return 0n
          }

          const levMultipler = div(posSize - size, posCollateral - params.collateralDeltaUsd)
          return levMultipler
        }, tradeState, sizeChangeEffect),
        initialLeverage,

        slideLeverage
      ]),
      switchIsIncrease,
      changeCollateralToken,
      changeCollateralDelta: mergeArray([
        slideCollateral,
        inputCollateral,
        clickResetVal,
      ]),
      changeSize: mergeArray([
        clickResetVal,
        inputSizeDelta,
        changeSizeByRatio,
      ]),
      changeCollateralRatio: mergeArray([
        slideCollateralRatio,
        snapshot(params => {
          if (params.isIncrease) {
            const newLocal = div(params.collateralDelta, params.walletBalance)
            return newLocal
          }

          return params.vaultPosition ? div(params.collateralDelta, params.vaultPosition.collateral) : 0n
        }, tradeState, mergeArray([constant(0n, clickReset), inputCollateral])),

        constant(0n, switchIsIncrease)
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
      approveInputToken: mergeArray([
        approveInputToken,
        switchLatest(snapshot((collateralDelta, { account, inputToken }) => {
          const erc20 = connectErc20(inputToken, config.walletLink.provider)
          return awaitPromises(map(async c => {
            if (inputToken === AddressZero) {
              return true
            }

            if (c === null || account === null) {
              return null
            }

            const contractAddress = getContract(chain, 'Router')

            if (contractAddress === null) {
              return null
            }

            const allowedSpendAmount = (await c.allowance(account, contractAddress)).toBigInt()
            return allowedSpendAmount >= collateralDelta
          }, erc20.contract))
        }, config.tradeConfig.collateralDelta, debounce(100, combineObject({ account: config.walletLink.account, inputToken: config.tradeConfig.inputToken }))))
      ]),
      requestTrade,
    }
  ]
})


const formatLeverageNumber = new Intl.NumberFormat("en-US", {
  // style: "currency",
  // currency: "USD",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})



const $field = $element('input')(attr({ placeholder: '0.0', type: 'number' }), style({ width: '100%', fontFamily: '-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif', minWidth: '0', transition: 'background 500ms ease-in', flex: 1, fontSize: '1.55em', background: 'transparent', border: 'none', height: '35px', outline: 'none', color: pallete.message }))

const $hintInput = (label: Stream<string>, isIncrease: Stream<boolean>, tooltip: string | Stream<string>, val: Stream<string>, change: Stream<string>) => $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
  $text(style({}))(val),
  $text(styleBehavior(map(isIncrease => isIncrease ? { color: pallete.positive } : { color: pallete.negative }, isIncrease)))('→'),
  $text(style({}))(change),
  $text(style({ color: pallete.foreground }))(label),
  $infoTooltip(tooltip)
)


function getRebateDiscountUsd(amountUsd: bigint) {
  return formatReadableUSD(amountUsd * 1500n / BASIS_POINTS_DIVISOR)
}
