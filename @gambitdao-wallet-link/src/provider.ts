import { O } from "@aelea/core"
import { BaseProvider } from "@ethersproject/providers"
import detectEthereumProvider from "@metamask/detect-provider"
import { awaitPromises, map } from "@most/core"
import WalletConnectProvider from "@walletconnect/ethereum-provider"
import { IEthereumProvider } from "eip1193-provider"
import { NETWORK_METADATA } from "./constant"

export const walletConnect = new WalletConnectProvider({
  rpc: Object.entries(NETWORK_METADATA).reduce((seed, [chainId, net]) => ({ ...seed, [chainId]: net.rpcUrls[0] }), {}),
  chainId: 3,
  infuraId: "78577f8136324f42b21cdf478a8ba820"
})


export const metamaskQuery = detectEthereumProvider({ mustBeMetaMask: false, silent: true }) as Promise<IEthereumProvider | null>


export const awaitProviderNetwork = O(
  map(async (p: BaseProvider) => {
    await p.getNetwork()
    return p
  }),
  awaitPromises
)