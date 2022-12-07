import { WebSocketProvider, JsonRpcProvider } from "@ethersproject/providers"
import { CHAIN } from "@gambitdao/gmx-middleware"

export const arbOneWeb3Provider = new WebSocketProvider('wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low')
export const w3pAva = new JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc')

export const globalProviderMap = {
  [CHAIN.ARBITRUM]: arbOneWeb3Provider,
  [CHAIN.AVALANCHE]: w3pAva,
}