import { WebSocketProvider, JsonRpcProvider } from "@ethersproject/providers"
import { GLOBAL_W3P, GLOBAL_W3P_AVALANCHE } from "@gambitdao/gbc-middleware"
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

export const metamaskQuery = detectEthereumProvider({ mustBeMetaMask: false, silent: true }) as Promise<IEthereumProvider & { selectedAddress: string } | null>

export const web3Provider = new WebSocketProvider(GLOBAL_W3P)
export const web3ProviderTestnet = new WebSocketProvider('wss://eth-ropsten.alchemyapi.io/v2/lQJmbKMHodW3eT3FdEQdkzk5S6gQ5-Lh')
export const w3pAva = new JsonRpcProvider(GLOBAL_W3P_AVALANCHE)

