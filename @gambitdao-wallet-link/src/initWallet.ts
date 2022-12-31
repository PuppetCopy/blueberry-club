import { combineArray, fromCallback, replayLatest } from "@aelea/core"
import { BaseProvider, JsonRpcSigner, Web3Provider } from "@ethersproject/providers"
import { awaitPromises, constant, fromPromise, map, mergeArray, multicast, now, snapshot, switchLatest, tap } from "@most/core"
import { Stream } from "@most/types"
import { eip1193ProviderEventFn } from "./common"
import { CHAIN } from "./constant"
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
  networkChange: Stream<CHAIN> = now(config.defaultGlobalChain),
): IWalletLink {
  const fallbackProvider = config.globalProviderMap[config.defaultGlobalChain]

  if (!fallbackProvider) {
    throw new Error('no Default Provider configured')
  }


  const walletChange = switchLatest(awaitPromises(combineArray(async (metamask, name) => {
    if (name === IWalletName.none) {
      return now(null)
    }

    const isWc = name === IWalletName.walletConnect
    const wp = isWc ? walletConnect : metamask!
    const [address]: string[] = await wp?.request({ method: 'eth_accounts' }) as any
    const chain = Number(await wp.request({ method: 'eth_chainId' }))

    if (!address) {
      return now(null)
    }

    const prov: Web3Provider = new Web3Provider(wp, chain)

    const state: IWalletState = {
      walletName: name,
      address,
      provider: prov,
      chain: chain,
      signer: prov.getSigner(),
    }

    // WalletConnet doesn't emit standart disconnect
    const disconnect = isWc
      ? fromCallback(cb => walletConnect.on('disconnect', cb))
      : eip1193ProviderEventFn(wp, 'disconnect')

    const walletNetworkChange = map(id => {
      const chainId = Number(id)
      const w3p = new Web3Provider(wp, chain)
      return { ...state, provider: w3p, chain: chainId }
    }, eip1193ProviderEventFn(wp, 'chainChanged'))

    const nullWallet = constant(null, disconnect)

    // const accountChange = map(([account]) => {
    //   if (!account) {
    //     return null
    //   }

    //   return { ...state, address: account }
    // }, eip1193ProviderEventFn(wp, 'accountsChanged'))

    return mergeArray([now(state), walletNetworkChange, nullWallet])
  }, fromPromise(metamaskQuery), walletName)))

  const wallet: Stream<IWalletState | null> = replayLatest(multicast(walletChange))

  const defaultProvider = awaitPromises(map(async (chain) => {
    const dp = config.globalProviderMap[chain] || fallbackProvider
    await dp.getNetwork()
    return dp
  }, networkChange))

  const provider = snapshot((chain, w3p) => {
    if (w3p) {
      return w3p.provider
    }

    return config.globalProviderMap[chain] || fallbackProvider
  }, networkChange, wallet)

  const network: Stream<CHAIN> = snapshot((chain, w3p) => {
    return w3p ? w3p.chain : chain
  }, networkChange, wallet)

  return { network, wallet, provider, defaultProvider }
}


