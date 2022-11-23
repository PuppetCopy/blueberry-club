import { ARBITRUM_ADDRESS_INDEX, ARBITRUM_ADDRESS_STABLE } from "./address/arbitrum"
import { AVALANCHE_ADDRESS_INDEX, AVALANCHE_ADDRESS_STABLE } from "./address/avalanche"
import { TOKEN_SYMBOL } from "./address/symbol"
import { CHAIN, intervalTimeMap } from "./constant"

export type Address = string

export type AddressStable = AVALANCHE_ADDRESS_STABLE | ARBITRUM_ADDRESS_STABLE
export type AddressIndex = AVALANCHE_ADDRESS_INDEX | ARBITRUM_ADDRESS_INDEX
export type AddressTrade = AddressIndex | AddressStable
export type AddressInput = AddressTrade | "0x0000000000000000000000000000000000000000"


export interface TokenDescription {
  name: string
  symbol: TOKEN_SYMBOL
  isStable: boolean
  decimals: number
}

export interface Transaction {
  token: TokenDescription,
  from: Address
  to: Address
  value: bigint
}


export interface IIdentifiableEntity {
  id: string
}
export interface IEntityIndexed extends IIdentifiableEntity {
  timestamp: number
}

export type TypeName<T extends string> = { __typename: T }
export type IndexedType<T extends string> = TypeName<T> & IEntityIndexed

export interface KeeperResponse {
  account: string
  path: string[]
  indexToken: string
  amountIn: bigint
  minOut: bigint
  sizeDelta: bigint
  isLong: boolean
  acceptablePrice: bigint
  executionFee: bigint
  blockGap: bigint
  timeGap: bigint
}
export interface KeeperExecute extends KeeperResponse, IndexedType<'KeeperExecute'> {}
export interface KeeperReject extends KeeperResponse, IndexedType<'KeeperReject'> {}

export interface IAbstractPosition {
  account: Address
  collateralToken: AddressIndex
  indexToken: AddressIndex
  isLong: boolean
  key: string
}

export type IAbstractPositionDelta = {
  collateralDelta: bigint
  sizeDelta: bigint
}

export type IAbstractPositionStake = {
  collateral: bigint
  size: bigint
}

export type IAbstractRealisedPosition = IAbstractPositionStake & {
  realisedPnl: bigint
  realisedPnlPercentage: bigint
}

export type IVaultPosition = {
  key: string
  size: bigint
  // isLong: boolean
  collateral: bigint
  averagePrice: bigint
  entryFundingRate: bigint
  reserveAmount: bigint
  realisedPnl: bigint
  lastIncreasedTime: bigint
}

export type IPositionIncrease = IAbstractPosition & IAbstractPositionDelta & IndexedType<'IncreasePosition'> & { price: bigint,  fee: bigint }
export type IPositionDecrease = IAbstractPosition & IAbstractPositionDelta & IndexedType<'DecreasePosition'> & { price: bigint,  fee: bigint }

export type IPositionUpdate = IAbstractPositionStake & {
  key: string
  averagePrice: bigint
  realisedPnl: bigint
  markPrice: bigint
  entryFundingRate: bigint
  reserveAmount: bigint
} & IndexedType<'UpdatePosition'>

export type IPositionLiquidated = IAbstractPositionStake & {
  reserveAmount: bigint
  realisedPnl: bigint
  markPrice: bigint
} & IndexedType<'LiquidatePosition'>

export type IPositionClose = IAbstractPosition & IAbstractPositionStake & {
  size: bigint
  averagePrice: bigint
  realisedPnl: bigint
  entryFundingRate: bigint
  reserveAmount: bigint
} & IndexedType<'ClosePosition'>


export enum TradeStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LIQUIDATED = 'liquidated',
}

export type IAbstractTrade = IAbstractPositionDelta & IAbstractRealisedPosition & IAbstractPositionStake

interface ITradeAbstract<T extends TradeStatus = TradeStatus> extends IEntityIndexed, IAbstractTrade, IAbstractPosition {
  account: Address
  status: T
  averagePrice: bigint
  fee: bigint

  increaseList: IPositionIncrease[]
  decreaseList: IPositionDecrease[]
  updateList: IPositionUpdate[]
}

export type ITradeOpen = ITradeAbstract<TradeStatus.OPEN>
export type ITradeClosed = ITradeAbstract<TradeStatus.CLOSED> & {settledTimestamp: number, closedPosition: IPositionClose}
export type ITradeLiquidated = ITradeAbstract<TradeStatus.LIQUIDATED> & {settledTimestamp: number, liquidatedPosition: IPositionLiquidated}
export type ITradeSettled = ITradeClosed | ITradeLiquidated
export type ITrade = ITradeSettled | ITradeOpen

export interface IAccountSummary extends IAbstractTrade {
  account: string
  fee: bigint
  settledTradeCount: number
  winTradeCount: number
  openTradeCount: number
  claim: IClaim | null,
}

export interface IPriceTimeline {
  id: string
  value: bigint
  tokenAddress: AddressIndex
  timestamp: string
}

export interface IPricefeed extends IndexedType<'Pricefeed'> {
  timestamp: number
  o: bigint
  h: bigint
  l: bigint
  c: bigint
  tokenAddress: AddressIndex
}

export interface IPriceLatest extends IndexedType<'PriceLatest'> {
  value: bigint
  id: AddressIndex
  timestamp: number
}

export type IPriceLatestMap = {
  [P in AddressIndex]: IPriceLatest
}

export enum IClaimSource {
  TWITTER = 'TWITTER',
  ENS = 'ENS',
}


export interface IClaim {
  name: string
  account: Address
  sourceType: IClaimSource
  data: string
}

export interface Account {
  address: string
  settledPositionCount: number
  profitablePositionsCount: number
  realisedPnl: bigint
  claim: IClaim | null
}

export interface IChainParamApi {
  chain: CHAIN
}

export interface IAccountQueryParamApi {
  account: Address
}

export interface AccountHistoricalDataApi extends IAccountQueryParamApi {
  timeInterval: intervalTimeMap
}

export interface ITimerangeParamApi {
  from: number
  to: number
}

export interface IPagePositionParamApi {
  offset: number
  pageSize: number
}

export interface ISortParamApi<T extends string | number | symbol> {
  sortBy: T
  sortDirection: 'desc' | 'asc'
}

export interface IPageParapApi<T> extends IPagePositionParamApi {
  page: T[]
}


export interface ILeaderboardRequest extends IPagePositionParamApi, IChainParamApi, ISortParamApi<keyof IAccountSummary> {
  timeInterval: intervalTimeMap.HR24 | intervalTimeMap.DAY7 | intervalTimeMap.MONTH
}


export type IPriceTimelineParamApi = IChainParamApi & ITimerangeParamApi & { tokenAddress: AddressIndex }

export type IOpenTradesParamApi = IChainParamApi & IPagePositionParamApi & ISortParamApi<keyof ITradeOpen>
export type IAccountTradeListParamApi = IChainParamApi & IAccountQueryParamApi
export type IPricefeedParamApi = IChainParamApi & ITimerangeParamApi & { interval: intervalTimeMap, tokenAddress: AddressIndex }



export interface IRequestTradeQueryparam extends IChainParamApi, IIdentifiableEntity { }

