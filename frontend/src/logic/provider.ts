import { WebSocketProvider, JsonRpcProvider } from "@ethersproject/providers"
import { CHAIN } from "@gambitdao/gmx-middleware"
import { awaitProviderNetwork } from "@gambitdao/wallet-link"
import { now } from "@most/core"



const defaultwssProvider = new WebSocketProvider(document.location.hostname === 'localhost'
  ? 'wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'
  : 'wss://arb-mainnet.g.alchemy.com/v2/Rf-9XHJG_C6xvhApXKg1tNCZmAOBaA5A'
)
export const arbGlobalProvider = defaultwssProvider
// export const arbGlobalProvider = new JsonRpcProvider('https://arbitrum-one.gateway.pokt.network/v1/lb/9d70f26468263cb1d61de3c0')



export const arbGlobalProviderEvent = awaitProviderNetwork(now(arbGlobalProvider))

export const avaGlobalProvider = new JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc')
export const avaGlobalProviderEvent = awaitProviderNetwork(now(avaGlobalProvider)) // new WebSocketProvider('wss://api.avax.network/ext/bc/C/ws')

export const globalProviderMap = {
  [CHAIN.ARBITRUM]: arbGlobalProvider,
  [CHAIN.AVALANCHE]: avaGlobalProvider,
}