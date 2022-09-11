import { awaitPromises, map } from "@most/core"
import { query } from '@gambitdao/gmx-middleware'
import { unixTimestampNow, cacheMap, ILeaderboardRequest, CHAIN, fromJson, ITrade, pagingQuery, toAccountSummary, IChainParamApi, IPriceLatestMap, groupByMap, IAccountTradeListParamApi, IPricefeedParamApi, intervalTimeMap, IRequestTradeQueryparam } from '@gambitdao/gmx-middleware'
import { O } from "@aelea/core"


const { accountTradeListQuery, latestPriceTimelineQuery, pricefeed, tradeListQuery, tradeQuery } = query.document


const createCache = cacheMap({})

const fetchTrades = async (chain: CHAIN.ARBITRUM | CHAIN.AVALANCHE, offset: number, from: number, to: number): Promise<ITrade[]> => {
  const deltaTime = to - from

  // splits the queries because the-graph's result limit of 5k items
  if (deltaTime >= intervalTimeMap.DAY7) {
    const splitDelta = deltaTime / 2
    const query0 = fetchTrades(chain, 0, from, to - splitDelta).then(list => list.map(fromJson.toTradeJson))
    const query1 = fetchTrades(chain, 0, from + splitDelta, to).then(list => list.map(fromJson.toTradeJson))

    return (await Promise.all([query0, query1])).flatMap(res => res)
  }

  const list = (await query.graphClientMap[chain](tradeListQuery, { from, to, pageSize: 1000, offset }, { requestPolicy: 'network-only' })).trades

  if (list.length === 1000) {
    const newPage = await fetchTrades(chain, offset + 1000, from, to)

    return [...list, ...newPage]
  }

  return list
}


const cacheLifeMap = {
  [intervalTimeMap.HR24]: intervalTimeMap.MIN5,
  [intervalTimeMap.DAY7]: intervalTimeMap.MIN30,
  [intervalTimeMap.MONTH]: intervalTimeMap.MIN60,
}

export const requestLeaderboardTopList = O(
  map(async (queryParams: ILeaderboardRequest) => {
    const cacheLife = cacheLifeMap[queryParams.timeInterval]
    const cacheKey = 'requestLeaderboardTopList' + queryParams.timeInterval + queryParams.chain

    const to = await createCache(cacheKey, cacheLife, async () => unixTimestampNow())
    const from = to - queryParams.timeInterval

    const cacheQuery = fetchTrades(queryParams.chain, 0, from, to).then(list => {
      const formattedList = list.map(fromJson.toTradeJson)

      const summary = toAccountSummary(formattedList)

      return summary
    })
 
    return pagingQuery(queryParams, cacheQuery)
  }),
  awaitPromises
)


export const requestAccountTradeList = O(
  map(async (queryParams: IAccountTradeListParamApi) => {
    if (!queryParams.account) {
      return []
    }

    const allAccounts = await query.graphClientMap[queryParams.chain](accountTradeListQuery, { ...queryParams, account: queryParams.account.toLowerCase() }, { requestPolicy: 'network-only' })
    return allAccounts.trades
  }),
  awaitPromises
)

export const requestLatestPriceMap = O(
  map(async (queryParams: IChainParamApi): Promise<IPriceLatestMap> => {
    const priceList = await query.graphClientMap[queryParams.chain](latestPriceTimelineQuery, {}, { requestPolicy: 'network-only' })
    const gmap = groupByMap(priceList.priceLatests.map(fromJson.priceLatestJson), price => price.id)
    return gmap
  }),
  awaitPromises
)

export const requestTrade = O(
  map(async (queryParams: IRequestTradeQueryparam) => {

    if (!queryParams?.id) {
      return null
    }

    const id = queryParams.id
    const priceFeedQuery = await query.graphClientMap[queryParams.chain](tradeQuery, { id }, { requestPolicy: 'network-only' })

    if (priceFeedQuery === null) {
      throw new Error('Trade not found')
    }

    return priceFeedQuery.trade
  }),
  awaitPromises
)

export const requestPricefeed = O(
  map(async (queryParams: IPricefeedParamApi) => {
    const tokenAddress = '_' + queryParams.tokenAddress
    const parsedTo = queryParams.to || unixTimestampNow()
    const params = { tokenAddress, interval: '_' + queryParams.interval, from: queryParams.from, to: parsedTo }

    const priceFeedQuery = await query.graphClientMap[queryParams.chain](pricefeed, params as any)

    return priceFeedQuery.pricefeeds
  }),
  awaitPromises
)




