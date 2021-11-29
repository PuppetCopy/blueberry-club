import detectEthereumProvider from "@metamask/detect-provider"
import WalletConnectProvider from "@walletconnect/ethereum-provider"
import { IEthereumProvider } from "eip1193-provider"
import { NETWORK_METADATA } from "@gambitdao/wallet-link"


export const walletConnect = new WalletConnectProvider({
  rpc: Object.entries(NETWORK_METADATA).reduce((seed, [chainId, net]) => ({ ...seed, [chainId]: net.rpcUrls[0] }), {}),
  infuraId: "78577f8136324f42b21cdf478a8ba820"
})

export const metamaskQuery = detectEthereumProvider({ mustBeMetaMask: true, silent: true }) as Promise<IEthereumProvider & { selectedAddress: string } | null>




