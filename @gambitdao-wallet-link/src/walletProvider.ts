import { EIP1193Provider } from "viem"
import { NETWORK_METADATA } from "@gambitdao/const"
import detectEthereumProvider from "@metamask/detect-provider"
import WalletConnectProvider from "@walletconnect/ethereum-provider"

// @ts-ignore
export const walletConnect = new WalletConnectProvider({
  rpc: Object.entries(NETWORK_METADATA).reduce((seed, [chainId, net]) => ({ ...seed, [chainId]: net.rpcUrls[0] }), {}),
})

export const metamaskQuery = detectEthereumProvider({ mustBeMetaMask: false, silent: true }) as Promise<EIP1193Provider | null>


