import { GLP_DECIMALS, TREASURY, USD_PRECISION } from "@gambitdao/gbc-middleware"
import { expandDecimals, formatFixed, formatReadableUSD, groupByMapMany, IAccountQueryParamApi, ITimerange, parseFixed, readableNumber } from "@gambitdao/gmx-middleware"
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
  period: number
  id: string
  distributedEth: bigint
  __typename: "GlpStat"
}

export interface IUniswapSwap {
  value: bigint
  timestamp: number
  period: number
  id: string
  token: string
  __typename: "UniswapPrice"
}

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

const tokenDoc: TypedDocumentNode<{token: IToken | null}, QueryIdentifiable> = gql`
${schemaFragments}

query ($id: String) {
  token(id: $id) {
    ...tokenFields
  }
}

`

const stakedGmxGlpDoc: TypedDocumentNode<{stakeGmxes: IStake[], stakeGlps: IStake[]}, QueryAccount> = gql`
${schemaFragments}

query ($first: Int = 1000, $account: String) {
  stakeGmxes(first: $first, orderBy: timestamp, orderDirection: desc, where:{account: $account}) {
    account
    amount
    timestamp
    id
    token
    transaction {
      from
      to
      id
    }
  }

  unstakeGmxes(first: $first, orderBy: timestamp, orderDirection: desc, where:{account: $account}) {
    account
    amount
    timestamp
    id
    token
    transaction {
      from
      to
      id
    }
  }

  
  stakeGlps(first: $first, orderBy: timestamp, orderDirection: desc, where:{account: $account}) {
    account
    id
    transaction {
      to
    }
    amount
    timestamp
  }
  unstakeGlps(first: $first, orderBy: timestamp, orderDirection: desc, where:{account: $account}) {
    account
    amount
    timestamp
    id
  }
}

`

const gmxHistoricPriceDoc: TypedDocumentNode<{uniswapPrices: IUniswapSwap[], glpStats: IGlpStat[]}, IAccountQueryParamApi & ITimerange> = gql`
${schemaFragments}

query ($first: Int = 1000) {
  uniswapPrices(first: $first, orderBy: timestamp, orderDirection: desc) {
    value
    timestamp
    period
    id
    token
  }

  glpStats(first: $first, orderBy: id, orderDirection: desc) {
    glpSupply
    aumInUsdg
    period
    id
    distributedEth 
  }
  
}

`

const latestPrices: TypedDocumentNode<{eth: {value: string}, glpStats: IGlpStat[], gmx: {value: string}}, {}> = gql`
query ($first: Int = 1000) {
  eth: chainlinkPrice(id: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1") {
    value
  }
  
  glpStats(first: 1,orderBy: id, orderDirection: desc) {
    glpSupply
    aumInUsdg
  }
  
  gmx: uniswapPrice(id: "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a") {
    value
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

query ($account: String) {
  owner(id: $account) {
    ownedTokens {
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

const gmxStatsGraph = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats',
})


export const queryOwnerTrasnferNfts = async (account: string) => {
  const owner = (await blueberryGraph(ownerTransferList, { account: account.toLowerCase() })).owner

  if (owner === null) {
    return []
  }

  return Object.entries(groupByMapMany(owner.ownedTokens, token => token.transfers[0].transactionHash))
}

export const queryOwner = async () => {
  const owner = (await blueberryGraph(ownerDoc, { account: TREASURY })).owner

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

export const queryStakedEsGMX = async () => {
  const owner = (await gmxRawGraph(stakedGmxGlpDoc, { account: TREASURY }))

  return owner
}

export const gmxPriceHistory = async () => {
  const owner = (await gmxStatsGraph(gmxHistoricPriceDoc, { account: TREASURY, from: 1, to: 1 }))

  return owner
}

export const queryLatestPrices = async () => {
  const owner = (await gmxStatsGraph(latestPrices, {}))
  const gmx = BigInt(owner.gmx.value)
  const eth = BigInt(owner.eth.value)
  const glp = (BigInt(owner.glpStats[0].aumInUsdg) * expandDecimals(1n, GLP_DECIMALS)) / BigInt(owner.glpStats[0].glpSupply)


  // const glpUsd = formatFixed(BigInt(owner.glpStats[0].aumInUsdg), 18) / formatFixed(BigInt(owner.glpStats[0].glpSupply), 18)
  // const gmxUsd = formatFixed(gmx)
  // const ethUsd = formatFixed(parseFixed(Number(eth) / 1e8, 30))

  return { gmx, glp, eth }
}





