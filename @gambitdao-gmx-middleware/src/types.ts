import { CHAIN } from "@gambitdao/const"
import { Address, CallParameters, Chain, GetEventArgs, GetFunctionArgs, InferEventName, InferFunctionName, PublicClient, ReadContractParameters, SimulateContractParameters, Transport, WatchContractEventParameters, WatchEventParameters } from "viem"
import { Abi, AbiEvent, AbiStateMutability, Narrow } from "abitype"
import { ARBITRUM_ADDRESS_INDEX, ARBITRUM_ADDRESS_STABLE, ArbitrumAddress } from "./address/arbitrum.js"
import { AVALANCHE_ADDRESS_INDEX, AVALANCHE_ADDRESS_STABLE, AvalancheAddress } from "./address/avalanche.js"
import { TOKEN_SYMBOL } from "./address/symbol.js"
import { IntervalTime } from "./constant.js"
import { Stream } from "@most/types"


export type ITokenIndex = AVALANCHE_ADDRESS_INDEX | ARBITRUM_ADDRESS_INDEX
export type ITokenStable = AVALANCHE_ADDRESS_STABLE | ARBITRUM_ADDRESS_STABLE

export type ITokenTrade = ITokenIndex | ITokenStable
export type ITokenInput = ITokenTrade | "0x0000000000000000000000000000000000000000"

export type ITokenPricefeed = ITokenTrade | ArbitrumAddress['GLP'] | AvalancheAddress['GLP'] | ArbitrumAddress['GMX'] | AvalancheAddress['GMX']


export interface ITokenDescription {
  name: string
  symbol: TOKEN_SYMBOL
  isStable: boolean
  decimals: number
}


export interface IEnsRegistration {
  id: string
  labelName: string
  expiryDate: number
  domain: {
    resolvedAddress: {
      id: string
    }
    resolver: {
      texts: string[]
    }
  }
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
  collateralToken: ITokenIndex | ITokenStable
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
  averagePrice: bigint
}

export type IAbstractPosition = IAbstractPositionStake & IAbstractPositionIdentity


export interface IVaultPosition extends IAbstractPositionStake {
  entryFundingRate: bigint
  reserveAmount: bigint
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

export interface IPositionLiquidated extends IAbstractPosition, IndexedType<'LiquidatePosition'> {
  markPrice: bigint
  reserveAmount: bigint
  key: string
}

export interface IPositionClose extends IAbstractPosition, IndexedType<'ClosePosition'> {
  entryFundingRate: bigint
  averagePrice: bigint
  reserveAmount: bigint
  key: string
}

export interface KeeperIncreaseRequest {
  account: Address
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
  account: Address
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
  account: Address
  contract: string
  token: string
  amount: bigint
  amountUsd: bigint
  timestamp: number
}


export interface IAccountSummary {
  realisedPnl: bigint
  cumSize: bigint
  cumCollateral: bigint
  avgCollateral: bigint
  avgSize: bigint
  account: Address
  fee: bigint
  winCount: number
  lossCount: number
  maxCollateral: bigint
  avgLeverage: bigint
  openPnl: bigint
  pnl: bigint
  cumulativeLeverage: bigint
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

export interface IRequestSortApi<T> {
  selector: keyof T
  direction: 'desc' | 'asc'
}



export type IRequestAccountTradeListApi = IChainParamApi & IRequestPagePositionApi & IRequestAccountApi & { status?: TradeStatus }
export type IRequestPageApi = IRequestPagePositionApi & IChainParamApi & IRequestTimerangeApi



export type IRequestAccountApi = IChainParamApi & { account: Address }

export type IRequestPriceTimelineApi = IChainParamApi & IRequestTimerangeApi & { tokenAddress: ITokenPricefeed }
export type IRequestAccountHistoricalDataApi = IChainParamApi & IRequestAccountApi & IRequestTimerangeApi
export type IRequestPricefeedApi = IChainParamApi & IRequestTimerangeApi & { interval: IntervalTime, tokenAddress: ITokenPricefeed }
export type IRequestTradeListApi = IChainParamApi & IRequestPagePositionApi & IRequestSortApi<keyof ITradeAbstract> & { status: TradeStatus }


export interface IRequestGraphEntityApi extends IChainParamApi, IIdentifiableEntity { }



export interface IResponsePageApi<T> extends IRequestPagePositionApi {
  page: T[]
}

export type StreamInputArray<T extends readonly unknown[]> = {
  [P in keyof T]: Stream<T[P]>;
}

export type StreamInput<T> = {
  [P in keyof T]: Stream<T[P]> | T[P]
}

export type ContractFunctionConfig<
  TAddress,
  TAbi extends Abi,
  TTransport extends Transport,
  TChain extends Chain,
  TIncludeActions extends boolean,
  TPublicClient extends PublicClient<TTransport, TChain, TIncludeActions>,
> = {
  abi: Narrow<TAbi>
  address: TAddress
  client: TPublicClient
}
