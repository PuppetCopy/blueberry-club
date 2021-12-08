import detectEthereumProvider from "@metamask/detect-provider"
import WalletConnectProvider from "@walletconnect/ethereum-provider"
import { IEthereumProvider } from "eip1193-provider"
import { NETWORK_METADATA } from "@gambitdao/wallet-link"
import { WebSocketProvider } from "@ethersproject/providers"


export const walletConnect = new WalletConnectProvider({
  rpc: Object.entries(NETWORK_METADATA).reduce((seed, [chainId, net]) => ({ ...seed, [chainId]: net.rpcUrls[0] }), {}),
  chainId: 3,
  infuraId: "78577f8136324f42b21cdf478a8ba820"
})

export const metamaskQuery = detectEthereumProvider({ mustBeMetaMask: true, silent: true }) as Promise<IEthereumProvider & { selectedAddress: string } | null>

export const w3p = new WebSocketProvider('wss://arb1.arbitrum.io/ws')
