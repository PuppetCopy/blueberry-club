import { WebSocketProvider, JsonRpcProvider } from "@ethersproject/providers"
import { GLOBAL_W3P_ARBITRUM, GLOBAL_W3P_AVALANCHE } from "@gambitdao/gbc-middleware"
import { NETWORK_METADATA, CHAIN } from "@gambitdao/gmx-middleware"
import detectEthereumProvider from "@metamask/detect-provider"
import WalletConnectProvider from "@walletconnect/ethereum-provider"
import { IEthereumProvider } from "eip1193-provider"

export const walletConnect = new WalletConnectProvider({
  rpc: Object.entries(NETWORK_METADATA).reduce((seed, [chainId, net]) => ({ ...seed, [chainId]: net.rpcUrls[0] }), {}),
  chainId: 3,
  infuraId: "78577f8136324f42b21cdf478a8ba820"
})


export const metamaskQuery = detectEthereumProvider({ mustBeMetaMask: false, silent: true }) as Promise<IEthereumProvider & { selectedAddress: string } | null>


export const arbOneWeb3Provider = new WebSocketProvider(GLOBAL_W3P_ARBITRUM)
export const w3pAva = new JsonRpcProvider(GLOBAL_W3P_AVALANCHE)

