import { BASIS_POINTS_DIVISOR, FUNDING_RATE_PRECISION, MARGIN_FEE_BASIS_POINTS, MAX_LEVERAGE } from "./constant"
import { IAccountSummary,  ITrade, IPositionDelta,  IClaim, IClaimSource, IPositionClose, IPositionLiquidated, IAbstractPositionStake, ITradeSettled, IAbstractTrade, ITradeClosed, ITradeLiquidated, ITradeOpen, TradeStatus } from "./types"
import { formatFixed, groupByMapMany, isAddress } from "./utils"



export function getPositionCumulativeFundingFee(size: bigint, fundingRate: bigint) {
  return size * fundingRate / FUNDING_RATE_PRECISION
}

export function getPositionMarginFee(size: bigint) {
  return size - size * (BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR // TODO properly calculate cumulative fees
}



export function getLeverage ({ size, collateral }: IAbstractTrade): number {
  const levBn = size * BASIS_POINTS_DIVISOR / collateral
  return formatFixed(levBn, 4)
}

export function priceDelta(positionPrice: bigint, price: bigint, collateral: bigint, size: bigint) {
  const priceDelta = positionPrice > price ? positionPrice - price : price - positionPrice
  const delta = size * priceDelta / positionPrice

  return delta * BASIS_POINTS_DIVISOR / collateral
}

export function priceDeltaPercentage(positionPrice: bigint, price: bigint, collateral: bigint, size: bigint) {
  const delta = priceDelta(positionPrice, price, collateral, size)
  return delta * BASIS_POINTS_DIVISOR / collateral
}



export function calculatePositionDelta(marketPrice: bigint, averagePrice: bigint, isLong: boolean, { size, collateral }: IAbstractPositionStake): IPositionDelta {
  const priceDelta = averagePrice > marketPrice ? averagePrice - marketPrice : marketPrice - averagePrice

  const hasProfit = isLong ? marketPrice > averagePrice : marketPrice < averagePrice

  const delta = hasProfit ? size * priceDelta / averagePrice : -(size * priceDelta / averagePrice)
  const deltaPercentage = delta * BASIS_POINTS_DIVISOR / collateral

  return { delta, deltaPercentage }
}



export function getLiquidationPriceFromDelta(collateral: bigint, size: bigint, averagePrice: bigint, isLong: boolean) {
  const liquidationAmount = size * BASIS_POINTS_DIVISOR / MAX_LEVERAGE
  const liquidationDelta = collateral - liquidationAmount
  const priceDelta = liquidationDelta * averagePrice / size

  return isLong ? averagePrice - priceDelta : averagePrice + priceDelta
}


export function isTradeSettled(trade: ITrade): trade is ITradeSettled  {
  return trade.status !== TradeStatus.OPEN
}

export function isTradeOpen(trade: ITrade): trade is ITradeOpen  {
  return trade.status === TradeStatus.OPEN
}

export function isTradeLiquidated(trade: ITrade): trade is ITradeLiquidated  {
  return trade.status === TradeStatus.LIQUIDATED
}

export function isTradeClosed(trade: ITrade): trade is ITradeClosed  {
  return trade.status === TradeStatus.CLOSED
}

export function isPositionLiquidated(trade: IPositionClose | IPositionLiquidated): trade is IPositionLiquidated  {
  return 'markPrice' in trade
}

export function getFundingFee(entryFundingRate: bigint, cumulativeFundingRate: bigint, size: bigint) {
  return (size * (cumulativeFundingRate - entryFundingRate)) / FUNDING_RATE_PRECISION
}


export function toAccountSummary(list: ITrade[]): IAccountSummary[] {
  const settledListMap = groupByMapMany(list, a => a.account)
  const allPositions = Object.entries(settledListMap)

  return allPositions.reduce((seed, [account, allSettled]) => {

    const seedAccountSummary: IAccountSummary = {
      claim: null,
      account,

      collateral: 0n,
      size: 0n,

      fee: 0n,
      realisedPnl: 0n,

      collateralDelta: 0n,
      sizeDelta: 0n,
      realisedPnlPercentage: 0n,     

      winTradeCount: 0,
      settledTradeCount: 0,
      openTradeCount: 0,
    }

    const summary = allSettled.reduce((seed, next): IAccountSummary => {

      return {
        ...seed,
        fee: seed.fee + next.fee,
        collateral: seed.collateral + next.collateral,
        collateralDelta: seed.collateralDelta + next.collateralDelta,
        realisedPnl: seed.realisedPnl + (next.realisedPnl - next.fee),
        size: seed.size + next.size,
        sizeDelta: seed.sizeDelta + next.sizeDelta,
        realisedPnlPercentage: seed.realisedPnlPercentage + next.realisedPnlPercentage,
        
        winTradeCount: next.realisedPnl > 0n ? seed.winTradeCount + 1 : seed.winTradeCount,
        settledTradeCount: next.status === TradeStatus.CLOSED || next.status === TradeStatus.LIQUIDATED ? seed.settledTradeCount + 1 : seed.settledTradeCount,
        openTradeCount: next.status === TradeStatus.OPEN ? seed.openTradeCount + 1 : seed.openTradeCount,

      }
    }, seedAccountSummary) 

    seed.push(summary)

    return seed
  }, [] as IAccountSummary[])
}



function easeInExpo(x: number) {
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10)
}

export function liquidationWeight(isLong: boolean, liquidationPriceUSD: bigint, markPriceUSD: bigint) {
  const weight = isLong ? liquidationPriceUSD * BASIS_POINTS_DIVISOR / markPriceUSD : markPriceUSD * BASIS_POINTS_DIVISOR / liquidationPriceUSD
  const newLocal = formatFixed(weight, 4)
  const value = easeInExpo(newLocal)
  return value > 1 ? 1 : value
}


export function validateIdentityName(name: string) {
  if (typeof name === 'string' && name.startsWith('@') && !(/^@?(\w){1,15}$/.test(name))) {
    throw new Error('Invalid twitter handle')
  }

  if (typeof name !== 'string' || name.length > 15 || String(name).length < 4) {
    throw new Error('Invalid name')
  }

}

export function parseTwitterClaim(account: string, name: string): IClaim {
  if (!isAddress(account)) {
    throw new Error('Invalid address')
  }

  validateIdentityName(name)

  return {
    name,
    account,
    data: '',
    sourceType: IClaimSource.TWITTER
  }
}


