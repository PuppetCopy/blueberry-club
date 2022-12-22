import { combineArray, fromCallback, replayLatest } from "@aelea/core"
import { BaseProvider, JsonRpcProvider, JsonRpcSigner, Web3Provider } from "@ethersproject/providers"
import { CHAIN, filterNull } from "@gambitdao/gmx-middleware"
import { awaitPromises, constant, continueWith, delay, empty, fromPromise, map, mergeArray, multicast, now, skipRepeats, switchLatest, tap } from "@most/core"
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
  provider: Stream<Web3Provider | BaseProvider>
  defaultProvider: Stream<BaseProvider>

  wallet: Stream<IWalletState | null>
}

export enum IWalletName {
  none = 'none',
  metamask = 'metamask',
  walletConnect = 'walletconnect'
}




interface IWalletLinkConfig {
  globalProviderMap: Partial<Record<CHAIN, BaseProvider>>
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
  const fallbackProvider = config.globalProviderMap[config.defaultGlobalChain]

  if (!fallbackProvider) {
    throw new Error('no Default Provider configured')
  }

  const defaultProvider = map(chain => {  
    const prv = config.globalProviderMap[chain] || fallbackProvider

    return prv as JsonRpcProvider
  }, networkChange || now(config.defaultGlobalChain))

  const provider: Stream<Web3Provider | JsonRpcProvider> = replayLatest(multicast(switchLatest(awaitPromises(combineArray(async (metamask, name) => {
    const isWC = name === IWalletName.walletConnect
    const wp = name === IWalletName.none
      ? null : isWC
        ? walletConnect : metamask

    const prov: Web3Provider | BaseProvider = wp ? new Web3Provider(wp) : fallbackProvider

    if (prov instanceof Web3Provider && wp) {
      const [address]: string[] = await wp.request({ method: 'eth_accounts' }) as any

      if (!address) {
        return now(fallbackProvider)
      }

      //   // WalletConnet doesn't emit standart disconnect
      const disconnect = constant(fallbackProvider, isWC
        ? fromCallback(cb => walletConnect.on('disconnect', cb))
        : eip1193ProviderEvent(wp, 'disconnect'))

      const walletNetworkChange = filterNull(map(chain => {
        self.location.reload()
        return null
      }, eip1193ProviderEvent(wp, 'chainChanged')))

      const accountChange = map(([account]) => {
        if (!account) {
          return fallbackProvider
        }

        return prov
      }, eip1193ProviderEvent(wp, 'accountsChanged'))

      return mergeArray([now(prov), walletNetworkChange, disconnect, accountChange])
    }

    return now(prov)
  }, fromPromise(metamaskQuery), walletName)))))

  // const wallet: Stream<IWalletState | null> = replayLatest(multicast(switchLatest(map(prov => {
  //   return continueWith(() => {

  //     if (prov instanceof Web3Provider) {
  //       try {
  //         const network = await prov.getNetwork()
  //         const [address] = await prov.provider.request!({ method: 'eth_accounts' }) as string[]

  //         if (!address) {
  //           return null
  //         }

  //         const _signer = prov.getSigner()
  //         const chain = network.chainId as CHAIN

  //         return { signer: _signer, address, provider: prov, chain, }
  //       } catch (err) {
  //         console.warn(err)
  //         return null
  //       }
  //     }

  //   }, now(null))
  // }, provider))))

  const wallet: Stream<IWalletState | null> = replayLatest(multicast(awaitPromises(map(async prov => {
    const network = await prov.getNetwork()

    if (prov instanceof Web3Provider) {
      const _signer = prov.getSigner()
      const address = await _signer.getAddress()
      const chain = network.chainId as CHAIN

      return { signer: _signer, address, provider: prov, chain, }
    }

    return null
  }, provider))))


  const network: Stream<CHAIN> = skipRepeats(awaitPromises(combineArray(async (wallet, provider) => {
    try {
      const chainId = wallet ? wallet.chain : (await provider.getNetwork()).chainId as CHAIN
      return chainId
    } catch (err) {
      console.warn(err)
    }
  }, wallet, provider)))

  return { network, wallet, provider, defaultProvider }
}


