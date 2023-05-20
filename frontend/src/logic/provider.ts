import { CHAIN } from "@gambitdao/const"
import { createPublicClient, http, webSocket } from "viem"
import { ISupportedChainMap } from "@gambitdao/wallet-link"
import { arbitrum, avalanche } from "viem/chains"

// export const arbGlobalProvider = http(`https://arb-mainnet.g.alchemy.com/v2/${import.meta.env.RPC_API_DEV_ARB || 'Rf-9XHJG_C6xvhApXKg1tNCZmAOBaA5A'}`)
export const arbGlobalProvider = webSocket(`wss://arb-mainnet.g.alchemy.com/v2/${import.meta.env.RPC_API_DEV_ARB || 'Rf-9XHJG_C6xvhApXKg1tNCZmAOBaA5A'}`)
export const avaGlobalProvider = http('https://api.avax.network/ext/bc/C/rpc')


export const globalProviderMap = {
  // priority default
  [CHAIN.ARBITRUM]: createPublicClient({
    transport: arbGlobalProvider,
    batch: {
      multicall: true,
    },
    chain: arbitrum
  }),
  [CHAIN.AVALANCHE]: createPublicClient({
    transport: avaGlobalProvider,
    batch: {
      multicall: true,
    },
    chain: avalanche
  }),
} as const

