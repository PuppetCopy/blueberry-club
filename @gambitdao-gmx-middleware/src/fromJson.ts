import { isTradeClosed, isTradeLiquidated } from "."
import {
  ITrade, IIdentifiableEntity, IPositionClose, IPositionDecrease,
  IPositionIncrease, IPositionLiquidated, IPositionUpdate, IAccountSummary, IAbstractPositionDelta,
  IPricefeed, IPriceLatest, AddressIndex,
} from "./types"


export function baseEntityJson<T extends  IIdentifiableEntity>(json: T): T {
  return { ...json }
}

export function positonCloseJson(json: IPositionClose): IPositionClose {
  const realisedPnl = BigInt(json.realisedPnl)
  const collateral = BigInt(json.collateral)
  const entryFundingRate = BigInt(json.entryFundingRate)
  const averagePrice = BigInt(json.averagePrice)
  const size = BigInt(json.size)

  return { ...baseEntityJson(json), size, collateral, entryFundingRate, realisedPnl, averagePrice }
}

export function positionLiquidatedJson(json: IPositionLiquidated): IPositionLiquidated {
  const collateral = BigInt(json.collateral)
  const markPrice = BigInt(json.markPrice)
  const size = BigInt(json.size)
  const realisedPnl = BigInt(json.realisedPnl)
  const reserveAmount = BigInt(json.reserveAmount)

  return { ...baseEntityJson(json), size, markPrice, realisedPnl, collateral, reserveAmount, }
}

export function pricefeedJson(json: IPricefeed): IPricefeed {
  const c = BigInt(json.c)
  const h = BigInt(json.h)
  const l = BigInt(json.l)
  const o = BigInt(json.o)
  const tokenAddress = json.tokenAddress.slice(1) as AddressIndex

  return { ...json, c, h, l, o, tokenAddress }
}

export function priceLatestJson(json: IPriceLatest): IPriceLatest {
  const value = BigInt(json.value)

  return { ...json, value }
}

export function positionDeltaJson<T extends IAbstractPositionDelta>(json: T): T {
  const sizeDelta = BigInt(json.sizeDelta)
  const collateralDelta = BigInt(json.collateralDelta)

  return { ...json, sizeDelta, collateralDelta, }
}

export function positionIncreaseJson(json: IPositionIncrease): IPositionIncrease {
  const price = BigInt(json.price)
  const fee = BigInt(json.fee)

  return { ...json, ...positionDeltaJson(json), price, fee }
}

export function positionDecreaseJson(json: IPositionDecrease): IPositionDecrease {
  const price = BigInt(json.price)
  const fee = BigInt(json.fee)

  return { ...json, ...positionDeltaJson(json), price, fee }
}

export function positionUpdateJson(json: IPositionUpdate): IPositionUpdate {
  const collateral = BigInt(json.collateral)
  const averagePrice = BigInt(json.averagePrice)
  const size = BigInt(json.size)
  const markPrice = BigInt(json.markPrice)
  const entryFundingRate = BigInt(json.entryFundingRate)
  const realisedPnl = BigInt(json.realisedPnl)
  const reserveAmount = BigInt(json.reserveAmount)

  return { ...json, collateral, averagePrice, markPrice, size, entryFundingRate, realisedPnl, reserveAmount }
}


export function toTradeJson<T extends ITrade>(json: T): T {
  const decreaseList = json.decreaseList.map(positionDecreaseJson).sort((a, b) => a.timestamp - b.timestamp)
  const increaseList = json.increaseList.map(positionIncreaseJson).sort((a, b) => a.timestamp - b.timestamp)
  const updateList = json.updateList.map(positionUpdateJson).sort((a, b) => a.timestamp - b.timestamp)
  
  const realisedPnl = BigInt(json.realisedPnl)
  const averagePrice = BigInt(json.averagePrice)
  const collateral = BigInt(json.collateral)
  const collateralDelta = BigInt(json.collateralDelta)

  
  const closedPosition = isTradeClosed(json) ? positonCloseJson(json.closedPosition) : null
  const liquidatedPosition = isTradeLiquidated(json) ? positionLiquidatedJson(json.liquidatedPosition) : null


  return {
    ...json, decreaseList, increaseList, updateList,
    closedPosition,
    liquidatedPosition,

    realisedPnl,
    realisedPnlPercentage: BigInt(json.realisedPnlPercentage),

    averagePrice,
    collateral,
    collateralDelta,
    fee: BigInt(json.fee),
    size: BigInt(json.size),
    sizeDelta: BigInt(json.sizeDelta),
  }
}




export function toTradeSummary<T extends ITrade>(json: T): T {
  const size = BigInt(json.size)
  const collateral = BigInt(json.collateral)
  const fee = BigInt(json.fee)

  return { ...json, size, collateral, fee  }
}


export function accountSummaryJson(json: IAccountSummary): IAccountSummary {
  const realisedPnl = BigInt(json.realisedPnl)
  const realisedPnlPercentage = BigInt(json.realisedPnlPercentage)
  const fee = BigInt(json.fee)
  const collateral = BigInt(json.collateral)
  const size = BigInt(json.size)

  return { ...json, ...positionDeltaJson(json),  collateral, fee, size, realisedPnl, realisedPnlPercentage }
}




