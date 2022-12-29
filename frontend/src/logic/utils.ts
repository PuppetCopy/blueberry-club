import {
  AddressZero, ARBITRUM_ADDRESS, CHAIN, TOKEN_DESCRIPTION_MAP, TOKEN_SYMBOL, AVALANCHE_ADDRESS, getDenominator,
  ITokenDescription, CHAIN_TOKEN_ADDRESS_TO_SYMBOL, ITokenInput, ITokenTrade
} from "@gambitdao/gmx-middleware"



export const CHAIN_NATIVE_TO_SYMBOL = {
  [CHAIN.AVALANCHE]: TOKEN_SYMBOL.AVAX,
  [CHAIN.ARBITRUM]: TOKEN_SYMBOL.ETH,
} as const

export const CHAIN_ADDRESS_MAP = {
  [CHAIN.AVALANCHE]: AVALANCHE_ADDRESS,
  [CHAIN.ARBITRUM]: ARBITRUM_ADDRESS,
}



export function resolveAddress(chain: CHAIN, indexToken: ITokenInput | null): ITokenTrade {
  // @ts-ignore
  const contractAddressMap = CHAIN_ADDRESS_MAP[chain]

  if (!contractAddressMap) {
    throw new Error(`Token ${indexToken} does not exist`)
  }

  if (indexToken === null || indexToken === AddressZero) {
    return contractAddressMap.NATIVE_TOKEN
  }
  return Object.values(contractAddressMap).indexOf(indexToken) > -1 ? indexToken : contractAddressMap.NATIVE_TOKEN
}

export function getTokenDescription(chain: CHAIN | null, token: ITokenInput): ITokenDescription {
  if (token in CHAIN_TOKEN_ADDRESS_TO_SYMBOL) {
    // @ts-ignore
    const symbol = CHAIN_TOKEN_ADDRESS_TO_SYMBOL[token]
    // @ts-ignore
    const desc = TOKEN_DESCRIPTION_MAP[symbol]

    return desc
  }

  if (token === AddressZero) {
    // @ts-ignore
    const nativeSymbol = CHAIN_NATIVE_TO_SYMBOL[chain]

    if (!nativeSymbol) {
      return TOKEN_DESCRIPTION_MAP[CHAIN_NATIVE_TO_SYMBOL[CHAIN.ARBITRUM]]
    }

    // @ts-ignore
    return TOKEN_DESCRIPTION_MAP[nativeSymbol]
  }

  throw new Error(`unable to identity token ${token}`)
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


