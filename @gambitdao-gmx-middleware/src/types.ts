import { Event } from "@ethersproject/contracts"
import { CHAIN } from "@gambitdao/wallet-link"
import { ARBITRUM_ADDRESS_INDEX, ARBITRUM_ADDRESS_STABLE } from "./address/arbitrum"
import { AVALANCHE_ADDRESS_INDEX, AVALANCHE_ADDRESS_STABLE } from "./address/avalanche"
import { TOKEN_SYMBOL } from "./address/symbol"
import { intervalTimeMap } from "./constant"

export type Address = string
export type ITokenTrade = ITokenIndex | ITokenStable

export type ITokenInput = ITokenTrade | "0x0000000000000000000000000000000000000000"
export type ITokenIndex = AVALANCHE_ADDRESS_INDEX | ARBITRUM_ADDRESS_INDEX | "0x0000000000000000000000000000000000000000"
export type ITokenStable = AVALANCHE_ADDRESS_STABLE | ARBITRUM_ADDRESS_STABLE | "0x0000000000000000000000000000000000000000"

export interface IGmxContractAddress {
  NATIVE_TOKEN: string

  Vault: string
  VaultPriceFeed: string
  Router: string
  Reader: string
  GlpManager: string
  RewardRouter: string
  RewardReader: string

  GLP: string
  GMX: string
  ES_GMX: string
  BN_GMX: string
  USDG: string

  StakedGmxTracker: string
  BonusGmxTracker: string
  FeeGmxTracker: string
  StakedGlpTracker: string
  FeeGlpTracker: string
  StakedGmxDistributor: string
  StakedGlpDistributor: string

  GmxVester: string
  GlpVester: string

  OrderBook: string
  OrderBookReader: string

  FastPriceFeed: string
  PositionRouter: string
  PositionManager: string
}


export interface ITokenDescription {
  name: string
  symbol: TOKEN_SYMBOL
  isStable: boolean
  decimals: number
}

export interface ITransaction {
  token: ITokenDescription,
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


export interface IAbstractPositionBase {
  account: Address
  collateralToken: ITokenIndex
  indexToken: ITokenIndex
  isLong: boolean
  key: string
}

export type IAbstractPositionIdentifier = {
  key: string
}

export type IAbstractPositionAdjustment = {
  collateralDelta: bigint
  sizeDelta: bigint
}

export type IAbstractPositionStake = {
  collateral: bigint
  size: bigint
  realisedPnl: bigint
}


export interface IVaultPosition extends IAbstractPositionStake {
  entryFundingRate: bigint
  reserveAmount: bigint
  averagePrice: bigint
  lastIncreasedTime: bigint
}


export interface IPositionIncrease extends IAbstractPositionBase, IAbstractPositionAdjustment, IndexedType<'IncreasePosition'> {
  price: bigint, fee: bigint
}
export interface IPositionDecrease extends IAbstractPositionBase, IAbstractPositionAdjustment, IndexedType<'DecreasePosition'> {
  price: bigint, fee: bigint
}

export interface IPositionUpdate extends IAbstractPositionStake, IAbstractPositionIdentifier, IndexedType<'UpdatePosition'> {
  markPrice: bigint
  averagePrice: bigint
  entryFundingRate: bigint
  reserveAmount: bigint
}

export interface IPositionLiquidated extends IAbstractPositionBase, IAbstractPositionStake, IndexedType<'LiquidatePosition'> {
  markPrice: bigint
  reserveAmount: bigint
}

export interface IPositionClose extends IAbstractPositionBase, IAbstractPositionStake, IndexedType<'ClosePosition'> {
  entryFundingRate: bigint
  averagePrice: bigint
  reserveAmount: bigint
}

export interface KeeperIncreaseRequest {
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
  key: string
}


export interface KeeperDecreaseRequest {
  account: string
  path: string[]
  indexToken: string
  collateralDelta: bigint
  sizeDelta: bigint
  isLong: boolean
  receiver: string
  acceptablePrice: bigint
  minOut: bigint
  executionFee: bigint
  blockGap: bigint
  timeGap: bigint
  key: string
}

export interface IMappedEvent {
  __event: Event
}



export enum TradeStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LIQUIDATED = 'liquidated',
}

export type IAbstractTrade = IAbstractPositionAdjustment & IAbstractPositionStake

interface ITradeAbstract<T extends TradeStatus = TradeStatus> extends IEntityIndexed, IVaultPosition, IAbstractPositionBase {
  account: Address
  status: T
  averagePrice: bigint
  fee: bigint

  increaseList: IPositionIncrease[]
  decreaseList: IPositionDecrease[]
  updateList: IPositionUpdate[]
}

export type ITradeOpen = ITradeAbstract<TradeStatus.OPEN>
export type ITradeClosed = ITradeAbstract<TradeStatus.CLOSED> & { settledTimestamp: number, closedPosition: IPositionClose }
export type ITradeLiquidated = ITradeAbstract<TradeStatus.LIQUIDATED> & { settledTimestamp: number, liquidatedPosition: IPositionLiquidated }
export type ITradeSettled = ITradeClosed | ITradeLiquidated
export type ITrade = ITradeSettled | ITradeOpen

export interface IStake extends IndexedType<"Stake"> {
  id: string
  account: string
  contract: string
  token: string
  amount: bigint
  amountUsd: bigint
  timestamp: number
}


export interface IAccountSummary extends IAbstractPositionStake {
  account: string
  fee: bigint
  winCount: number
  lossCount: number
  claim: IClaim | null,
}

export interface IPriceTimeline {
  id: string
  value: bigint
  tokenAddress: ITokenIndex
  timestamp: string
}

export interface IPricefeed extends IndexedType<'Pricefeed'> {
  timestamp: number
  o: bigint
  h: bigint
  l: bigint
  c: bigint
  tokenAddress: ITokenIndex
}

export interface IPriceLatest extends IndexedType<'PriceLatest'> {
  value: bigint
  id: ITokenIndex
  timestamp: number
}

export type IPriceLatestMap = {
  [P in ITokenIndex]: IPriceLatest
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


export type IPriceTimelineParamApi = IChainParamApi & ITimerangeParamApi & { tokenAddress: ITokenIndex }
export type IAccountHistoricalDataApi = IChainParamApi & IAccountQueryParamApi & ITimerangeParamApi
export type IOpenTradesParamApi = IChainParamApi & IPagePositionParamApi & ISortParamApi<keyof ITradeOpen>
export type IPricefeedParamApi = IChainParamApi & ITimerangeParamApi & { interval: intervalTimeMap, tokenAddress: ITokenIndex }
export type IAccountParamApi = IChainParamApi & IAccountQueryParamApi



export interface IRequestTradeQueryparam extends IChainParamApi, IIdentifiableEntity { }

