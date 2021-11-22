import Router from 'express-promise-router'
import { requestChainlinkPricefeed } from './aggregatedTradeList'
import { awaitPromises, map, merge, multicast, now, periodic, runEffects, tap } from '@most/core'
import { scheduler } from './scheduler'
import { prepareClient } from './common'
import { latestPricefeedMapQuery } from './queries'
import { O, replayLatest } from '@aelea/core'

export const api = Router()


export const vaultClient = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault',
  // requestPolicy: 'network-only'
})


export const chainlinkClient = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/deividask/chainlink',
  // requestPolicy: 'network-only'
})



export const latestPricefeedMap = O(
  map(async () => {
    const list = await chainlinkClient(latestPricefeedMapQuery, {})
    return list
  }),
  awaitPromises
)

export const latestPricefeedMapSource = replayLatest(multicast(merge(
  latestPricefeedMap(periodic(15000)),
  latestPricefeedMap(now(null))
)))

api.post('/feed', async (req, res) => {

  const stream = tap(data => {
    res.json(data)
  }, requestChainlinkPricefeed(now(req.body)))

  runEffects(stream, scheduler)
})


api.get('/claim-list', async (req, res) => {
  res.send('nope')
})



