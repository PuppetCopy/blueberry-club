import { WebSocketProvider, JsonRpcProvider } from "@ethersproject/providers"

export const arbOneWeb3Provider = new WebSocketProvider('wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low')
export const w3pAva = new JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc')

