import {
  AddressZero, TOKEN_DESCRIPTION_MAP,
  ITokenDescription, TOKEN_ADDRESS_TO_SYMBOL, ITokenInput, ITokenTrade, CHAIN_ADDRESS_MAP, CHAIN_NATIVE_TO_SYMBOL, getSafeMappedValue, CHAIN
} from "@gambitdao/gmx-middleware"






export function resolveAddress(chain: CHAIN, indexToken: ITokenInput): ITokenTrade {
  if (indexToken === AddressZero) {
    return getSafeMappedValue(CHAIN_ADDRESS_MAP, chain, CHAIN.ARBITRUM).NATIVE_TOKEN
  }

  const contractAddressMap = getSafeMappedValue(TOKEN_ADDRESS_TO_SYMBOL, indexToken, indexToken)

  if (contractAddressMap === null) {
    throw new Error(`Token ${indexToken} does not exist`)
  }

  return indexToken
}

export function getNativeTokenDescription(chain: CHAIN): ITokenDescription {
  const symbol = getSafeMappedValue(CHAIN_NATIVE_TO_SYMBOL, chain, CHAIN.ARBITRUM)
  return TOKEN_DESCRIPTION_MAP[symbol]
}

