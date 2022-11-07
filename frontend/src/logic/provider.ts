import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers"
import { GLOBAL_W3P, GLOBAL_W3P_ARBITRUM, GLOBAL_W3P_AVALANCHE } from "@gambitdao/gbc-middleware"
import { NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import detectEthereumProvider from "@metamask/detect-provider"
import WalletConnectProvider from "@walletconnect/ethereum-provider"
import { IEthereumProvider } from "eip1193-provider"

export enum WALLET {
  none = 'none',
  metamask = 'metamask',
  walletConnect = 'walletconnect'
}

export const walletConnect = new WalletConnectProvider({
  rpc: Object.entries(NETWORK_METADATA).reduce((seed, [chainId, net]) => ({ ...seed, [chainId]: net.rpcUrls[0] }), {}),
  chainId: 3,
  infuraId: "78577f8136324f42b21cdf478a8ba820"
})

// export const walletConnectAuthClient = AuthClient.init({
//   // relayUrl: process.env.NEXT_PUBLIC_RELAY_URL || "wss://relay.walletconnect.com",
//   projectId: "09ae2f19da2eb876ba1309c52c1aa4fb",
//   metadata: {
//     name: "GBC",
//     description: "10,000 Blueberries NFT Collection on Arbitrum, building a community driven https://gmx.io products and having fun together",
//     url: window.location.host,
//     icons: ["https://i.seadn.io/gcs/files/3c233a42728f6f13e8a54b242ff60ac8.jpg?auto=format&w=256"],
//   },
// })



export const metamaskQuery = detectEthereumProvider({ mustBeMetaMask: false, silent: true }) as Promise<IEthereumProvider & { selectedAddress: string } | null>

export const web3Provider = new WebSocketProvider(GLOBAL_W3P)

export const arbOneWeb3Provider = new WebSocketProvider(GLOBAL_W3P_ARBITRUM)
export const w3pAva = new JsonRpcProvider(GLOBAL_W3P_AVALANCHE)

