import { CHAIN } from "@gambitdao/const"
import { awaitProviderNetwork } from "@gambitdao/wallet-link"
import { now } from "@most/core"
import { JsonRpcProvider, WebSocketProvider } from "ethers"

const defaultwssProvider = new WebSocketProvider(`wss://arb-mainnet.g.alchemy.com/v2/${process.env.RPC_API_DEV_ARB || 'Rf-9XHJG_C6xvhApXKg1tNCZmAOBaA5A'}`)
export const arbGlobalProvider = defaultwssProvider
// export const arbGlobalProvider = new JsonRpcProvider('https://arbitrum-one.gateway.pokt.network/v1/lb/9d70f26468263cb1d61de3c0')



export const arbGlobalProviderEvent = awaitProviderNetwork(now(arbGlobalProvider))

export const avaGlobalProvider = new JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc')
export const avaGlobalProviderEvent = awaitProviderNetwork(now(avaGlobalProvider)) // new WebSocketProvider('wss://api.avax.network/ext/bc/C/ws')

export const globalProviderMap = {
  [CHAIN.ARBITRUM]: arbGlobalProvider,
  [CHAIN.AVALANCHE]: avaGlobalProvider,
}