import { O } from "@aelea/core"
import { awaitPromises, map } from "@most/core"
import { CHAIN, intervalTimeMap } from "./constant"
import { tradeJson } from "./fromJson"
import { toAccountSummary } from "./gmxUtils"
import { IAccountHistoricalDataApi, IAccountQueryParamApi, IChainParamApi, ILeaderboardRequest, IPricefeed, IPricefeedParamApi, IPriceLatest, IRequestTradeQueryparam, IStake, ITrade, TradeStatus } from "./types"
import { cacheMap, createSubgraphClient, pagingQuery, unixTimestampNow } from "./utils"
import { gql } from "@urql/core"
import { fromJson } from "."

export type IAccountTradeListParamApi = IChainParamApi & IAccountQueryParamApi & { status: TradeStatus };


const createCache = cacheMap({})

const cacheLifeMap = {
  [intervalTimeMap.HR24]: intervalTimeMap.MIN5,
  [intervalTimeMap.DAY7]: intervalTimeMap.MIN30,
  [intervalTimeMap.MONTH]: intervalTimeMap.MIN60,
}

export const arbitrumGraph = createSubgraphClient({
  fetch,
  url: 'https://api.thegraph.com/subgraphs/id/QmZ1bmoWAGRaZxASd3rerw4BWUtvHu6wJLUNpa8NbzWdUv'
})

export const avalancheGraph = createSubgraphClient({
  fetch,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-avalanche'
})


export const subgraphChainMap: { [p in CHAIN]: typeof arbitrumGraph } = {
  [CHAIN.ARBITRUM]: arbitrumGraph,
  [CHAIN.AVALANCHE]: avalancheGraph,
} as any



export const pricefeed = O(
  map(async (queryParams: IPricefeedParamApi) => {
    const newLocal = `
      {
        pricefeeds(first: 1000, orderBy: timestamp, orderDirection: asc, where: {tokenAddress: _${queryParams.tokenAddress}, interval: _${queryParams.interval}, timestamp_gte: ${queryParams.from}, timestamp_lte: ${queryParams.to || unixTimestampNow()} }) {
          ${pricefeedFields}
        }
      }
`

    const priceFeedQuery = await querySubgraph(queryParams, newLocal)
    return priceFeedQuery.pricefeeds.map(fromJson.pricefeedJson) as IPricefeed[]
  }),
  awaitPromises
)


export const stake = O(
  map(async (queryParams: IChainParamApi & IAccountQueryParamApi) => {

    const priceFeedQuery = await querySubgraph(queryParams, `
{
  stakes(first: 1000, orderBy: timestamp, orderDirection: desc, where:{ account: "${queryParams.account.toLowerCase()}" }) {
    id
    account
    contract
    token
    amount
    amountUsd
    timestamp
  }
}`)
    return priceFeedQuery.stakes.map(fromJson.stakeJson) as IStake[]
  }),
  awaitPromises
)

export const trade = O(
  map(async (queryParams: IRequestTradeQueryparam) => {

    if (!queryParams?.id) {
      return null
    }

    const priceFeedQuery = await querySubgraph(queryParams, `
{
  trade(id: ${queryParams.id.toLowerCase()} ) {
      ${tradeFields}
  }
}
`)


    if (priceFeedQuery === null) {
      throw new Error('Trade not found')
    }

    return fromJson.tradeJson(priceFeedQuery.trade)
  }),
  awaitPromises
)

export const latestPriceMap = O(
  map(async (queryParams: IChainParamApi): Promise<IPriceLatest[]> => {

    const res = await await querySubgraph(queryParams, `
{
  priceLatests {
    id
    value
    timestamp
  }
}
`)

    return res.priceLatests.map(fromJson.priceLatestJson) as IPriceLatest[]
  }),
  awaitPromises
)

export const accountTradeList = O(
  map(async (queryParams: IAccountTradeListParamApi) => {

    if (queryParams === null) {
      return []
    }

    const res = await await querySubgraph(queryParams, `
{
  trades(first: 1000, skip: 0, where: { account: "${queryParams.account.toLowerCase()}" }) {
    ${tradeFields}
  }
}
`)

    return res.trades.map(fromJson.tradeJson) as ITrade[]
  }),
  awaitPromises
)

export const leaderboardTopList = O(
  map(async (queryParams: ILeaderboardRequest) => {
    const cacheLife = cacheLifeMap[queryParams.timeInterval]
    const cacheKey = 'requestLeaderboardTopList' + queryParams.timeInterval + queryParams.chain

    const to = await createCache(cacheKey, cacheLife, async () => unixTimestampNow())
    const from = to - queryParams.timeInterval

    const cacheQuery = fetchTrades(queryParams.chain, 0, from, to).then(list => {
      const formattedList = list.map(tradeJson)

      const summary = toAccountSummary(formattedList)

      return summary
    })

    return pagingQuery(queryParams, cacheQuery)
  }),
  awaitPromises
)




async function fetchTrades(chain: CHAIN, offset: number, from: number, to: number): Promise<ITrade[]> {
  const deltaTime = to - from

  // splits the queries because the-graph's result limit of 5k items
  if (deltaTime >= intervalTimeMap.DAY7) {
    const splitDelta = deltaTime / 2
    const query0 = fetchTrades(chain, 0, from, to - splitDelta).then(list => list.map(tradeJson))
    const query1 = fetchTrades(chain, 0, from + splitDelta, to).then(list => list.map(tradeJson))

    return (await Promise.all([query0, query1])).flatMap(res => res)
  }

  const listQuery = await (querySubgraph({ chain }, `
{
  trades(first: 1000, skip: 0, where: {timestamp_gte: ${from}, timestamp_lte: ${to}}) {
    ${tradeFields}
  }
}
`))
  const list = listQuery.list

  if (list.length === 1000) {
    const newPage = await fetchTrades(chain, offset + 1000, from, to)

    return [...list, ...newPage]
  }

  return list
}


async function querySubgraph<T extends IChainParamApi>(params: T, document: string): Promise<any> {
  return subgraphChainMap[params.chain](gql(document) as any, {})
}


// export async function createDocument<T>(entity: string, where: T): Promise<any> {
//   return `
//       {
//         ${entity}(first: 1000, orderBy: timestamp, orderDirection: asc, where: {tokenAddress: _${queryParams.tokenAddress}, interval: _${queryParams.interval}, timestamp_gte: ${queryParams.from}, timestamp_lte: ${queryParams.to || unixTimestampNow()} }) {
//           ${pricefeedFields}
//         }
//       }
// `
// }


const increasePositionFields = `
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
`
const decreasePositionFields = `
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
`
const updatePositionFields = `
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
`
const closePositionFields = `
  id
  timestamp
  key
  size
  collateral
  reserveAmount
  realisedPnl
  averagePrice
  entryFundingRate
`
const liquidatePositionFields = `
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
`

const tradeFields = `
  id
  timestamp
  account
  collateralToken
  indexToken
  isLong
  key
  status

  increaseList(first: 1000) { ${increasePositionFields} }
  decreaseList(first: 1000) { ${decreasePositionFields} }
  updateList(first: 1000) { ${updatePositionFields} }

  sizeDelta
  collateralDelta
  fee
  size
  collateral
  averagePrice

  realisedPnl
  realisedPnlPercentage
  settledTimestamp
  closedPosition { ${closePositionFields} }
  liquidatedPosition { ${liquidatePositionFields} }
`
const pricefeedFields = `
  id
  timestamp
  o
  h
  l
  c
  tokenAddress
  interval
`



