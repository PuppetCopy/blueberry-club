import { Behavior, combineArray, combineObject, O } from "@aelea/core"
import { component, INode, $element, attr, style, $text, nodeEvent, stylePseudo, $node } from "@aelea/dom"
import { $row, layoutSheet, $icon, $column } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { ARBITRUM_ADDRESS_LEVERAGE, AddressZero, TOKEN_DESCRIPTION_MAP, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, ARBITRUM_ADDRESS, ARBITRUM_ADDRESS_STABLE, ARBITRUM_ADDRESS_TRADE, formatFixed, readableNumber, MAX_LEVERAGE_NORMAL, TradeAddress, CHAIN, AVALANCHE_ADDRESS, TOKEN_SYMBOL, parseFixed, formatReadableUSD } from "@gambitdao/gmx-middleware"
import { $IntermediateTx, $tokenIconMap, $tokenLabelFromSummary } from "@gambitdao/ui-components"
import { IWalletLink } from "@gambitdao/wallet-link"
import { merge, multicast, awaitPromises, mergeArray, now, snapshot, map, switchLatest, filter, tap, skipRepeats, startWith } from "@most/core"
import { Stream } from "@most/types"
import { $ButterflySlider } from "../$LeverageSlider"
import { $ButtonPrimary } from "../form/$Button"
import { $Dropdown, $defaultSelectContainer } from "../form/$Dropdown"
import { $card } from "../../elements/$common"
import { $caretDown } from "../../elements/$icons"
import { connectPricefeed, connectTrade, connectVault } from "../../logic/contract/trade"
import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { ERC20__factory } from "@gambitdao/gbc-contracts"


const CHAIN_NATIVE_TO_SYMBOL = {
  [CHAIN.AVALANCHE]: TOKEN_SYMBOL.AVAX,
  [CHAIN.ARBITRUM]: TOKEN_SYMBOL.ETH,
} as const

const CHAIN_NATIVE_TO_WRAPPED_SYMBOL = {
  [CHAIN.AVALANCHE]: TOKEN_SYMBOL.WAVAX,
  [CHAIN.ARBITRUM]: TOKEN_SYMBOL.WETH,
} as const

const CHAIN_NATIVE_TO_ADDRESS = {
  [CHAIN.AVALANCHE]: AVALANCHE_ADDRESS.NATIVE_TOKEN,
  [CHAIN.ARBITRUM]: ARBITRUM_ADDRESS.NATIVE_TOKEN,
} as const



interface ITradeBox {
  initialState: {
    inputAddress: TradeAddress,
    outputAddress: ARBITRUM_ADDRESS_LEVERAGE,
  }
  inputAddressState: Stream<TradeAddress>
  outputAddressState: Stream<ARBITRUM_ADDRESS_LEVERAGE>
  walletLink: IWalletLink
}

export const $TradeBox = (config: ITradeBox) => component((
  [changeInput, changeInputTether]: Behavior<any, number>,
  [changeLeverage, changeLeverageTether]: Behavior<number, number>,
  [changeInputTrade, changeInputTradeTether]: Behavior<TradeAddress, TradeAddress>,
  [changeOutputTrade, changeOutputTradeTether]: Behavior<TradeAddress, TradeAddress>,
  [clickBalanceDisplay, clickBalanceDisplayTether]: Behavior<INode, number>,
  [clickPrimary, clickPrimaryTether]: Behavior<any, any>,
) => {

  const inputTradeState = startWith(config.initialState.inputAddress, config.inputAddressState)
  const outputTradeState = startWith(config.initialState.outputAddress, config.outputAddressState)

  const pricefeed = connectPricefeed(config.walletLink)
  const trade = connectTrade(config.walletLink)
  const vault = connectVault(config.walletLink)

  const $field = $element('input')(attr({ placeholder: '0.0' }), style({ flex: 1, padding: '0 16px', fontSize: '1.25em', background: 'transparent', border: 'none', height: '60px', outline: 'none', lineHeight: '60px', color: pallete.message }))

  const $hintInput = (label: Stream<string> | string, val: Stream<string> | string) => $row(layoutSheet.spacingTiny, style({ fontSize: '0.75em', color: pallete.foreground }))(
    $text(label),
    $text(val),
  )


  const executionFee = multicast(trade.executionFee)


  const inputTradeAddressPriceUsd = awaitPromises(combineArray(async (contract, address) => {
    const matchAddress = resolveAddress(USE_CHAIN, address)
    const newLocal = (await contract.getMaxPrice(matchAddress)).toBigInt()
    return newLocal
  }, vault.contract, inputTradeState))

  const outputTradeAddressPriceUsd = awaitPromises(combineArray(async (contract, address) => {
    const matchAddress = resolveAddress(USE_CHAIN, address)
    const newLocal = (await contract.getMaxPrice(matchAddress)).toBigInt()
    return newLocal
  }, vault.contract, outputTradeState))


  const walletBalance = multicast(awaitPromises(combineArray(async (inp, w3p, account) => {
    if (w3p === null || account === null) {
      throw new Error('no wallet provided')
    }
    if (inp === AddressZero) {
      return (await w3p.getSigner().getBalance()).toBigInt()
    }

    const ercp = ERC20__factory.connect(inp, w3p.getSigner())

    return (await ercp.balanceOf(account)).toBigInt()
  }, inputTradeState, config.walletLink.provider, config.walletLink.account)))

  const inputBalance = combineArray((inputAddress, fee, inpVal) => {
    const txFeeReduction = inputAddress === AddressZero ? formatFixed(fee, 18) * 10 : 0
    return inpVal - txFeeReduction
  }, inputTradeState, executionFee, skipRepeats(mergeArray([clickBalanceDisplay, changeInput])))

  const tradeSizeState = combineArray((inpVal, lev) => {
    return inpVal * lev * 30
  }, inputBalance, changeLeverage)



  const tradeBalance = combineArray((inputAddress, outputAddress, inputPrice, outputPrice, inpValue, inputSize) => {
    const tokenDEsc = getTokenDescription(USE_CHAIN, inputAddress)
    const input = parseFixed(inpValue, tokenDEsc.decimals)
    const size = parseFixed(inputSize, tokenDEsc.decimals)

    const inputUsd = input * inputPrice / 10n ** BigInt(tokenDEsc.decimals)
    const sizeUsd = size * inputPrice / 10n ** BigInt(tokenDEsc.decimals)

    const outputUsd = sizeUsd / outputPrice

    return { size, sizeUsd, inputUsd, input, outputUsd }
  }, inputTradeState, outputTradeState, inputTradeAddressPriceUsd, outputTradeAddressPriceUsd, inputBalance, tradeSizeState)




  const tradeParamsState = multicast(combineObject({ inputTradeAddress: inputTradeState, outputTradeAddress: config.outputAddressState, inputBalanceBn: tradeBalance, changeLeverage, inputTradeAddressPriceUsd, executionFee }))

  const requestTrade = snapshot(({ tradeParamsState: { changeLeverage, inputBalanceBn, inputTradeAddress, outputTradeAddress, inputTradeAddressPriceUsd, executionFee }, positionRouter }) => {
    const path = resolveLongPath(inputTradeAddress, outputTradeAddress)

    const isLong = changeLeverage > 0

    if (inputTradeAddress === AddressZero) {


      return positionRouter.createIncreasePositionETH(
        path,
        outputTradeAddress,
        0,
        inputBalanceBn.sizeUsd,
        isLong,
        inputTradeAddressPriceUsd,
        executionFee,
        '0x0000000000000000000000000000000000000000000000000000000000000000', // _referralCode: BytesLike,
        { value: inputBalanceBn.input }
      )
    }

    return positionRouter.createIncreasePosition(
      path,
      outputTradeAddress,
      inputBalanceBn.input,
      0,
      inputBalanceBn.sizeUsd,
      isLong,
      inputTradeAddressPriceUsd,
      executionFee,
      '', // _referralCode: BytesLike,
      { value: inputBalanceBn.input }
    )

  }, combineObject({ tradeParamsState, positionRouter: trade.contract }), clickPrimary)


  return [
    $column(
      $card(style({ padding: '15px', gap: 0 }))(

        $row(style({ placeContent: 'space-between', padding: '0' }))(
          $hintInput('Pay', now('1')),
          clickBalanceDisplayTether(nodeEvent('click'), snapshot(balance => formatFixed(balance, 18), walletBalance), multicast)(
            O(style({ cursor: 'pointer' }), stylePseudo(':hover', { color: pallete.primary }))(
              $hintInput('Balance', map(b => readableNumber(formatFixed(b), 4).toString(), walletBalance))
            )
          ),
        ),

        $row(
          $Dropdown<TradeAddress>({
            $container: $row(style({ position: 'relative', alignSelf: 'center' })),
            $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
              switchLatest(map(option => {
                const symbol = option === CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN]
                  ? TOKEN_SYMBOL.WETH
                  : CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[USE_CHAIN] : option]

                return $icon({ $content: $tokenIconMap[symbol], width: '34px', viewBox: '0 0 32 32' })
              }, inputTradeState)),
              $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
            ),
            value: {
              value: now(config.initialState.inputAddress),
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
            select: changeInputTradeTether()
          }),
          $field(
            O(
              map(node =>
                merge(
                  now(node),
                  filter(() => false, tap(val => {
                    // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                    node.element.value = String(val)
                  }, inputBalance))
                )
              ),
              switchLatest
            ),

            changeInputTether(nodeEvent('input'), map((x) => {
              const target = x.currentTarget

              if (!(target instanceof HTMLInputElement)) {
                throw new Error('Target is not type of input')
              }

              return Number(target.value)
            })),


          )(),
        ),

        style({ margin: '0 -15px' })(
          $ButterflySlider({
            value: now(0),
            thumbDisplayOp: map(n => readableNumber(Math.abs(n * MAX_LEVERAGE_NORMAL), 1))
          })({
            change: changeLeverageTether(multicast)
          })
        ),


        $row(
          $Dropdown<TradeAddress>({
            $container: $row(style({ position: 'relative', alignSelf: 'center' })),
            $selection: $row(style({ alignItems: 'center', cursor: 'pointer' }))(
              switchLatest(map(option => {
                const tokenDesc = TOKEN_DESCRIPTION_MAP[CHAIN_TOKEN_ADDRESS_TO_SYMBOL[option]]

                return $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '34px', viewBox: '0 0 32 32' })
              }, outputTradeState)),
              $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginTop: '3px', marginLeft: '5px' }), viewBox: '0 0 32 32' }),
            ),
            value: {
              value: now(config.initialState.outputAddress),
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
            select: changeOutputTradeTether()
          }),

          $field(
            O(
              map(node =>
                merge(
                  now(node),
                  filter(() => false, tap(balance => {
                    // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                    node.element.value = formatFixed(balance.outputUsd, 30).toString()
                  }, tradeBalance))
                )
              ),
              switchLatest
            )

          )(),
        ),


        $row(style({ placeContent: 'space-between', padding: '0' }))(
          $hintInput(
            map(lev => lev > 0 ? 'Long' : 'Short', changeLeverage),
            combineArray(input => {
              const outputToken = getTokenDescription(USE_CHAIN, input.outputTradeAddress)
              const size = formatReadableUSD(input.inputBalanceBn.sizeUsd)

              return `size: $${size}`
            }, tradeParamsState)
          ),
          // clickBalanceDisplayTether(nodeEvent('click'), snapshot(balance => formatFixed(balance, 18), walletBalance), multicast)(
          //   O(style({ cursor: 'pointer' }), stylePseudo(':hover', { color: pallete.primary }))(
          //     $hintInput('Balance', map(b => readableNumber(formatFixed(b), 3).toString(), walletBalance))
          //   )
          // ),
        ),

        $ButtonPrimary({
          $content: $text(combineArray(input => {
            const outputToken = getTokenDescription(USE_CHAIN, input.outputTradeAddress)
            return `${input.changeLeverage > 0 ? 'Long' : 'Short'} ${outputToken.symbol}`
          }, tradeParamsState, )),
          buttonOp: style({
            alignSelf: 'center'
          }),
        })({
          click: clickPrimaryTether()
        })

        // $text(map(String, startWith(0, changeLeverage)))
      ),

      $IntermediateTx({
        query: requestTrade,
        chain: USE_CHAIN
      })({})

    ),

    {
      changeInputTrade,
      changeOutputTrade,
      requestTrade
    }
  ]
})



const resolveLongPath = function (input: TradeAddress, output: TradeAddress) {
  const tokenAddress0 = input === AddressZero ? ARBITRUM_ADDRESS.NATIVE_TOKEN : input
  const indexTokenAddress = output === AddressZero ? ARBITRUM_ADDRESS.NATIVE_TOKEN : output

  let path = [indexTokenAddress]
  if (output !== input) {
    path = [tokenAddress0, indexTokenAddress]
  }

  if (input === AddressZero && output === ARBITRUM_ADDRESS.NATIVE_TOKEN) {
    path = [ARBITRUM_ADDRESS.NATIVE_TOKEN]
  }

  if (input === ARBITRUM_ADDRESS.NATIVE_TOKEN && output === AddressZero) {
    path = [ARBITRUM_ADDRESS.NATIVE_TOKEN]
  }

  return path
}

const resolveShortPath = function (shortCollateralAddress: ARBITRUM_ADDRESS_STABLE, input: TradeAddress, output: TradeAddress) {
  const tokenAddress0 = input === AddressZero ? ARBITRUM_ADDRESS.NATIVE_TOKEN : input

  let path: string[] = [shortCollateralAddress]

  if (input === AddressZero && output === ARBITRUM_ADDRESS.NATIVE_TOKEN) {
    path = [ARBITRUM_ADDRESS.NATIVE_TOKEN]
  }

  if (input === ARBITRUM_ADDRESS.NATIVE_TOKEN && output === AddressZero) {
    path = [ARBITRUM_ADDRESS.NATIVE_TOKEN]
  }

  if (tokenAddress0 !== shortCollateralAddress) {
    path = [tokenAddress0, shortCollateralAddress]
  }

  return path
}


function resolveAddress(chain: CHAIN.ARBITRUM | CHAIN.AVALANCHE, indexToken: TradeAddress) {
  return indexToken === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[chain] : indexToken
}

function getTokenDescription(chain: CHAIN.ARBITRUM | CHAIN.AVALANCHE, indexToken: TradeAddress) {
  const symbol = indexToken === AddressZero ? CHAIN_NATIVE_TO_SYMBOL[chain] : CHAIN_TOKEN_ADDRESS_TO_SYMBOL[indexToken]
  return TOKEN_DESCRIPTION_MAP[symbol]
}

export function getTargetUsdgAmount(weight: bigint, usdgSupply: bigint, totalTokenWeights: bigint) {
  if (usdgSupply === 0n) {
    return 0n
  }

  return weight * usdgSupply / totalTokenWeights
}

export function swapFeeBasisPoints(
  usdgAmount: bigint,
  weight: bigint,

  usdgDelta: bigint,
  feeBasisPoints: bigint,
  taxBasisPoints: bigint,
  increment: boolean,
  usdgSupply: bigint,
  totalTokenWeights: bigint
) {
  if (!usdgSupply || !totalTokenWeights) {
    return 0n
  }

  let nextAmount = usdgAmount + usdgDelta

  if (!increment) {
    nextAmount = usdgDelta > usdgAmount ? 0n : usdgAmount - usdgDelta
  }

  const targetAmount = getTargetUsdgAmount(weight, usdgSupply, totalTokenWeights)

  if (targetAmount === 0n) {
    return feeBasisPoints
  }

  const initialDiff = usdgAmount > targetAmount ? usdgAmount - targetAmount : targetAmount - usdgAmount
  const nextDiff = nextAmount > targetAmount ? nextAmount - targetAmount : targetAmount - nextAmount

  if (nextDiff < initialDiff) {
    const rebateBps = taxBasisPoints * initialDiff / targetAmount
    return rebateBps > feeBasisPoints  ? 0n : feeBasisPoints - rebateBps
  }

  let averageDiff = initialDiff + nextDiff / 2n

  if (averageDiff > targetAmount) {
    averageDiff = targetAmount
  }

  const taxBps = taxBasisPoints * averageDiff / targetAmount

  return feeBasisPoints + taxBps
}

