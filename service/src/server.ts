import cors from 'cors'
import express from 'express'
import http from 'http'
import ws from 'ws'
import compression from 'compression'
import { helloFrontend } from './messageBus'
import { scheduler } from './logic/scheduler'
import { gmxSubgraph } from '@gambitdao/gmx-middleware'



require('events').EventEmitter.prototype._maxListeners = 100

// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() }



const app = express()
const port = process.env.PORT

const server = http.createServer(app)

// const wss = new ws('wss://api.thegraph.com/subgraphs/name/nissoh/gmx-vault')
const wss = new ws.Server({ server, path: '/api-ws', })
const liveClients = new Map<ws, { ws: ws, isAlive: boolean }>()

wss.on('connection', function connection(ws) {
  const client = liveClients.get(ws)

  if (client) {
    client.isAlive = true
  } else {
    liveClients.set(ws, { isAlive: true, ws })
  }

  ws.on('pong', heartbeat)
})

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    const client = liveClients.get(ws)

    if (!client) {
      return
    }

    if (client.isAlive === false) {
      liveClients.delete(ws)
      return ws.terminate()
    }

    client.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on('close', function close() {
  clearInterval(interval)
})

function heartbeat() {
  // @ts-ignore
  const client = liveClients.get(this)

  if (client) {
    client.isAlive = true
  }
}


const apiComponent = helloFrontend(wss, {
  requestLeaderboardTopList: gmxSubgraph.leaderboardTopList,
  requestLatestPriceMap: gmxSubgraph.latestPriceMap,
  requestAccountTradeList: gmxSubgraph.accountTradeList,
  requestTrade: gmxSubgraph.trade,
  requestPricefeed: gmxSubgraph.pricefeed,
})



const run = async () => {

  apiComponent
    .run({
      event(time, val) {

      },
      error(time, err) {
        console.error(err)
      },
      end() { }
    }, scheduler)




  app.use(cors({}))
  app.use(express.json())
  app.use(compression())
  app.use((req, res) => res.status(404).json({ message: 'No route found' }))

  server.listen(port, () => {
    console.log(`Running at http://localhost:${port}`)
  })
}


run()
