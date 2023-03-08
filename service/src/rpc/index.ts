import { WebSocketProvider } from "@ethersproject/providers"


if (process.env.RPC_API_DEV_ARB === undefined) {
  throw new Error('missing provider reference in env variables')
}

if (process.env.RPC_API_DEV_MAIN === undefined) {
  throw new Error('missing mainnet provider reference in env variables')
}

export const provider = new WebSocketProvider(`wss://arb-mainnet.g.alchemy.com/v2/${process.env.RPC_API_DEV_ARB}`)
export const providerMainnet = new WebSocketProvider(`wss://arb-mainnet.g.alchemy.com/v2/${process.env.RPC_API_DEV_MAIN}`)

// const provider = new EtherscanProvider()
// provider.getHistory('')
// const history = await provider.getHistory(address)