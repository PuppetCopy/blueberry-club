import {
  AddressZero, ARBITRUM_ADDRESS, TOKEN_DESCRIPTION_MAP, TOKEN_SYMBOL, AVALANCHE_ADDRESS, getDenominator,
  ITokenDescription, TOKEN_ADDRESS_TO_SYMBOL, ITokenInput, ITokenTrade, CHAIN_ADDRESS_MAP, CHAIN_NATIVE_TO_SYMBOL
} from "@gambitdao/gmx-middleware"
import { CHAIN } from "@gambitdao/wallet-link"
import { getMappedValue } from "./common"






export function resolveAddress(chain: CHAIN, indexToken: ITokenInput): ITokenTrade {
  if (indexToken === AddressZero) {
    return getMappedValue(CHAIN_ADDRESS_MAP, chain, CHAIN.ARBITRUM).NATIVE_TOKEN
  }

  const contractAddressMap = getMappedValue(TOKEN_ADDRESS_TO_SYMBOL, indexToken, indexToken)

  if (contractAddressMap === null) {
    throw new Error(`Token ${indexToken} does not exist`)
  }

  return indexToken
}

export function getNativeTokenDescription(chain: CHAIN): ITokenDescription {
  const symbol = getMappedValue(CHAIN_NATIVE_TO_SYMBOL, chain, CHAIN.ARBITRUM)
  return TOKEN_DESCRIPTION_MAP[symbol]
}

export function getTokenDescription(token: ITokenTrade): ITokenDescription {
  return TOKEN_DESCRIPTION_MAP[getMappedValue(TOKEN_ADDRESS_TO_SYMBOL, token, token)]
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


