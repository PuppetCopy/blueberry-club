import { Event } from "@ethersproject/contracts"
import { CHAIN } from "@gambitdao/wallet-link"
import { ARBITRUM_ADDRESS, ARBITRUM_ADDRESS_INDEX, ARBITRUM_ADDRESS_STABLE } from "./address/arbitrum"
import { AVALANCHE_ADDRESS, AVALANCHE_ADDRESS_INDEX, AVALANCHE_ADDRESS_STABLE } from "./address/avalanche"
import { TOKEN_SYMBOL } from "./address/symbol"
import { intervalTimeMap } from "./constant"

export type Address = string
export type ITokenTrade = ITokenIndex | ITokenStable

export type ITokenInput = ITokenTrade | "0x0000000000000000000000000000000000000000"
export type ITokenIndex = AVALANCHE_ADDRESS_INDEX | ARBITRUM_ADDRESS_INDEX
export type ITokenStable = AVALANCHE_ADDRESS_STABLE | ARBITRUM_ADDRESS_STABLE

export type ITokenPricefeed = ITokenTrade | ARBITRUM_ADDRESS.GLP | AVALANCHE_ADDRESS.GLP | ARBITRUM_ADDRESS.GMX | AVALANCHE_ADDRESS.GMX

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

export interface IAbstractPositionIdentity {
  indexToken: ITokenIndex
  collateralToken: ITokenIndex
  account: Address
  isLong: boolean
}

export type IAbstractPositionKey = {
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


export interface IPositionIncrease extends IAbstractPositionIdentity, IAbstractPositionAdjustment, IndexedType<'IncreasePosition'> {
  price: bigint, fee: bigint, key: string
}
export interface IPositionDecrease extends IAbstractPositionIdentity, IAbstractPositionAdjustment, IndexedType<'DecreasePosition'> {
  price: bigint, fee: bigint, key: string
}

export interface IPositionUpdate extends IAbstractPositionStake, IAbstractPositionKey, IndexedType<'UpdatePosition'> {
  markPrice: bigint
  averagePrice: bigint
  entryFundingRate: bigint
  reserveAmount: bigint
  key: string
}

export interface IPositionLiquidated extends IAbstractPositionIdentity, IAbstractPositionStake, IndexedType<'LiquidatePosition'> {
  markPrice: bigint
  reserveAmount: bigint
  key: string
}

export interface IPositionClose extends IAbstractPositionIdentity, IAbstractPositionStake, IndexedType<'ClosePosition'> {
  entryFundingRate: bigint
  averagePrice: bigint
  reserveAmount: bigint
  key: string
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
  // key: string
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
  // key: string
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

interface ITradeAbstract<T extends TradeStatus = TradeStatus> extends IEntityIndexed, IVaultPosition, IAbstractPositionIdentity {
  account: Address
  status: T
  averagePrice: bigint
  fee: bigint
  key: string

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


export interface IAccountSummary {
  realisedPnl: bigint
  size: bigint
  account: string
  fee: bigint
  winCount: number
  lossCount: number
}

export interface IAccountLadderSummary extends IAccountSummary {
  roi: bigint
  maxCollateral: bigint
  openPnl: bigint
  pnl: bigint
  cumulativeLeverage: bigint
}

export interface ILadderSummary {
  list: IAccountLadderSummary[]
  size: bigint
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
  tokenAddress: ITokenPricefeed
}

export interface IPriceLatest extends IndexedType<'PriceLatest'> {
  value: bigint
  id: ITokenPricefeed
  timestamp: number
}

export type IPriceLatestMap = {
  [P in ITokenPricefeed]: IPriceLatest
}


export interface IChainParamApi {
  chain: CHAIN
}


export interface IRequestTimerangeApi {
  from: number
  to: number
}

export interface IRequestPagePositionApi {
  offset: number
  pageSize: number
}

export interface IRequestSortApi<T extends string | number | symbol> {
  sortBy: T
  sortDirection: 'desc' | 'asc'
}

export interface IRequestPageApi<T> extends IRequestPagePositionApi {
  page: T[]
}

export type IRequestAccountTradeListApi = IChainParamApi & IRequestPagePositionApi & IRequestAccountApi & { status: TradeStatus };

export interface IRequestLeaderboardApi extends IRequestPagePositionApi, IChainParamApi, IRequestSortApi<keyof IAccountSummary> {
  timeInterval: intervalTimeMap.HR24 | intervalTimeMap.DAY7 | intervalTimeMap.MONTH
}
export interface IRequestCompetitionLadderApi extends IChainParamApi, IRequestPagePositionApi, IRequestTimerangeApi {
  referralCode: string
  maxCollateral: bigint
}

export type IRequestAccountApi = IChainParamApi & { account: string }

export type IRequestPriceTimelineApi = IChainParamApi & IRequestTimerangeApi & { tokenAddress: ITokenPricefeed }
export type IRequestAccountHistoricalDataApi = IChainParamApi & IRequestAccountApi & IRequestTimerangeApi
export type IRequestPricefeedApi = IChainParamApi & IRequestTimerangeApi & { interval: intervalTimeMap, tokenAddress: ITokenPricefeed }
export type IRequestTradeListApi = IChainParamApi & IRequestPagePositionApi & IRequestSortApi<keyof ITradeAbstract> & { status: TradeStatus }


export interface IRequestGraphEntityApi extends IChainParamApi, IIdentifiableEntity { }

