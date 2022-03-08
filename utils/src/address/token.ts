import { CHAIN } from "../constant"
import { TokenDescription } from "../types"
import { ARBITRUM_TRADEABLE_ADDRESS, ARBITRUM_USD_COINS } from "./arbitrum"
import { AVALANCHE_TRADEABLE_ADDRESS, AVALANCHE_USD_COINS } from "./avalanche"
import { TOKEN_SYMBOL } from "./symbol"


export const AddressZero = "0x0000000000000000000000000000000000000000"


const TOKEN_DESCRIPTION_LIST = [
  {
    name: "Avalanche",
    symbol: TOKEN_SYMBOL.AVAX,
    decimals: 18,
  },
  {
    name: "Chainlink",
    symbol: TOKEN_SYMBOL.LINK,
    decimals: 18,
  },
  {
    name: "Bitcoin",
    symbol: TOKEN_SYMBOL.BTC,
    decimals: 18,
  },
  {
    name: "Ethereum",
    symbol: TOKEN_SYMBOL.ETH,
    decimals: 18,
  },
  {
    name: "Uniswap",
    symbol: TOKEN_SYMBOL.UNI,
    decimals: 18,
  },
] as TokenDescription[]



export function groupByMapMany<A, B extends string | symbol | number>(list: A[], getKey: (v: A) => B) {
  const map: { [P in B]: A[] } = {} as any

  list.forEach(item => {
    const key = getKey(item)

    map[key] ??= []
    map[key].push(item)
  })

  return map
}

export function getMappedKeyByValue<T>(map: { [P in keyof T]: T[P] }, match: T[keyof T]): keyof T {
  const entires = Object.entries(map)
  const [tokenAddress]: any[] = entires.find(([_, symb]) => symb === match) || []

  if (!tokenAddress) {
    throw new Error(`No token ${match} matched`)
  }

  return tokenAddress
}

export function groupByMap<A, B extends string | symbol | number>(list: A[], getKey: (v: A) => B) {
  const map: { [P in B]: A } = {} as any

  list.forEach((item) => {
    const key = getKey(item)

    if (map[key]) {
      console.warn(new Error(`${groupByMap.name}() is overwriting property: ${key}`))
    }

    map[key] = item
  })

  return map
}

export const TOKEN_DESCRIPTION_MAP = groupByMap(TOKEN_DESCRIPTION_LIST, token => token.symbol)


export const TOKEN_ADDRESS_TO_SYMBOL = {
  [ARBITRUM_TRADEABLE_ADDRESS.LINK]: TOKEN_SYMBOL.LINK,
  [ARBITRUM_TRADEABLE_ADDRESS.UNI]: TOKEN_SYMBOL.UNI,
  [ARBITRUM_TRADEABLE_ADDRESS.WBTC]: TOKEN_SYMBOL.BTC,
  [ARBITRUM_TRADEABLE_ADDRESS.WETH]: TOKEN_SYMBOL.ETH,
  [ARBITRUM_USD_COINS.DAI]: TOKEN_SYMBOL.DAI,
  [ARBITRUM_USD_COINS.FRAX]: TOKEN_SYMBOL.FRAX,
  [ARBITRUM_USD_COINS.MIM]: TOKEN_SYMBOL.MIM,
  [ARBITRUM_USD_COINS.USDC]: TOKEN_SYMBOL.USDC,
  [ARBITRUM_USD_COINS.USDT]: TOKEN_SYMBOL.USDT,

  [AVALANCHE_TRADEABLE_ADDRESS.WAVAX]: TOKEN_SYMBOL.AVAX,
  [AVALANCHE_TRADEABLE_ADDRESS.WBTCE]: TOKEN_SYMBOL.BTC,
  [AVALANCHE_TRADEABLE_ADDRESS.WETHE]: TOKEN_SYMBOL.ETH,
  [AVALANCHE_USD_COINS.MIM]: TOKEN_SYMBOL.MIM,
  [AVALANCHE_USD_COINS.USDC]: TOKEN_SYMBOL.USDC,
  [AVALANCHE_USD_COINS.USDCE]: TOKEN_SYMBOL.USDC,
}

export const CHAIN_TOKEN_ADDRESS_TO_SYMBOL = {
  [CHAIN.ARBITRUM]: {
    [ARBITRUM_TRADEABLE_ADDRESS.LINK]: TOKEN_SYMBOL.LINK,
    [ARBITRUM_TRADEABLE_ADDRESS.UNI]: TOKEN_SYMBOL.UNI,
    [ARBITRUM_TRADEABLE_ADDRESS.WBTC]: TOKEN_SYMBOL.BTC,
    [ARBITRUM_TRADEABLE_ADDRESS.WETH]: TOKEN_SYMBOL.ETH,
    [ARBITRUM_USD_COINS.DAI]: TOKEN_SYMBOL.DAI,
    [ARBITRUM_USD_COINS.FRAX]: TOKEN_SYMBOL.FRAX,
    [ARBITRUM_USD_COINS.MIM]: TOKEN_SYMBOL.MIM,
    [ARBITRUM_USD_COINS.USDC]: TOKEN_SYMBOL.USDC,
    [ARBITRUM_USD_COINS.USDT]: TOKEN_SYMBOL.USDT,
  },
  [CHAIN.AVALANCHE]: {
    [AVALANCHE_TRADEABLE_ADDRESS.WAVAX]: TOKEN_SYMBOL.AVAX,
    [AVALANCHE_TRADEABLE_ADDRESS.WBTCE]: TOKEN_SYMBOL.BTC,
    [AVALANCHE_TRADEABLE_ADDRESS.WETHE]: TOKEN_SYMBOL.ETH,
    [AVALANCHE_USD_COINS.MIM]: TOKEN_SYMBOL.MIM,
    [AVALANCHE_USD_COINS.USDC]: TOKEN_SYMBOL.USDC,
    [AVALANCHE_USD_COINS.USDCE]: TOKEN_SYMBOL.USDC,
  }
}


export function getTokenDescription(indexToken: ARBITRUM_TRADEABLE_ADDRESS | AVALANCHE_TRADEABLE_ADDRESS) {
  const ticker = TOKEN_ADDRESS_TO_SYMBOL[indexToken]
  const tokenDesc = TOKEN_DESCRIPTION_MAP[ticker]

  return tokenDesc
}




