import { fromCallback, replayLatest } from "@aelea/core"
import { ExternalProvider, JsonRpcProvider, JsonRpcSigner, Web3Provider } from "@ethersproject/providers"
import { CHAIN, filterNull, NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import { awaitPromises, constant, empty, map, mergeArray, multicast, never, now, snapshot, switchLatest, tap, zip } from "@most/core"
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { eip1193ProviderEvent, parseError } from "./common"
import { arbOneWeb3Provider, metamaskQuery, w3pAva, walletConnect } from "./provider"


export interface IWalletState {
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


export const defaultGlobalProviderMap: Partial<Record<CHAIN, JsonRpcProvider>> = {
  [CHAIN.ARBITRUM]: arbOneWeb3Provider,
  [CHAIN.AVALANCHE]: w3pAva,
}


interface IWalletLinkConfig {
  globalProviderMap: Partial<Record<CHAIN, JsonRpcProvider>>
  defaultGlobalChain: CHAIN
}

const defaultConfig: IWalletLinkConfig = {
  globalProviderMap: defaultGlobalProviderMap,
  defaultGlobalChain: CHAIN.ARBITRUM
}

// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
// walletconnect chaining chain issue https://github.com/WalletConnect/walletconnect-monorepo/issues/612
// attempting to manage wallet connection and event flow
export function initWalletLink(
  walletName: Stream<IWalletName>,
  networkChange?: Stream<CHAIN>,
  givenConfig?: Partial<IWalletLinkConfig>
): IWalletLink {

  const config = { ...defaultConfig, ...givenConfig }

  const walletProvider: Stream<IEthereumProvider | null> = replayLatest(multicast(switchLatest(awaitPromises(map(async (name) => {
    if (name === IWalletName.none) {
      return now(null)
    }

    const isWC = name === IWalletName.walletConnect
    const wp = isWC ? walletConnect : await metamaskQuery


    if (name && wp) {
      const [address]: string[] = await wp.request({ method: 'eth_accounts' }) as any

      const disconnect = isWC
        ? constant(null, fromCallback(cb => walletConnect.on('disconnect', cb))) // wallet-connet doesn't emit standart disconnect
        : constant(null, eip1193ProviderEvent(wp, 'disconnect'))

      const walletNetworkChange = eip1193ProviderEvent(wp, 'chainChanged')
      const userNetworkChange = filterNull(awaitPromises(map(async (chain) => {
        await attemptToSwitchNetwork(wp, chain).catch(error => {
          alert(error.message)
          console.error(error)
          return Promise.reject('unable to switch network')
        })
        return null
      }, networkChange || empty())))
      const netchange = constant(wp, mergeArray([userNetworkChange, walletNetworkChange]))
      const accountChange = constant(wp, eip1193ProviderEvent(wp, 'accountsChanged'))

      if (address) {
        return mergeArray([now(wp),  netchange, accountChange])
      }
    }

    return now(null)
  }, walletName)))))

  const defaultProvider: Stream<Web3Provider | JsonRpcProvider> = awaitPromises(map(async (wallet) => {
    const chain = wallet ? Number(await wallet.request({ method: 'eth_chainId' })) as CHAIN : config.defaultGlobalChain

    if (chain in config.globalProviderMap) {
      if (wallet) {
        const chain = Number(await wallet.request({ method: 'eth_chainId' }))
        const w3p = new Web3Provider(wallet, chain)
        return w3p
      }
      
      const gp = config.globalProviderMap[chain]!
      await gp.getNetwork()

      return gp
    }

    console.warn(`chain ${chain} is not supported, using ${config.defaultGlobalChain} as default`)

    const gp = config.globalProviderMap[config.defaultGlobalChain] as JsonRpcProvider
    await gp.getNetwork()
    return gp
  }, walletProvider))

  // const newLocal = [walletProvider, defaultProvider] as [Stream<IEthereumProvider | null>, Stream<JsonRpcProvider>]
  const provider: Stream<Web3Provider | JsonRpcProvider> = replayLatest(multicast(awaitPromises(zip(async (wallet, defaultGlobalProvider) => {
    if (wallet) {
      const chain = Number(await wallet.request({ method: 'eth_chainId' }))
      const w3p = new Web3Provider(wallet, chain)
      return w3p

      // if (chain in config.globalProviderMap) {
      //   const w3p = new Web3Provider(wallet, chain)
      //   return w3p
      // }

    }
    return defaultGlobalProvider
  }, walletProvider, defaultProvider))))

  const wallet: Stream<IWalletState | null> = replayLatest(multicast(awaitPromises(map(async prov => {
    if (prov instanceof Web3Provider) {
      const _signer = prov.getSigner()
      const address = await _signer.getAddress()
      const chain = await _signer.getChainId() as CHAIN

      return { signer: _signer, address, provider: prov, chain, }
    }

    return null
  }, provider))))


  const network: Stream<CHAIN> = replayLatest(multicast(awaitPromises(map(async (provider) => {
    return (await provider.getNetwork()).chainId as CHAIN
  }, defaultProvider))))

  return { network, wallet, provider, defaultProvider }
}


// https://eips.ethereum.org/EIPS/eip-3085
export async function attemptToSwitchNetwork(metamask: ExternalProvider, chain: CHAIN) {
  if (!('request' in metamask)) {
    return console.error('External Provider does not contain request() method')
  }

  try {
    // check if the chain to connect to is installed
    await metamask.request!({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + chain.toString(16) }], // chainId must be in hexadecimal numbers
    })
  } catch (error: any) {
    if (!NETWORK_METADATA[chain]) {
      throw new Error(`Could not add metamask network, chainId ${chain} is not supported`)
    }
    // This error code indicates that the chain has not been added to MetaMask
    // if it is not, then install it into the user MetaMask
    if (error.code === 4902) {
      try {
        await metamask.request!({
          method: 'wallet_addEthereumChain',
          params: [
            NETWORK_METADATA[chain]
          ],
        })
      } catch (addError: any) {
        throw parseError(addError)
      }
    }

    throw parseError(parseError(error))
  }
}

