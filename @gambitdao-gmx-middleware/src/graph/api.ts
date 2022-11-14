import { O } from "@aelea/core"
import { awaitPromises, map } from "@most/core"
import { CHAIN, intervalTimeMap } from "../constant"
import { toTradeJson } from "../fromJson"
import { toAccountSummary } from "../gmxUtils"
import { IAccountTradeListParamApi, IChainParamApi, ILeaderboardRequest, IPricefeedParamApi, IPriceLatest, IRequestTradeQueryparam, ITrade } from "../types"
import { cacheMap, pagingQuery, unixTimestampNow } from "../utils"
import { accountTradeListQuery, latestPriceTimelineQuery, pricefeedDoc, tradeListQuery, tradeQuery } from "./document"
import { graphClientMap } from "./graph"

export const pricefeed = O(
  map(async (queryParams: IPricefeedParamApi) => {
    const tokenAddress = '_' + queryParams.tokenAddress
    const parsedTo = queryParams.to || unixTimestampNow()
    const params = { tokenAddress, interval: '_' + queryParams.interval, from: queryParams.from, to: parsedTo }

    const priceFeedQuery = await graphClientMap[queryParams.chain](pricefeedDoc, params as any)

    return priceFeedQuery.pricefeeds
  }),
  awaitPromises
)

export const trade = O(
  map(async (queryParams: IRequestTradeQueryparam) => {

    if (!queryParams?.id) {
      return null
    }

    const id = queryParams.id
    const priceFeedQuery = await graphClientMap[queryParams.chain](tradeQuery, { id }, { requestPolicy: 'network-only' })

    if (priceFeedQuery === null) {
      throw new Error('Trade not found')
    }

    return priceFeedQuery.trade
  }),
  awaitPromises
)

export const latestPriceMap = O(
  map(async (queryParams: IChainParamApi): Promise<IPriceLatest[]> => {
    const priceList = await graphClientMap[queryParams.chain](latestPriceTimelineQuery, {}, { requestPolicy: 'network-only' })
    return priceList.priceLatests
  }),
  awaitPromises
)

export const accountTradeList = O(
  map(async (queryParams: IAccountTradeListParamApi) => {
    if (!queryParams.account) {
      return []
    }

    const allAccounts = await graphClientMap[queryParams.chain](accountTradeListQuery, { ...queryParams, account: queryParams.account.toLowerCase() }, { requestPolicy: 'network-only' })
    return allAccounts.trades
  }),
  awaitPromises
)

const createCache = cacheMap({})

async function fetchTrades(chain: CHAIN, offset: number, from: number, to: number): Promise<ITrade[]> {
  const deltaTime = to - from

  // splits the queries because the-graph's result limit of 5k items
  if (deltaTime >= intervalTimeMap.DAY7) {
    const splitDelta = deltaTime / 2
    const query0 = fetchTrades(chain, 0, from, to - splitDelta).then(list => list.map(toTradeJson))
    const query1 = fetchTrades(chain, 0, from + splitDelta, to).then(list => list.map(toTradeJson))

    return (await Promise.all([query0, query1])).flatMap(res => res)
  }

  const list = (await graphClientMap[chain](tradeListQuery, { from, to, pageSize: 1000, offset }, { requestPolicy: 'network-only' })).trades

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

export const leaderboardTopList = O(
  map(async (queryParams: ILeaderboardRequest) => {
    const cacheLife = cacheLifeMap[queryParams.timeInterval]
    const cacheKey = 'requestLeaderboardTopList' + queryParams.timeInterval + queryParams.chain

    const to = await createCache(cacheKey, cacheLife, async () => unixTimestampNow())
    const from = to - queryParams.timeInterval

    const cacheQuery = fetchTrades(queryParams.chain, 0, from, to).then(list => {
      const formattedList = list.map(toTradeJson)

      const summary = toAccountSummary(formattedList)

      return summary
    })

    return pagingQuery(queryParams, cacheQuery)
  }),
  awaitPromises
)






