import { TREASURY_ARBITRUM } from "@gambitdao/gbc-middleware"
import { groupByMapMany, IAccountQueryParamApi, intervalInMsMap, ITimerange } from "@gambitdao/gmx-middleware"
import { ClientOptions, createClient, gql, TypedDocumentNode } from "@urql/core"
import { IOwner, IToken } from "../types"


export interface IStake {
  id: string
  account: string
  amount: bigint
  timestamp: number
  __typename: "StakeGmx" | "StakeGlp"
}

export interface IGlpStat {
  glpSupply: bigint
  aumInUsdg: bigint
  period: string
  id: string
  distributedEth: bigint
  __typename: "GlpStat"
}


export interface IPricefeedLatest {
  id: string
  feed: string
  value: bigint
  
  timestamp: number
  __typename: "PricefeedHistory"
}
export type IPriceFeedHistoryMap = {
  eth: IPricefeedHistory[]
  glpArbitrum: IPricefeedHistory[]
  glpAvalanche: IPricefeedHistory[]
  gmx: IPricefeedHistory[]
  avax: IPricefeedHistory[]
}

export type ILatestPriceMap = {
  eth: IPricefeedLatest
  glpArbitrum: IPricefeedLatest
  glpAvalanche: IPricefeedLatest
  gmx: IPricefeedLatest
  avax: IPricefeedLatest
}


export interface IPricefeedHistory {
  id: string
  feed: string

  o: bigint // open
  h: bigint // high
  l: bigint // low
  c: bigint // close
  
  timestamp: number
  interval: number
  period: string
  __typename: "PricefeedHistory"
}

export interface ITransfer {
  from: string
  id: string
  timestamp: number
  to: string
  value: bigint
}
export interface IStakingGlpTransfer extends ITransfer {
  __typename: "StakeGlp"
}
export interface IStakingGmxTransfer extends ITransfer {
  __typename: "StakeGmx"
}

export interface IStakingClaim {
  id: string
  timestamp: number
  receiver: string
  amount: bigint
  amountUsd: bigint
}


export interface IStakingGmxClaim extends IStakingClaim {
  __typename: "StakedGmxTrackerClaim"
}
export interface IStakingGlpClaim extends IStakingClaim {
  __typename: "StakedGlpTrackerClaim"
}
export interface IFeeGmxClaim extends IStakingClaim {
  __typename: "FeeGmxTrackerClaim"
}
export interface IFeeGlpClaim extends IStakingClaim {
  __typename: "FeeGlpTrackerClaim"
}

export type IAllRewards = IStakingGmxClaim | IStakingGlpClaim | IFeeGmxClaim | IFeeGlpClaim

const schemaFragments = `

fragment tokenFields on Token {
  id
  owner { ...ownerFields }
  uri
  transfers { ...transferFields }
  contract { ...contractFields }
}

fragment ownerFields on Owner {
  id
  ownedTokens
  balance
}

fragment contractFields on Contract {
  id
  name
  symbol
  totalSupply
  mintedTokens
}

fragment transferFields on Transfer {
  id
  from {...ownerFields}
  to {...ownerFields}
  timestamp
  block
  transactionHash
}

`

export type QueryAccount = {
  account: string
}

export type QueryAccountOwnerNfts = QueryAccount

export type QueryIdentifiable = {
  id: string
}

export type IQueryGmxEthHistoricPrice = Partial<ITimerange & { period: intervalInMsMap }>

const tokenDoc: TypedDocumentNode<{token: IToken | null}, QueryIdentifiable> = gql`
${schemaFragments}

query ($id: String) {
  token(id: $id) {
    ...tokenFields
  }
}

`

const stakedGmxGlpDoc: TypedDocumentNode<{stakeGmxes: IStake[], stakeGlps: IStake[]}, QueryAccount & Partial<ITimerange>> = gql`
${schemaFragments}

query ($first: Int = 1000, $account: String, $from: Int = 0, $to: Int = 1999999999) {
  stakeGmxes(first: $first, orderBy: timestamp, orderDirection: desc, where:{account: $account, timestamp_gte: $from, timestamp_lte: $to}) {
    account
    amount
    timestamp
    id
    token
    # transaction {
    #   from
    #   to
    #   id
    # }
  }

  unstakeGmxes(first: $first, orderBy: timestamp, orderDirection: desc, where:{account: $account, timestamp_gte: $from, timestamp_lte: $to}) {
    account
    amount
    timestamp
    id
    token
    # transaction {
    #   from
    #   to
    #   id
    # }
  }

  stakeGlps(first: $first, orderBy: timestamp, orderDirection: desc, where:{account: $account, timestamp_gte: $from, timestamp_lte: $to}) {
    account
    id
    amount
    timestamp
  }

  unstakeGlps(first: $first, orderBy: timestamp, orderDirection: desc, where:{account: $account, timestamp_gte: $from, timestamp_lte: $to}) {
    account
    amount
    timestamp
    id
  }
}

`


const gmxGlpEthHistoricPriceDoc: TypedDocumentNode<{ gmx: IPricefeedHistory[], glpArbitrum: IPricefeedHistory[], eth: IPricefeedHistory[] }, IQueryGmxEthHistoricPrice> = gql`
query ($first: Int = 1000, $period: IntervalTime = _14400, $from: Int = 0, $to: Int = 1999999999) {
  glpArbitrum: pricefeedHistories(first: $first, where: {timestamp_gt: $from, timestamp_lt: $to, interval: $period, feed: _0x321F653eED006AD1C29D174e17d96351BDe22649}) {
    id
    feed
    o
    h
    l
    c
    timestamp
    interval
  }
  gmx: pricefeedHistories(first: $first, where: {timestamp_gt: $from, timestamp_lt: $to, interval: $period, feed: _0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a}) {
    id
    feed
    o
    h
    l
    c
    timestamp
    interval
  }
  eth: pricefeedHistories(first: $first, where: {timestamp_gt: $from, timestamp_lt: $to, interval: $period, feed: _0x82af49447d8a07e3bd95bd0d56f35241523fbab1}) {
    id
    feed
    o
    h
    l
    c
    timestamp
    interval
  }
}
`

const avalancheHistoricPriceDoc: TypedDocumentNode<{ avax: IPricefeedHistory[], glpAvalanche: IPricefeedHistory[] }, IQueryGmxEthHistoricPrice> = gql`

query ($first: Int = 1000, $period: IntervalTime = _14400, $from: Int = 0, $to: Int = 1999999999) {
  avax: pricefeedHistories(first: $first, where: {timestamp_gt: $from, timestamp_lt: $to, interval: $period, feed: _0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7}) {
    id
    feed
    o
    h
    l
    c
    timestamp
    interval
  }
  glpAvalanche: pricefeedHistories(first: $first, where: {timestamp_gt: $from, timestamp_lt: $to, interval: $period, feed: _0xe1ae4d4b06A5Fe1fc288f6B4CD72f9F8323B107F}) {
    id
    feed
    o
    h
    l
    c
    timestamp
    interval
  }
}


`



const arbitrumLatestPrices: TypedDocumentNode<{ gmx: IPricefeedLatest, glpArbitrum: IPricefeedLatest, eth: IPricefeedLatest }, {}> = gql`
query {
  eth: pricefeedLatest(id: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1") {
    id
    value
    timestamp
  }
  gmx: pricefeedLatest(id: "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a") {
    id
    value
    timestamp
  }
  glpArbitrum: pricefeedLatest(id: "0x321F653eED006AD1C29D174e17d96351BDe22649") {
    id
    value
    timestamp
  }
}
`

const avalancheLatestPrices: TypedDocumentNode<{ avax: IPricefeedLatest, glpAvalanche: IPricefeedLatest }, {}> = gql`
query {
  avax: pricefeedLatest(id: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7") {
    id
    value
    timestamp
  }
  glpAvalanche: pricefeedLatest(id: "0xe1ae4d4b06A5Fe1fc288f6B4CD72f9F8323B107F") {
    id
    value
    timestamp
  }
}

`


const ownerDoc: TypedDocumentNode<{owner: IOwner}, QueryAccountOwnerNfts> = gql` 
${schemaFragments}

query ($account: String) {
  owner(id: $account) {
    ownedTokens {
      uri
      id
    }
    balance
  }
}

`

const ownerTransferList: TypedDocumentNode<{owner: IOwner}, QueryAccountOwnerNfts> = gql`
${schemaFragments}

query ($first: Int = 1000, $account: String) {
  owner(id: $account) {
    ownedTokens(first: $first) {
      transfers {
        transactionHash
        id
        from {
          id
        }
      }
      uri
      id
    }
    balance
  }
}
`


const trasnfer = `
    from
    id
    timestamp
    to
    value
`
const claim = `
  id
  timestamp
  receiver
  amount
  amountUsd
`
const rewardsTrackerDoc: TypedDocumentNode<{
  stakedGmxTrackerClaims: IStakingGmxClaim[],
  stakedGlpTrackerClaims: IStakingGlpClaim[],
  stakeGmxes: IStake[],
  unStakeGmxes: IStake[],
  feeGmxTrackerClaims: IFeeGmxClaim[],
  feeGlpTrackerClaims: IFeeGlpClaim[],
  feeGmxTrackerTransfers: ITransfer[],
  feeGlpTrackerTransfers: ITransfer[],
  bonusGmxTrackerTransfers: ITransfer[]
}, IAccountQueryParamApi & Partial<ITimerange>> = gql`

query ($first: Int = 1000, $account: String, $period: IntervalTime = _86400, $from: Int = 0, $to: Int = 1999999999) {

  stakeGmxes(first: $first, orderBy: timestamp, orderDirection: desc, where:{account: $account, timestamp_gte: $from, timestamp_lte: $to}) {
    account
    amount
    timestamp
    id
    token
    # transaction {
    #   from
    #   to
    #   id
    # }
  }

  unstakeGmxes(first: $first, orderBy: timestamp, orderDirection: desc, where:{account: $account, timestamp_gte: $from, timestamp_lte: $to}) {
    account
    amount
    timestamp
    id
    token
    # transaction {
    #   from
    #   to
    #   id
    # }
  }

  feeGmxTrackerClaims(first: $first, orderBy: timestamp, orderDirection: desc, where:{receiver: $account, timestamp_gte: $from, timestamp_lte: $to}) {
    ${claim}
  }

  feeGlpTrackerClaims(first: $first, orderBy: timestamp, orderDirection: desc, where:{receiver: $account, timestamp_gte: $from, timestamp_lte: $to}) {
    ${claim}
  }

  stakedGmxTrackerClaims(first: $first, orderBy: timestamp, orderDirection: desc, where:{receiver: $account, timestamp_gte: $from, timestamp_lte: $to}) {
    ${claim}
  }

  stakedGlpTrackerClaims(first: $first, orderBy: timestamp, orderDirection: desc, where:{receiver: $account, timestamp_gte: $from, timestamp_lte: $to}) {
    ${claim}
  }

  bonusGmxTrackerTransfers(first: $first, orderBy: timestamp, orderDirection: desc, where:{to: $account, timestamp_gte: $from, timestamp_lte: $to}) {
    ${trasnfer}
  }
}


`





const prepareClient = (opts: ClientOptions) => {

  const client = createClient(opts)

  return async <Data, Variables extends object = {}>(document: TypedDocumentNode<Data, Variables>, params: Variables): Promise<Data> => {
    const result = await client.query(document, params)
      .toPromise()
  
    if (result.error) {
      throw new Error(result.error.message)
    }
  
    return result.data!
  }
}

const blueberryGraph = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/blueberry-club',
})

const gmxRawGraph = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/gkrasulya/gmx-raw',
})

const gmxAvalancheStats = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-stats-avalanche',
})

const gmxArbitrumStats = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-raw',
})


export const queryOwnerTrasnferNfts = async (account: string) => {
  const owner = (await blueberryGraph(ownerTransferList, { account: account.toLowerCase() })).owner

  if (owner === null) {
    return []
  }

  return Object.entries(groupByMapMany(owner.ownedTokens, token => token.transfers[0].transactionHash))
}

export const queryOwner = async () => {
  const owner = (await blueberryGraph(ownerDoc, { account: TREASURY_ARBITRUM })).owner

  if (owner === null) {
    return []
  }

  return Object.entries(groupByMapMany(owner.ownedTokens, token => token.transfers[0].transactionHash))
}
 
export const queryToken = async (id: string) => {
  const owner = (await blueberryGraph(tokenDoc, { id })).token

  if (owner === null) {
    throw new Error(`Token #${id} not found`)
  }

  return owner
}

export const queryStakingEvents = async (params: Partial<ITimerange> & IAccountQueryParamApi) => {
  const owner = (await gmxRawGraph(stakedGmxGlpDoc, params))

  return owner
}



export const gmxGlpPriceHistory = async ({ from, to }: IQueryGmxEthHistoricPrice = {}): Promise<IPriceFeedHistoryMap> => {
  const queryArbi = gmxArbitrumStats(gmxGlpEthHistoricPriceDoc, { from, to })
  const queryAvax = gmxAvalancheStats(avalancheHistoricPriceDoc, { from, to })
  const { eth, glpArbitrum, gmx } = (await queryArbi)
  const { avax, glpAvalanche } = (await queryAvax)

  return {
    eth: eth.map(fromPricefeedJson),
    glpArbitrum: glpArbitrum.map(fromPricefeedJson),
    glpAvalanche: glpAvalanche.map(fromPricefeedJson),
    gmx: gmx.map(fromPricefeedJson),
    avax: avax.map(fromPricefeedJson),
  }
}

export const queryLatestPrices = async (): Promise<ILatestPriceMap> => {
  const queryArbi = gmxArbitrumStats(arbitrumLatestPrices, {})
  const queryAvax = gmxAvalancheStats(avalancheLatestPrices, {})
  const { eth, glpArbitrum, gmx } = await queryArbi
  const { glpAvalanche, avax } = await queryAvax


  return {
    gmx: fromLatestPriceJson(gmx),
    eth: fromLatestPriceJson(eth),
    avax: fromLatestPriceJson(avax),
    glpArbitrum: fromLatestPriceJson(glpArbitrum),
    glpAvalanche: fromLatestPriceJson(glpAvalanche),
  }
}

export const queryRewards = async (config: IAccountQueryParamApi & Partial<ITimerange>) => {
  const data = (await gmxArbitrumStats(rewardsTrackerDoc, config))

  const stakedGlpTrackerClaims = data.stakedGlpTrackerClaims.map(fromStakingJson)
  const stakedGmxTrackerClaims = data.stakedGmxTrackerClaims.map(fromStakingJson)
  const feeGlpTrackerClaims = data.feeGlpTrackerClaims.map(fromStakingJson)
  const feeGmxTrackerClaims = data.feeGmxTrackerClaims.map(fromStakingJson)

  return { ...data, stakedGlpTrackerClaims, stakedGmxTrackerClaims, feeGlpTrackerClaims, feeGmxTrackerClaims }
}

function fromLatestPriceJson<T extends IPricefeedLatest>(obj: T): T {
  return {
    ...obj,
    value: BigInt(obj.value),
  }
}

function fromStakingJson<T extends {amountUsd: bigint, amount: bigint}>(obj: T): T {
  return {
    ...obj,
    amountUsd: BigInt(obj.amountUsd),
    amount: BigInt(obj.amount),
  }
}

function fromPricefeedJson(obj: IPricefeedHistory): IPricefeedHistory {
  return {
    ...obj,
    o: BigInt(obj.o),
    h: BigInt(obj.h),
    l: BigInt(obj.l),
    c: BigInt(obj.c),
  }
}
