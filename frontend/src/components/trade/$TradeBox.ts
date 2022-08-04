import { Behavior, combineArray, combineObject, O, replayLatest } from "@aelea/core"
import { component, INode, $element, attr, style, $text, nodeEvent, stylePseudo, $node, styleBehavior, motion, MOTION_NO_WOBBLE } from "@aelea/dom"
import { $row, layoutSheet, $icon, $column, state, $NumberTicker, $Checkbox } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import {
  ARBITRUM_ADDRESS_LEVERAGE, AddressZero, TOKEN_DESCRIPTION_MAP, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, ARBITRUM_ADDRESS, formatFixed, readableNumber,
  MAX_LEVERAGE_NORMAL, TradeAddress, TOKEN_SYMBOL, parseFixed, formatReadableUSD, BASIS_POINTS_DIVISOR,
  getDenominator,
  DEDUCT_FOR_GAS, ITrade, IVaultPosition, IChainParamApi, isTradeSettled, calculatePositionDelta, IPositionDelta, getRatio, MAX_LEVERAGE, STABLE_SWAP_FEE_BASIS_POINTS, STABLE_TAX_BASIS_POINTS, TAX_BASIS_POINTS, SWAP_FEE_BASIS_POINTS, USD_PERCISION, MARGIN_FEE_BASIS_POINTS
} from "@gambitdao/gmx-middleware"
import { $IntermediateTx, $tokenIconMap, $tokenLabelFromSummary } from "@gambitdao/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { merge, multicast, awaitPromises, mergeArray, now, snapshot, map, switchLatest, filter, skipRepeats, combine, empty, constant, take, tap } from "@most/core"
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

    collateralToken: Stream<TradeAddress>
    collateralTokenPrice: Stream<bigint>
    indexTokenPrice: Stream<bigint>
    focusFactor: Stream<number>

    sizeToken: Stream<ARBITRUM_ADDRESS_LEVERAGE>

    vaultPosition: Stream<IVaultPosition | null>,

    leverage: Stream<number>
    switchReduce: Stream<boolean>
    // isLong: Stream<boolean>
    // directionDiv: Stream<number>
  }

  walletLink: IWalletLink
  walletStore: state.BrowserStore<WALLET, "walletStore">
}




export const $TradeBox = ({ state, walletLink, walletStore, chain }: ITradeBox) => component((
  [inputCollateralDelta, inputCollateralDeltaTether]: Behavior<INode, bigint>,
  [inputSizeDelta, inputSizeDeltaTether]: Behavior<INode, bigint>,
  // [isReduceOnly, isReduceOnlyTether]: Behavior<boolean, boolean>,

  [changeInputAddress, changeInputAddressTether]: Behavior<TradeAddress, TradeAddress>,
  [changeOutputAddress, changeOutputAddressTether]: Behavior<TradeAddress, TradeAddress>,
  [clickMaxBalance, clickMaxBalanceTether]: Behavior<PointerEvent, PointerEvent>,
  [clickPrimary, clickPrimaryTether]: Behavior<any, any>,
  // [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams, MouseEventParams>,
  // [switchIsLong, switchIsLongTether]: Behavior<INode, boolean>,
  [switchReduce, switchReduceTether]: Behavior<boolean, boolean>,
  [focusCollateral, focusCollateralTether]: Behavior<INode, bigint>,
  [focusSize, focusSizeTether]: Behavior<INode, bigint>,
  // [changeOrderDirection, changeOrderDirectionTether]: Behavior<OrderType, OrderType>,

  // [slideDirectionDiv, slideDirectionDivTether]: Behavior<number, number>,
  [changeLeverage, changeLeverageTether]: Behavior<number, number>,


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

  const collateralTokenWeight = switchLatest(map(address => {
    if (address === AddressZero) {
      return vault.getTokenWeight(CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN])
    }

    return vault.getTokenWeight(address)
  }, state.collateralToken))

  const collateralTokenDebtUsd = switchLatest(map(address => {
    if (address === AddressZero) {
      return vault.getTokenDebtUsd(CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN])
    }

    return vault.getTokenDebtUsd(address)
  }, state.collateralToken))

  const indexTokenWeight = switchLatest(map(address => vault.getTokenWeight(address), state.sizeToken))

  const indexTokenDebtUsd = switchLatest(map(address => vault.getTokenDebtUsd(address), state.sizeToken))

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

  const collateralTokenDescription = map(address => getTokenDescription(USE_CHAIN, address), state.collateralToken)
  const indexTokenDescription = map(address => getTokenDescription(USE_CHAIN, address), state.sizeToken)
  const tradeParams = replayLatest(multicast(combineObject(state)))

  const clickMaxBalanceValue = snapshot(({ tradeParams, walletBalance }) => walletBalance - REDUCED_FOR_TX_FEES, combineObject({ walletBalance, tradeParams }), clickMaxBalance)

  const REDUCED_FOR_TX_FEES = DEDUCT_FOR_GAS * 2n

  const sliderLeverageMultiplier = map(ratio => MAX_LEVERAGE * BigInt(Math.floor(ratio * Number(BASIS_POINTS_DIVISOR))) / BASIS_POINTS_DIVISOR, state.leverage)

  const sliderLeverageMultiplierFactor = multicast(snapshot(
    (focusFactor, leverage) => ({ focusFactor, leverage }),
    state.focusFactor, mergeArray([switchLatest(constant(sliderLeverageMultiplier, clickMaxBalanceValue)), sliderLeverageMultiplier]))
  )

  const changeCollateralLeverage = filter(({ focusFactor }) => focusFactor === 0, sliderLeverageMultiplierFactor)
  const changeSizeLeverage = filter(({ focusFactor }) => focusFactor === 1, sliderLeverageMultiplierFactor)


  const changeCollateral = mergeArray([
    clickMaxBalanceValue,
    inputCollateralDelta,
    focusCollateral
  ])

  const changeSize = mergeArray([
    focusSize,
    inputSizeDelta
  ])

  const collateralTradeparams = combineObject({
    tradeParams, walletBalance, collateralTokenDescription, indexTokenDescription,
    collateralTokenWeight, collateralTokenDebtUsd, collateral: changeCollateral,
    totalTokenWeight: vault.totalTokenWeight, usdgSupply: vault.usdgAmount, leverage: sliderLeverageMultiplier
  })

  const changeCollateralToSize = snapshot((params) => {
    if (params.tradeParams.switchReduce) {
      if (!params.tradeParams.vaultPosition) {
        return 0n
      }

      return params.walletBalance * params.leverage / BASIS_POINTS_DIVISOR
    }


    const inputUsd = params.collateral * params.tradeParams.collateralTokenPrice / getDenominator(params.collateralTokenDescription.decimals)
    const swapFeeBasisPoints = params.collateralTokenDescription.isStable && params.indexTokenDescription.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = params.collateralTokenDescription.isStable && params.indexTokenDescription.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS

    const usdgAmount = adjustForDecimals(
      params.collateral * params.tradeParams.collateralTokenPrice / USD_PERCISION,
      params.collateralTokenDescription.decimals,
      18
    )

    const feeBps = getFeeBasisPoints(
      params.collateral,
      params.collateralTokenWeight,
      usdgAmount,
      swapFeeBasisPoints,
      taxBasisPoints,
      true,
      params.usdgSupply,
      params.totalTokenWeight
    )


    const fromUsdMinAfterFee = feeBps ? inputUsd * (BASIS_POINTS_DIVISOR - feeBps) / BASIS_POINTS_DIVISOR : inputUsd

    const toNumerator = fromUsdMinAfterFee * params.leverage * BASIS_POINTS_DIVISOR
    const toDenominator = MARGIN_FEE_BASIS_POINTS * params.leverage + BASIS_POINTS_DIVISOR * BASIS_POINTS_DIVISOR

    const nextToUsd = toNumerator / toDenominator

    const outputAmountUsd = nextToUsd * getDenominator(params.indexTokenDescription.decimals) / params.tradeParams.indexTokenPrice

    return outputAmountUsd
  }, collateralTradeparams, mergeArray([changeCollateral, changeCollateralLeverage]))


  const sizeChangeParams = combineObject({
    tradeParams, collateralTokenWeight, collateralTokenDebtUsd, collateralTokenDescription, indexTokenDescription,
    totalTokenWeight: vault.totalTokenWeight, usdgSupply: vault.usdgAmount, leverage: sliderLeverageMultiplier, size: changeSize
  })


  const changeSizeToCollateral = snapshot(params => {
    const sizeUsd = params.size * params.tradeParams.indexTokenPrice / getDenominator(params.indexTokenDescription.decimals)

    const swapFeeBasisPoints = params.collateralTokenDescription.isStable && params.indexTokenDescription.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
    const taxBasisPoints = params.collateralTokenDescription.isStable && params.indexTokenDescription.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS
    const collateral = (sizeUsd * BASIS_POINTS_DIVISOR) / params.leverage

    const usdgAmount = adjustForDecimals(
      collateral * params.tradeParams.collateralTokenPrice / USD_PERCISION,
      params.collateralTokenDescription.decimals,
      18
    )

    const feeBps = getFeeBasisPoints(
      params.collateralTokenDebtUsd,
      params.collateralTokenWeight,
      usdgAmount,
      swapFeeBasisPoints,
      taxBasisPoints,
      true,
      params.usdgSupply,
      params.totalTokenWeight
    )

    const baseFromAmountUsd = sizeUsd * BASIS_POINTS_DIVISOR / params.leverage

    const fees = params.size * MARGIN_FEE_BASIS_POINTS / BASIS_POINTS_DIVISOR + (feeBps ? baseFromAmountUsd * feeBps / BASIS_POINTS_DIVISOR : 0n)

    const nextFromUsd = baseFromAmountUsd + fees

    const nextFromAmount = nextFromUsd * getDenominator(params.collateralTokenDescription.decimals) / params.tradeParams.collateralTokenPrice

    return nextFromAmount
  }, sizeChangeParams, mergeArray([ changeSizeLeverage, inputSizeDelta ]))





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

  }, combineObject({ tradeParams, vault: trade.contract, reduceSizeDelta: changeSize, increaseCollateralDelta: changeCollateral, executionFee }), clickPrimary)



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
    // snapshot((pos, amount) => pos ? pos.collateral + amount : amount, state.vaultPosition, increaseCollateralDeltaUsd),
    snapshot((pos, sizeDelta) => pos ? pos.collateral + (sizeDelta * pos.collateral / pos.size) : sizeDelta, state.vaultPosition, changeSize),
  ])




  return [
    $column(layoutSheet.spacing)(
      $card(style({ gap: '20px', padding: '15px' }))(

        $column(layoutSheet.spacingSmall)(
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $hintInput(
              map(isIncrease => isIncrease ? `Collateral` : 'Collateral', switchReduce), // combineArray((existingPosition) => (existingPosition ? `Collateral` : `Collateral`), config.currentPosition),
              map(position => (position ? formatReadableUSD(position.collateral) : '$0'), state.vaultPosition),
              combineArray((amount) => formatReadableUSD(amount), collateralDeltaHint),
            ),

            $node(style({ flex: 1 }))(),

            styleBehavior(map(pos => !pos ? { opacity: '.5', pointerEvents: 'none' } : {}, state.vaultPosition))(
              $label(layoutSheet.spacingSmall, style({ alignItems: 'center', flexDirection: 'row', fontSize: '0.75em' }))(

                $Checkbox({
                  value: state.switchReduce
                })({
                  check: switchReduceTether()
                })
                ,
                $text('Reduce'),
              )
            ),

            O(stylePseudo(':hover', { color: pallete.primary }))(
              $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em' }))(
                $text(style({ color: pallete.foreground }))(`Balance`),
                $text(combineArray((tokenDesc, balance) => readableNumber(formatFixed(balance, tokenDesc.decimals)).toString(), collateralTokenDescription, walletBalance)),
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
              focusCollateralTether(nodeEvent('focus',), combine((tokenDesc, inputEvent) => {
                const target = inputEvent.target

                if (target instanceof HTMLInputElement) {
                  return parseFixed(target.value, tokenDesc.decimals)
                }

                throw new Error('unexpected target element')
              }, collateralTokenDescription))
            )(
              O(
                map(node =>
                  merge(
                    now(node),
                    filter(() => false, snapshot(({ tradeParams, collateralTokenDescription }, val) => {
                      // const tokenDecimals = tradeParams.switchReduce && pos
                      //   ? pos.collateral
                      //   : tradeParams.leverage > 0 ? tradeParams.sizeToken : collateralTokenDesc.decimals
                      // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                      node.element.value = formatFixed(val, collateralTokenDescription.decimals).toString()
                    }, combineObject({ tradeParams, collateralTokenDescription }), mergeArray([clickMaxBalanceValue, changeSizeToCollateral])))
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
              }, collateralTokenDescription)),
            )(),

            $ButtonSecondary({
              $content: $text('Max'),
              buttonOp: style({
                alignSelf: 'center',
                padding: '3px 6px',
                fontSize: '.65em'
              }),
            })({
              click: clickMaxBalanceTether()
            }),

            switchLatest(map(params => {

              if (params.switchReduce) {
                const token = CHAIN_TOKEN_ADDRESS_TO_SYMBOL[params.sizeToken]
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
              })
            }, tradeParams)),
          ),
        ),


        style({ margin: '0 -15px' })(
          $ButterflySlider({
            // positiveColor: pallete.primary,
            // negativeColor: pallete.indeterminate,
            value: mergeArray([
              state.leverage,
              // collateralSliderRatio
              // changeDirDivUsingInput,
              // state.directionDiv
            ]),
            thumbSize: 60,
            thumbText: map(n => readableNumber(Math.abs(n * MAX_LEVERAGE_NORMAL), 1) + 'x')
          })({
            change: changeLeverageTether()
          })
        ),


        $column(layoutSheet.spacingSmall)(
          $row(

            $field(
              styleBehavior(map(isIncrease => isIncrease === 1 ? {} : { color: pallete.foreground, backgroundColor: 'transparent' }, state.focusFactor)),
              focusSizeTether(nodeEvent('focus',), combine((tokenDesc, inputEvent) => {
                const target = inputEvent.target

                if (target instanceof HTMLInputElement) {
                  return parseFixed(target.value, tokenDesc.decimals)
                }

                throw new Error('unexpected target element')
              }, indexTokenDescription))
            )(
              O(
                map(node =>
                  merge(
                    now(node),
                    filter(() => false, combineArray((val, tokenDsc) => {
                      // const valF = formatFixed(val.outputAmountUsd, val.outputTokenDescription.decimals)
                      const valF = formatFixed(val, tokenDsc.decimals)
                      // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                      node.element.value = valF.toString()

                    }, changeCollateralToSize, indexTokenDescription))
                  )
                ),
                switchLatest
              ),
              inputSizeDeltaTether(nodeEvent('input'), snapshot((tokenDesc, inputEvent) => {
                const target = inputEvent.currentTarget

                if (!(target instanceof HTMLInputElement)) {
                  throw new Error('Target is not type of input')
                }

                return BigInt(parseFixed(target.value.replace(/(\+|-)/, ''), tokenDesc.decimals))
              }, indexTokenDescription))

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
                combineArray((pos, sizeDelta) => pos ? pos.size + sizeDelta : sizeDelta, state.vaultPosition, changeSize),
                // combineArray((pos, sizeDelta) => pos ? pos.size + sizeDelta : sizeDelta, state.vaultPosition, increaseCollateralToSize)
              ]))
            ),

            $node(style({ flex: 1 }))(),


          ),
        ),

        // style({ margin: '0 -15px' })(
        //   $ButterflySlider({
        //     $thumb: $defaultThumb(switchIsLongTether(nodeEvent('click'), snapshot((isLong) => !isLong, switchIsLong))),
        //     disabled: now(true),
        //     value: mergeArray([
        //       leverageState,
        //       // state.leverage,
        //       // combineArray((sizeDelta, collateralDelta, currentPosition, params) => {
        //       //   if (currentPosition === null) {
        //       //     return 0
        //       //     // throw new Error('no position to reduce')
        //       //   }

        //       //   const lev = getMultiplier(currentPosition.size + sizeDelta, currentPosition.collateral + collateralDelta) / MAX_LEVERAGE_NORMAL

        //       //   return params.isLong ? lev : -lev
        //       // }, inputSizeDelta, reduceCollateralDeltaSlider, state.vaultPosition, tradeParams)
        //     ]),
        //     thumbText: map(n => {
        //       const newLocal = readableNumber(Math.abs(n * MAX_LEVERAGE_NORMAL), 1) + 'x'
        //       return newLocal
        //     })
        //   })({
        //     // change: changeLeverageTether()
        //   })
        // ),

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
                disabled: combineArray((pos, params, sizeDelta, collateralDelta) => {

                  // if (params.directionDiv > 0 && collateralDelta > 0) {
                  //   return false
                  // }

                  // if (pos && params.directionDiv < 0 && sizeDelta < 0) {
                  //   return false
                  // }


                  return true
                }, state.vaultPosition, tradeParams, changeSize, changeCollateral),
                $content: $text(map(params => {
                  const outputToken = getTokenDescription(USE_CHAIN, params.sizeToken)
                  const modLabel = params.vaultPosition
                    ? params.switchReduce ? 'Decrease' : 'Increase'
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
        ),

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
      switchReduce,
      // directionDiv: slideDirectionDiv,
      // directionDiv: mergeArray([slideDirectionDiv, initSliderRatio]),
      // switchIsLong: skipRepeats(switchIsLong),
      focusFactor: skipRepeats(mergeArray([constant(0, clickMaxBalanceValue), constant(0, focusCollateral), constant(1, focusSize)])),
    }
  ]
})

