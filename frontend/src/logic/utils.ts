import {
  AddressZero, ARBITRUM_ADDRESS, CHAIN, TOKEN_DESCRIPTION_MAP, TOKEN_SYMBOL, AVALANCHE_ADDRESS, getDenominator,
  TokenDescription, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, AddressInput, AddressTrade
} from "@gambitdao/gmx-middleware"



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



export function resolveAddress(chain: CHAIN, indexToken: AddressInput): AddressTrade {
  if (indexToken === AddressZero) {
    if (!(chain in CHAIN_NATIVE_TO_ADDRESS)) {
      throw new Error(`Token ${indexToken} does not exist`)
    }

    // @ts-ignore
    return CHAIN_NATIVE_TO_ADDRESS[chain]
  }

  return indexToken
}

export function getTokenDescription(chain: CHAIN | null, token: AddressInput): TokenDescription {
  if (!chain) {
    return TOKEN_DESCRIPTION_MAP.ETH
  }

  if (token === AddressZero) {
    // @ts-ignore
    return TOKEN_DESCRIPTION_MAP[CHAIN_NATIVE_TO_SYMBOL[chain]]
  }

  const symbol = CHAIN_TOKEN_ADDRESS_TO_SYMBOL[token]
  const desc = TOKEN_DESCRIPTION_MAP[symbol]

  return desc
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

  let averageDiff = (initialDiff + nextDiff) / 2n

  if (averageDiff > targetAmount) {
    averageDiff = targetAmount
  }

  const taxBps = taxBasisPoints * averageDiff / targetAmount

  return feeBasisPoints + taxBps
}



export function adjustForDecimals(amount: bigint, divDecimals: number, mulDecimals: number) {
  return amount * getDenominator(mulDecimals) / getDenominator(divDecimals)
}


