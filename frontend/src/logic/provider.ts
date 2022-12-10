import { WebSocketProvider, JsonRpcProvider, FallbackProvider } from "@ethersproject/providers"
import { CHAIN } from "@gambitdao/gmx-middleware"

export const arbGlobalProvider = new WebSocketProvider('wss://arb-mainnet.g.alchemy.com/v2/Rf-9XHJG_C6xvhApXKg1tNCZmAOBaA5A')
export const avaGlobalProvider = new JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc') // new WebSocketProvider('wss://api.avax.network/ext/bc/C/ws')

export const globalProviderMap = {
  [CHAIN.ARBITRUM]: arbGlobalProvider,
  [CHAIN.AVALANCHE]: avaGlobalProvider,
}