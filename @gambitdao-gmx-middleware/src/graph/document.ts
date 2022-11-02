import {
  IPagePositionParamApi, ITimerangeParamApi, IIdentifiableEntity, IPricefeed, ITrade,
  TradeStatus, IPriceTimelineParamApi, IPricefeedParamApi, IPriceLatest, IAccountTradeListParamApi
} from "../types"
import { gql, TypedDocumentNode } from "@urql/core"

const schemaFragments = `

fragment increasePositionFields on IncreasePosition {
  id
  timestamp
  account
  collateralToken
  indexToken
  isLong
  key
  collateralDelta
  sizeDelta
  fee
  price
}

fragment decreasePositionFields on DecreasePosition {
  id
  timestamp
  account
  collateralToken
  indexToken
  isLong
  key
  collateralDelta
  sizeDelta
  fee
  price
}

fragment updatePositionFields on UpdatePosition {
  id
  timestamp
  key
  size
  markPrice
  collateral
  reserveAmount
  realisedPnl
  averagePrice
  entryFundingRate
}

fragment closePositionFields on ClosePosition {
  id
  timestamp
  key
  size
  collateral
  reserveAmount
  realisedPnl
  averagePrice
  entryFundingRate
}

fragment liquidatePositionFields on LiquidatePosition {
  id
  timestamp
  key
  account
  collateralToken
  indexToken
  isLong
  size
  collateral
  reserveAmount
  realisedPnl
  markPrice
}

fragment tradeFields on Trade {
  id
  timestamp
  account
  collateralToken
  indexToken
  isLong
  key
  status

  increaseList(first: 1000) { ...increasePositionFields }
  decreaseList(first: 1000) { ...decreasePositionFields }
  updateList(first: 1000) { ...updatePositionFields }

  sizeDelta
  collateralDelta
  fee
  size
  collateral
  averagePrice

  realisedPnl
  realisedPnlPercentage
  settledTimestamp
  closedPosition { ...closePositionFields }
  liquidatedPosition { ...liquidatePositionFields }
  
}
`


export const tradeListQuery: TypedDocumentNode<{ trades: ITrade[] }, Partial<IPagePositionParamApi & ITimerangeParamApi & { status: TradeStatus }>> = gql`
${schemaFragments}

query ($pageSize: Int, $offset: Int = 0, $from: Int = 0, $to: Int = 1999999999 $status: Status = "closed") {
  trades(first: $pageSize, skip: $offset, where: {timestamp_gte: $from, timestamp_lte: $to, status: $status}) {
      ...tradeFields
  }
}
`

export const accountTradeListQuery: TypedDocumentNode<{ trades: ITrade[] }, Partial<IAccountTradeListParamApi>> = gql`
${schemaFragments}

query ($pageSize: Int = 1000, $account: String) {
  trades(first: $pageSize, skip: $offset, where: {account: $account}) {
      ...tradeFields
  }
}
`

export const tradeQuery: TypedDocumentNode<{ trade: ITrade }, IIdentifiableEntity> = gql`
${schemaFragments}

query ($id: String) {
  trade(id: $id) {
      ...tradeFields
  }
}
`


export const pricefeedDoc: TypedDocumentNode<{ pricefeeds: IPricefeed[] }, Omit<IPricefeedParamApi, 'chain'>> = gql`
${schemaFragments}

query($from: Int, $to: Int = 1999999999, $tokenAddress: TokenAddress, $interval: IntervalTime) {
  pricefeeds(first: 1000, orderBy: timestamp, orderDirection: asc, where: {tokenAddress: $tokenAddress, interval: $interval, timestamp_gte: $from, timestamp_lte: $to }) {
    id
    timestamp
    o
    h
    l
    c
    tokenAddress
    interval
  }
}
`

export const latestPriceTimelineQuery: TypedDocumentNode<{ priceLatests: IPriceLatest[] }, {}> = gql`
query {
  priceLatests {
    id
    value
    timestamp
  }
}
`


export const priceTimelineQuery: TypedDocumentNode<{ priceTimelines: IPricefeed[] }, IPriceTimelineParamApi> = gql`
query ($from: Int, $to: Int, $tokenAddress: TokenAddress ) {
  priceTimelines(first: 1000, orderBy: unixTimestamp, orderDirection: asc, where: { tokenAddress: $tokenAddress, timestamp_gte: $from, timestamp_lte: $to }) {
    timestamp,
    value
  }
}
`