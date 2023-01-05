import { WebSocketProvider, JsonRpcProvider } from "@ethersproject/providers"
import { awaitProviderNetwork, CHAIN } from "@gambitdao/wallet-link"
import { now } from "@most/core"



export const arbGlobalProvider = new WebSocketProvider(document.location.hostname === 'localhost'
  ? 'wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'
  : 'wss://arb-mainnet.g.alchemy.com/v2/Rf-9XHJG_C6xvhApXKg1tNCZmAOBaA5A'
)

export const arbGlobalProviderEvent = awaitProviderNetwork(now(arbGlobalProvider))

export const avaGlobalProvider = new JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc')
export const avaGlobalProviderEvent = awaitProviderNetwork(now(avaGlobalProvider)) // new WebSocketProvider('wss://api.avax.network/ext/bc/C/ws')

export const globalProviderMap = {
  [CHAIN.ARBITRUM]: arbGlobalProvider,
  [CHAIN.AVALANCHE]: avaGlobalProvider,
}