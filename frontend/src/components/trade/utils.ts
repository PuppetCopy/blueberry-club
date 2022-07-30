import { USE_CHAIN } from "@gambitdao/gbc-middleware"
import { TradeAddress, AddressZero, ARBITRUM_ADDRESS, ARBITRUM_ADDRESS_STABLE, CHAIN, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, TOKEN_DESCRIPTION_MAP, TOKEN_SYMBOL, AVALANCHE_ADDRESS, AVALANCHE_ADDRESS_LEVERAGE, ARBITRUM_ADDRESS_LEVERAGE, expandDecimals, BASIS_POINTS_DIVISOR, USD_PERCISION, USDG_DECIMALS, STABLE_SWAP_FEE_BASIS_POINTS, STABLE_TAX_BASIS_POINTS, TAX_BASIS_POINTS, SWAP_FEE_BASIS_POINTS } from "@gambitdao/gmx-middleware"



export const CHAIN_NATIVE_TO_SYMBOL = {
  [CHAIN.AVALANCHE]: TOKEN_SYMBOL.AVAX,
  [CHAIN.ARBITRUM]: TOKEN_SYMBOL.ETH,
} as const

export const CHAIN_NATIVE_TO_WRAPPED_SYMBOL = {
  [CHAIN.AVALANCHE]: TOKEN_SYMBOL.WAVAX,
  [CHAIN.ARBITRUM]: TOKEN_SYMBOL.WETH,
} as const

export const CHAIN_NATIVE_TO_ADDRESS = {
  [CHAIN.AVALANCHE]: AVALANCHE_ADDRESS.NATIVE_TOKEN,
  [CHAIN.ARBITRUM]: ARBITRUM_ADDRESS.NATIVE_TOKEN,
} as const



export const resolveLongPath = function (input: TradeAddress, output: TradeAddress) {
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

export const resolveShortPath = function (shortCollateralAddress: ARBITRUM_ADDRESS_STABLE, input: TradeAddress, output: TradeAddress) {
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


export function resolveAddress(chain: CHAIN.ARBITRUM | CHAIN.AVALANCHE, indexToken: TradeAddress) {
  return indexToken === AddressZero ? CHAIN_NATIVE_TO_ADDRESS[chain] : indexToken
}

export function getTokenDescription(chain: CHAIN.ARBITRUM | CHAIN.AVALANCHE, indexToken: TradeAddress) {
  const symbol = indexToken === AddressZero ? CHAIN_NATIVE_TO_SYMBOL[chain] : CHAIN_TOKEN_ADDRESS_TO_SYMBOL[indexToken]
  return TOKEN_DESCRIPTION_MAP[symbol]
}

export function getTargetUsdgAmount(weight: bigint, usdgSupply: bigint, totalTokenWeights: bigint) {
  if (usdgSupply === 0n) {
    return 0n
  }

  return weight * usdgSupply / totalTokenWeights
}

export function getFeeBasisPoints(
  debtUsd: bigint,
  weight: bigint,

  amountUsd: bigint,
  feeBasisPoints: bigint,
  taxBasisPoints: bigint,
  increment: boolean,
  usdgSupply: bigint,
  totalTokenWeights: bigint
) {

  const nextAmount = increment
    ? debtUsd + amountUsd
    : amountUsd > debtUsd
      ? 0n
      : debtUsd - amountUsd

  const targetAmount = getTargetUsdgAmount(weight, usdgSupply, totalTokenWeights)

  if (targetAmount === 0n) {
    return feeBasisPoints
  }

  const initialDiff = debtUsd > targetAmount ? debtUsd - targetAmount : targetAmount - debtUsd
  const nextDiff = nextAmount > targetAmount ? nextAmount - targetAmount : targetAmount - nextAmount

  if (nextDiff < initialDiff) {
    const rebateBps = taxBasisPoints * initialDiff / targetAmount
    return rebateBps > feeBasisPoints ? 0n : feeBasisPoints - rebateBps
  }

  let averageDiff = initialDiff + nextDiff / 2n

  if (averageDiff > targetAmount) {
    averageDiff = targetAmount
  }

  const taxBps = taxBasisPoints * averageDiff / targetAmount

  return feeBasisPoints + taxBps
}


export function getNextToAmount(
  chainId: CHAIN.ARBITRUM | CHAIN.AVALANCHE,
  totalTokenWeights: bigint,
  usdgSupply: bigint,

  inputTokenAddress: TradeAddress,
  inputMinPrice: bigint,

  outputTokenAddress: AVALANCHE_ADDRESS_LEVERAGE | ARBITRUM_ADDRESS_LEVERAGE,
  outputMaxPrice: bigint,

  inputAmount: bigint,

  ratio = 0n
) {

  const fromToken = getTokenDescription(chainId, inputTokenAddress)
  const toToken = getTokenDescription(chainId, outputTokenAddress)

  const isInputNative = CHAIN_NATIVE_TO_ADDRESS[chainId] === inputTokenAddress
  const isOutNative = CHAIN_NATIVE_TO_ADDRESS[chainId] === outputTokenAddress

  if (
    inputTokenAddress === outputTokenAddress
    || inputTokenAddress === AddressZero && isOutNative
    || isInputNative && isOutNative
  ) {
    return { amount: inputAmount, feeBasisPoints: 0n }
  }


  // the realtime price should be used if it is for a transaction to open / close a position
  // or if the transaction involves doing a swap and opening / closing a position
  // otherwise use the contract price instead of realtime price for swaps


  const toAmount = ratio > 0n
    ? inputAmount * inputMinPrice / outputMaxPrice
    : ratio > 0n ? inputAmount * USD_PERCISION / ratio : 0n

  const usdgAmount = adjustForDecimals(inputAmount * inputMinPrice / USD_PERCISION, fromToken.decimals, USDG_DECIMALS)

  const swapFeeBasisPoints = fromToken.isStable && toToken.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
  const taxBasisPoints = fromToken.isStable && toToken.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS

  const feeBasisPoints0 = getFeeBasisPoints(
    usdgAmount,
    0n,
    0n,
    swapFeeBasisPoints,
    taxBasisPoints,
    true,
    usdgSupply,
    totalTokenWeights
  )

  const feeBasisPoints1 = getFeeBasisPoints(
    toAmount,
    0n,
    usdgAmount,
    swapFeeBasisPoints,
    taxBasisPoints,
    false,
    usdgSupply,
    totalTokenWeights
  )
  const feeBasisPoints = feeBasisPoints0 > feeBasisPoints1 ? feeBasisPoints0 : feeBasisPoints1

  return {
    amount: adjustForDecimalsFactory(BigInt(toToken.decimals - fromToken.decimals), toAmount * BASIS_POINTS_DIVISOR - feeBasisPoints / BASIS_POINTS_DIVISOR),
    feeBasisPoints,
  }
}

export function adjustForDecimals(amount: bigint, divDecimals: number, mulDecimals: number) {
  return amount * expandDecimals(1n, mulDecimals) / expandDecimals(1n, divDecimals)
}


const adjustForDecimalsFactory = (n: bigint, number: bigint) => {
  if (n === 0n) {
    return number
  }

  if (n > 0) {
    return number * 10n ** n
  }

  return number / -(10n ** n)
}

