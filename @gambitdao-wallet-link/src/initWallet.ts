import { combineArray, fromCallback, replayLatest } from "@aelea/core"
import { JsonRpcProvider, JsonRpcSigner, Web3Provider } from "@ethersproject/providers"
import { CHAIN } from "@gambitdao/gmx-middleware"
import { awaitPromises, constant, empty, fromPromise, map, mergeArray, multicast, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { eip1193ProviderEvent } from "./common"
import { metamaskQuery, walletConnect } from "./provider"


export interface IWalletState {
  walletName: IWalletName
  address: string
  provider: Web3Provider
  chain: CHAIN
  signer: JsonRpcSigner
}


export interface IWalletLink {
  network: Stream<CHAIN>
  provider: Stream<Web3Provider | JsonRpcProvider>
  defaultProvider: Stream<JsonRpcProvider>

  wallet: Stream<IWalletState | null>
}

export enum IWalletName {
  none = 'none',
  metamask = 'metamask',
  walletConnect = 'walletconnect'
}




interface IWalletLinkConfig {
  globalProviderMap: Partial<Record<CHAIN, JsonRpcProvider>>
  defaultGlobalChain: CHAIN
}


// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
// walletconnect chaining chain issue https://github.com/WalletConnect/walletconnect-monorepo/issues/612
// attempting to manage wallet connection and event flow
export function initWalletLink(
  config: IWalletLinkConfig,
  walletName: Stream<IWalletName>,
  networkChange?: Stream<CHAIN>,
): IWalletLink {

  const defaultGlobalProvider = config.globalProviderMap[config.defaultGlobalChain] as JsonRpcProvider


  const provider: Stream<Web3Provider | JsonRpcProvider> = replayLatest(multicast(switchLatest(mergeArray([
    combineArray((metamask, name, chain) => {

      const isWC = name === IWalletName.walletConnect
      const wp = name === IWalletName.none
        ? null : isWC
          ? walletConnect : metamask

      const fallbackProvider = config.globalProviderMap[chain] || defaultGlobalProvider
      const prov: Web3Provider | JsonRpcProvider = wp ? new Web3Provider(wp) : fallbackProvider

      if (prov instanceof Web3Provider && wp) {
        //   const [address]: string[] = await wp.request({ method: 'eth_accounts' }) as any

        //   // WalletConnet doesn't emit standart disconnect
        const disconnect = constant(fallbackProvider, isWC
          ? fromCallback(cb => walletConnect.on('disconnect', cb))
          : eip1193ProviderEvent(wp, 'disconnect'))

        const walletNetworkChange = map(() => new Web3Provider(wp), eip1193ProviderEvent(wp, 'chainChanged'))
        const accountChange = constant(prov, eip1193ProviderEvent(wp, 'accountsChanged'))

        return mergeArray([now(prov), walletNetworkChange, disconnect, accountChange])
      }

      return now(prov)
    }, fromPromise(metamaskQuery), walletName, networkChange || empty())
  ]))))


  // const newLocal = [walletProvider, defaultProvider] as [Stream<IEthereumProvider | null>, Stream<JsonRpcProvider>]
  const defaultProvider: Stream<Web3Provider | JsonRpcProvider> = replayLatest(multicast(awaitPromises(map(async prov => {
    const network = await prov.getNetwork()
    const isConnectedChainSupported = network.chainId in config.globalProviderMap

    if (isConnectedChainSupported) {
      return prov
    }

    return defaultGlobalProvider
  }, provider))))

  const wallet: Stream<IWalletState | null> = replayLatest(multicast(awaitPromises(map(async prov => {
    const network = await prov.getNetwork()

    if (prov instanceof Web3Provider) {
      try {
        const _signer = prov.getSigner()
        const address = await _signer.getAddress()
        const chain = network.chainId as CHAIN

        return { signer: _signer, address, provider: prov, chain, }
      } catch (err) {
        console.warn(err)
      }
    }

    return null
  }, provider))))


  const network: Stream<CHAIN> = replayLatest(multicast(awaitPromises(map(async (provider) => {
    try {
      const chainId = (await provider.getNetwork()).chainId as CHAIN
      return chainId
    } catch (err) {
      console.warn(err)
    }
  }, defaultProvider))))

  return { network, wallet, provider, defaultProvider }
}


