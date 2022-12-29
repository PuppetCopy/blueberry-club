import { combineArray, fromCallback, replayLatest } from "@aelea/core"
import { BaseProvider, JsonRpcSigner, Web3Provider } from "@ethersproject/providers"
import { CHAIN, filterNull } from "@gambitdao/gmx-middleware"
import { awaitPromises, constant, fromPromise, map, mergeArray, multicast, now, skipRepeats, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { eip1193ProviderEventFn } from "./common"
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
  provider: Stream<Web3Provider>
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
  networkChange: Stream<CHAIN> = now(config.defaultGlobalChain),
): IWalletLink {
  const fallbackProvider = config.globalProviderMap[config.defaultGlobalChain]

  if (!fallbackProvider) {
    throw new Error('no Default Provider configured')
  }



  const wallet: Stream<IWalletState | null> = replayLatest(multicast(switchLatest(awaitPromises(combineArray(async (metamask, name) => {
    if (name === IWalletName.none) {
      return now(null)
    }

    const isWc = name === IWalletName.walletConnect
    const wp = isWc ? walletConnect : metamask!
    const [address]: string[] = await wp?.request({ method: 'eth_accounts' }) as any
    const chainId = await wp.request({ method: 'eth_chainId' })

    if (!address) {
      return now(null)
    }

    const prov: Web3Provider = new Web3Provider(wp)

    const state: IWalletState = {
      walletName: name,
      address,
      provider: prov,
      chain: Number(chainId),
      signer: prov.getSigner(),
    }

    //   // WalletConnet doesn't emit standart disconnect
    const disconnect = constant(null, isWc
      ? fromCallback(cb => walletConnect.on('disconnect', cb))
      : eip1193ProviderEventFn(wp, 'disconnect')
    )

    const walletNetworkChange = filterNull(map(chain => {
      self.location.reload()
      return null
    }, eip1193ProviderEventFn(wp, 'chainChanged')))

    const accountChange = map(([account]) => {
      if (!account) {
        return null
      }

      return { ...state, address: account }
    }, eip1193ProviderEventFn(wp, 'accountsChanged'))

    return mergeArray([now(state), walletNetworkChange, disconnect, accountChange])
  }, fromPromise(metamaskQuery), walletName)))))

  const defaultProvider = map((chain) => {
    return config.globalProviderMap[chain] || fallbackProvider
  }, networkChange)

  const provider = combineArray((w3p, chain) => {
    if (w3p === null || !config.globalProviderMap[chain]) {
      return config.globalProviderMap[chain] || fallbackProvider
    }

    return w3p.provider
  }, wallet, networkChange)

  const network: Stream<CHAIN> = combineArray((w3p, chain) => {
    return w3p ? w3p.chain : chain
  }, wallet, networkChange)

  return { network, wallet, provider, defaultProvider }
}


