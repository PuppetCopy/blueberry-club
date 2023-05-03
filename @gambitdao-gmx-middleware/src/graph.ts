import { O } from "@aelea/core"
import { CHAIN } from "@gambitdao/const"
import { awaitPromises, map } from "@most/core"
import { Stream } from "@most/types"
import { cacheExchange, fetchExchange, gql } from "@urql/core"
import fetch from "isomorphic-fetch"
import { TOKEN_SYMBOL } from "./address/symbol.js"
import { intervalTimeMap } from "./constant.js"
import * as fromJson from "./fromJson.js"
import { getTokenDescription } from "./gmxUtils.js"
import {
  IChainParamApi,
  IEnsRegistration,
  IPriceLatest,
  IPricefeed,
  IRequestAccountApi,
  IRequestAccountTradeListApi,
  IRequestGraphEntityApi,
  IRequestPageApi,
  IRequestPagePositionApi,
  IRequestPricefeedApi,
  IRequestTimerangeApi,
  IStake,
  ITrade,
  ITradeOpen,
  TradeStatus
} from "./types.js"
import {
  cacheMap, createSubgraphClient, getChainName, getMappedValue, groupByKeyMap, pagingQuery, parseFixed,
  switchFailedSources, unixTimestampNow
} from "./utils.js"


const cache = cacheMap({})

const cacheLifeMap = {
  [intervalTimeMap.HR24]: intervalTimeMap.MIN5,
  [intervalTimeMap.DAY7]: intervalTimeMap.MIN30,
  [intervalTimeMap.MONTH]: intervalTimeMap.MIN60,
}

export const ensGraph = createSubgraphClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/ensdomains/ens',
  exchanges: [cacheExchange, fetchExchange,],
})

export const arbitrumGraph = createSubgraphClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-arbitrum',
  exchanges: [cacheExchange, fetchExchange,],
})

export const arbitrumGraphDev = createSubgraphClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-arbitrum-dev',
  exchanges: [cacheExchange, fetchExchange,],
})
export const avalancheGraphDev = createSubgraphClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-avalanche-dev',
  exchanges: [cacheExchange, fetchExchange,],
})

export const avalancheGraph = createSubgraphClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-avalanche',
  exchanges: [cacheExchange, fetchExchange,],
})


export const subgraphDevChainMap: { [p in CHAIN]: typeof arbitrumGraph } = {
  [CHAIN.ARBITRUM]: arbitrumGraphDev,
  [CHAIN.AVALANCHE]: avalancheGraphDev,
} as any

export const subgraphChainMap: { [p in CHAIN]: typeof arbitrumGraph } = {
  [CHAIN.ARBITRUM]: arbitrumGraph,
  [CHAIN.AVALANCHE]: avalancheGraph,
} as any


const gmxIoPricefeedIntervalLabel = {
  [intervalTimeMap.MIN5]: '5m',
  [intervalTimeMap.MIN15]: '15m',
  [intervalTimeMap.MIN60]: '1h',
  [intervalTimeMap.HR4]: '4h',
  [intervalTimeMap.HR24]: '1d',
}

const derievedSymbolMapping: { [k: string]: TOKEN_SYMBOL } = {
  [TOKEN_SYMBOL.WETH]: TOKEN_SYMBOL.ETH,
  [TOKEN_SYMBOL.WBTC]: TOKEN_SYMBOL.BTC,
  [TOKEN_SYMBOL.BTCB]: TOKEN_SYMBOL.BTC,
  [TOKEN_SYMBOL.WBTCE]: TOKEN_SYMBOL.BTC,
  [TOKEN_SYMBOL.WAVAX]: TOKEN_SYMBOL.AVAX,
}



export const getEnsProfile = O(
  map(async (queryParams: IRequestAccountApi): Promise<IEnsRegistration> => {

    const res = await ensGraph(gql(`{
  account(id: "${queryParams.account.toLowerCase()}") {
    domains(where: {resolvedAddress: "${queryParams.account.toLowerCase()}"}) {
      id
      name
      labelName
      resolvedAddress {
        id
      }
      name
      resolver {
        texts
      }
    }
  }
}`), {})

    return res.domains[0] as IEnsRegistration
  })
)

export async function getProfilePickList(idList: string[]): Promise<IEnsRegistration[]> {

  if (idList.length === 0) {
    return []
  }

  const newLocal = `{
  ${idList.map(id => `
  _${id}: account(id: "${id}") {
    id
    registrations(orderBy: expiryDate, orderDirection: desc) {
      expiryDate
      labelName
      id
      domain {
        resolvedAddress {
          id
        }
        resolver {
          texts
        }
      }
      expiryDate
    }
  }
`).join('')}
}
`

  const nowTime = unixTimestampNow()
  const res = await ensGraph(gql(newLocal), {})
  const rawList = Object.values(res)
    .map((res: any) => {
      if (!Array.isArray(res?.registrations)) {
        return null
      }

      return res.registrations.filter((x: IEnsRegistration) => {
        return x.domain.resolvedAddress && Number(x?.expiryDate) > nowTime
      })[0]
    })
    .filter(Boolean) as IEnsRegistration[]

  return rawList
}

export const getEnsProfileListPick = O(
  map(async (idList: string[]): Promise<IEnsRegistration[]> => {
    return getProfilePickList(idList)
  })
)

export const getGmxIoPricefeed = O(
  map(async (queryParams: IRequestPricefeedApi): Promise<IPricefeed[]> => {
    const tokenDesc = getTokenDescription(queryParams.tokenAddress)
    const intervalLabel = getMappedValue(gmxIoPricefeedIntervalLabel, queryParams.interval)
    const symbol = derievedSymbolMapping[tokenDesc.symbol] || tokenDesc.symbol
    const res = fetch(`https://stats.gmx.io/api/candles/${symbol}?preferableChainId=${queryParams.chain}&period=${intervalLabel}&from=${queryParams.from}&preferableSource=fast`)
      .then(async res => {
        const parsed = await res.json()
        return parsed.prices.map((json: any) => ({ o: parseFixed(json.o, 30), h: parseFixed(json.h, 30), l: parseFixed(json.l, 30), c: parseFixed(json.c, 30), timestamp: json.t }))
      })
    return res
  })
)

export const subgraphPricefeed = O(
  map(async (queryParams: IRequestPricefeedApi) => {
    const newLocal = ` {
  pricefeeds(first: 1000, orderBy: timestamp, orderDirection: asc, where: {tokenAddress: _${queryParams.tokenAddress}, interval: _${queryParams.interval}, timestamp_gte: ${queryParams.from}, timestamp_lte: ${queryParams.to || unixTimestampNow()} }) {
    ${pricefeedFields}
  }
}`

    const priceFeedQuery = await querySubgraph(queryParams, newLocal)
    return priceFeedQuery.pricefeeds.map(fromJson.pricefeedJson) as IPricefeed[]
  })
)

export const pricefeed = O(
  (src: Stream<IRequestPricefeedApi>) => switchFailedSources([
    getGmxIoPricefeed(src),
    subgraphPricefeed(src)
  ])
)


export const stake = O(
  map(async (queryParams: IChainParamApi & IRequestAccountApi) => {

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
  map(async (queryParams: IRequestGraphEntityApi) => {

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
  map(getPriceLatestMap),
  awaitPromises
)

export const accountTradeList = O(
  map(async (queryParams: IRequestAccountTradeListApi) => {

    if (queryParams === null) {
      return []
    }

    const res = await await querySubgraph(queryParams, `
{
  trades(first: 1000, orderBy: settledTimestamp, orderDirection: desc, skip: 0, where: { status_not: ${TradeStatus.OPEN}, account: "${queryParams.account.toLowerCase()}" }) {
    ${tradeFields}
  }
}
`)

    return pagingQuery(queryParams, res.trades.map(fromJson.tradeJson) as ITrade[])
  })
)

export const accountOpenTradeList = O(
  map(async (queryParams: IRequestAccountApi) => {

    if (queryParams === null) {
      return []
    }

    const res = await await querySubgraph(queryParams, `
{
  trades(first: 1000, skip: 0, where: { status: "${TradeStatus.OPEN}" account: "${queryParams.account.toLowerCase()}" }) {
    ${tradeFields}
  }
}
`)

    return res.trades.map(fromJson.tradeJson) as ITradeOpen[]
  })
)





export const fetchTrades = async <T extends IRequestPagePositionApi & IChainParamApi, R>(params: T, getList: (res: T) => Promise<R[]>): Promise<R[]> => {
  const list = await getList(params)

  const nextOffset = params.offset + 1000

  if (nextOffset > 5000) {
    console.warn(`query has exceeded 5000 offset at timefram ${intervalTimeMap.DAY7}`)
    return list
  }

  if (list.length === 1000) {
    const newPage = await fetchTrades({ ...params, offset: nextOffset }, getList)

    return [...list, ...newPage]
  }

  return list
}

export const fetchHistoricTrades = async <T extends IRequestPagePositionApi & IChainParamApi & IRequestTimerangeApi, R>(params: T, getList: (res: T) => Promise<R[]>, splitSpan: number = intervalTimeMap.DAY7): Promise<R[]> => {
  const deltaTime = params.to - params.from

  // splits the queries because the-graph's result limit of 5k items
  if (deltaTime >= splitSpan) {
    const splitDelta = Math.floor(deltaTime / 2)
    const nowTime = unixTimestampNow()
    const to = Math.min(params.to - splitDelta, nowTime)

    const query0 = fetchHistoricTrades({ ...params, to, offset: 0 }, getList)
    const query1 = fetchHistoricTrades({ ...params, from: params.to - splitDelta, offset: 0 }, getList)

    return (await Promise.all([query0, query1])).flatMap(res => res)
  }


  return fetchTrades(params, getList)
}

async function querySubgraph<T extends IChainParamApi>(params: T, document: string): Promise<any> {
  const queryProvider = subgraphChainMap[params.chain]

  if (!queryProvider) {
    throw new Error(`Chain ${getChainName(params.chain) || params.chain} is not supported`)
  }

  return queryProvider(gql(document) as any, {})
}

async function getPriceLatestMap(queryParams: IChainParamApi): Promise<IPriceLatest[]> {
  const res = await await querySubgraph(queryParams, `{
  priceLatests {
    id
    value
    timestamp
  }
}
`)

  return res.priceLatests.map(fromJson.priceLatestJson) as IPriceLatest[]
}

export async function getPriceMap(time: number, queryParams: IChainParamApi): Promise<{ [x: string]: bigint }> {
  const dateNow = unixTimestampNow()

  const priceMap = dateNow < time
    ? await getPriceLatestMap(queryParams).then(res => {
      const list = groupByKeyMap(res, item => '_' + item.id, x => x.value)
      return list
    })
    : await querySubgraph(queryParams, `
      {
        pricefeeds(where: { timestamp: ${Math.floor((time / intervalTimeMap.MIN5)) * intervalTimeMap.MIN5} }) {
          id
          timestamp
          tokenAddress
          c
          interval
        }
      }
    `).then(res => {
      const list = groupByKeyMap(res.pricefeeds, (item: IPricefeed) => item.tokenAddress, x => x.c)
      return list
    })


  return priceMap
}


export async function getCompetitionTrades(queryParams: IRequestPageApi & { referralCode: string }) {
  const interval = intervalTimeMap.HR24 * 3
  const competitionAccountListQuery = fetchHistoricTrades({ ...queryParams, offset: 0, pageSize: 1000 }, async (params) => {
    const res = await subgraphChainMap[queryParams.chain](gql(`

query {
  trades(first: 1000, skip: ${params.offset}, where: { entryReferralCode: "${queryParams.referralCode}", timestamp_gte: ${params.from}, timestamp_lt: ${params.to}}) {
  # trades(first: 1000, skip: ${params.offset}, where: { timestamp_gte: ${params.from}, timestamp_lt: ${params.to}}) {
      ${tradeFields}
      entryReferralCode
      entryReferrer
  }
}
`), {})

    return res.trades as ITrade[]
  }, interval)


  const historicTradeList = await competitionAccountListQuery
  const tradeList: ITrade[] = historicTradeList.map(fromJson.tradeJson)
  return tradeList
}


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



