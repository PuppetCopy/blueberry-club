import { O } from "@aelea/core"
import { NETWORK_METADATA } from "@gambitdao/const"
import detectEthereumProvider from "@metamask/detect-provider"
import { awaitPromises, map } from "@most/core"
import WalletConnectProvider from "@walletconnect/ethereum-provider"
import { IEthereumProvider } from "eip1193-provider"
import { Provider } from "ethers"

export const walletConnect = new WalletConnectProvider({
  rpc: Object.entries(NETWORK_METADATA).reduce((seed, [chainId, net]) => ({ ...seed, [chainId]: net.rpcUrls[0] }), {}),
})


export const metamaskQuery = detectEthereumProvider({ mustBeMetaMask: false, silent: true }) as Promise<IEthereumProvider | null>


export const awaitProviderNetwork = O(
  map(async (p: Provider) => {
    await p.getNetwork()
    return p
  }),
  awaitPromises
)

