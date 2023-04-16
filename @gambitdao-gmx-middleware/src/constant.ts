import { CHAIN } from "@gambitdao/const"
import { ARBITRUM_ADDRESS } from "./address/arbitrum.js"
import { AVALANCHE_ADDRESS } from "./address/avalanche.js"

export const AddressZero = "0x0000000000000000000000000000000000000000" as const

export const USD_DECIMALS = 30
export const USDG_DECIMALS = 18

export const BASIS_POINTS_DIVISOR = 10000n
export const DEPOSIT_FEE = 30n
export const LIMIT_LEVERAGE = 1000000n
export const MAX_LEVERAGE = 1000000n
export const MIN_LEVERAGE = 11000n
export const LEVERAGE_LIQUIDAITON = 1000000n
export const DEDUCT_USD_FOR_GAS = 10n ** 30n * 2n

export const USD_PERCISION = 10n ** 30n
export const LIQUIDATION_FEE = 10n ** 5n

export const TAX_BASIS_POINTS = 50n
export const STABLE_TAX_BASIS_POINTS = 5n
export const MINT_BURN_FEE_BASIS_POINTS = 25n
export const SWAP_FEE_BASIS_POINTS = 30n
export const STABLE_SWAP_FEE_BASIS_POINTS = 1n
export const MARGIN_FEE_BASIS_POINTS = 10n

export const FUNDING_RATE_PRECISION = 1000000n


export enum intervalTimeMap {
  SEC = 1,
  MIN = 60,
  MIN5 = 300,
  MIN15 = 900,
  MIN30 = 1800,
  MIN60 = 3600,
  HR2 = 7200,
  HR4 = 14400,
  HR8 = 28800,
  HR24 = 86400,
  DAY7 = 604800,
  MONTH = 2628000,
  MONTH2 = 5256000,
  YEAR = 31536000
}



export const TRADE_CONTRACT_MAPPING = {
  [CHAIN.ARBITRUM]: ARBITRUM_ADDRESS,
  [CHAIN.AVALANCHE]: AVALANCHE_ADDRESS
}
