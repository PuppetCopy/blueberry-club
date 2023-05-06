import { combineArray, fromCallback, replayLatest } from "@aelea/core"
import { awaitPromises, constant, fromPromise, map, mergeArray, multicast, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { createWalletClient, custom, WalletClient, Transport, createPublicClient, PublicClient, Chain, Address, Account } from 'viem'
import { eip1193ProviderEventFn } from "./common.js"
import { metamaskQuery, walletConnect } from "./walletProvider.js"

export enum IWalletName {
  none = 'none',
  metamask = 'metamask',
  walletConnect = 'walletconnect'
}

export type ISupportedChainMap = Record<number, PublicClient<Transport, Chain>>



export type IWalletclient<
  TTransport extends Transport = Transport,
  TChain extends Chain = Chain,
> = WalletClient<TTransport, TChain, Account>

export type IPublicClient<
  TTransport extends Transport = Transport,
  TChain extends Chain = Chain,
> = PublicClient<TTransport, TChain>

export interface IWalletLink<
  TChainMap extends ISupportedChainMap = ISupportedChainMap,
  TChain extends Chain = Chain,
  TTransport extends Transport = Transport,
  TPublicClient extends PublicClient<TTransport, TChain> = PublicClient<TTransport, TChain>,
  TWalletClient extends IWalletclient<TTransport, TChain> = WalletClient<TTransport, TChain, Account>,
> {
  chainMap: TChainMap,
  network: Stream<keyof TChainMap>
  client: Stream<TPublicClient>
  defaultClient: Stream<TPublicClient>

  wallet: Stream<TWalletClient | null>
}





// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
// walletconnect chaining chain issue https://github.com/WalletConnect/walletconnect-monorepo/issues/612
// attempting to manage wallet connection and event flow
export function initWalletLink<
  TChain extends Chain,
  TChainMap extends ISupportedChainMap,
  TTransport extends Transport,
  TPublicClient extends PublicClient<TTransport, TChain>,
  TWalletClient extends WalletClient<TTransport, TChain, Account>
>(
  chainMap: TChainMap,
  walletName: Stream<IWalletName>,
  networkChange: Stream<keyof TChainMap>,
): IWalletLink<TChainMap, TChain, TTransport, TPublicClient, TWalletClient> {
  const chainMapKeys = Object.keys(chainMap)

  if (!chainMapKeys?.length) {
    throw new Error('chainMap is empty')
  }

  const defaultChain = chainMapKeys[0] as keyof TChainMap
  const initialClient = chainMap[defaultChain]


  const wallet: Stream<TWalletClient | null> = replayLatest(multicast(switchLatest(awaitPromises(combineArray(async (metamask, name) => {
    if (name === IWalletName.none) {
      return now(null)
    }

    const isWc = name === IWalletName.walletConnect
    const wp = isWc ? walletConnect : metamask!
    const transport = custom(wp)
    const [[address], chainId] = await Promise.all([
      wp.request({ method: 'eth_accounts' }) as Promise<Address[]>,
      wp.request({ method: 'eth_chainId' }).then(Number) as Promise<number>
    ])

    if (!address) {
      return now(null)
    }

    const newLocal: PublicClient<Transport, Chain>[] = Object.values(chainMap)
    const chain: Chain | undefined = newLocal.find(c => c.chain.id === chainId)?.chain

    const walletClient = createWalletClient({
      name,
      account: address,
      chain,
      transport
    }) as unknown as TWalletClient


    // WalletConnet doesn't emit standart disconnect
    const disconnect = isWc
      ? fromCallback(cb => walletConnect.on('disconnect', cb))
      : eip1193ProviderEventFn(wp, 'disconnect')

    const walletNetworkChange = awaitPromises(map(async id => {
      document.location.reload()

      return walletClient
    }, eip1193ProviderEventFn(wp, 'chainChanged')))

    const nullWallet = constant(null, disconnect)

    const accountChange = map(([newAddress]) => {
      if (!newAddress) {
        return null
      }


      return createWalletClient({
        name,
        account: newAddress,
        chain,
        transport
      })
    }, eip1193ProviderEventFn(wp, 'accountsChanged'))

    return mergeArray([now(walletClient), walletNetworkChange, accountChange, nullWallet])
  }, fromPromise(metamaskQuery), walletName)))))


  const defaultClient = replayLatest(multicast(map((chain): TPublicClient => {
    const globalClient = chainMap[chain] || initialClient
    // const client: PublicClient<TTransport, Chain> = createPublicClient({
    // const client = createPublicClient({
    //   transport: globalClient.transport,
    //   chain: arbitrum,
    //   batch: {
    //     multicall: true,
    //   },
    // }) as TPublicClient

    return globalClient as any
  }, networkChange)))

  const client: Stream<TPublicClient> = replayLatest(multicast(combineArray((defClient, walletState) => {
    if (walletState && walletState.chain) {
      const publicClient: TPublicClient = createPublicClient({
        batch: { multicall: true, },
        chain: walletState.chain,
        transport: custom(walletState.transport)
      }) as any

      return publicClient
    }

    return defClient
  }, defaultClient, wallet)))

  const network: Stream<number> = replayLatest(multicast(map(p => p.chain.id!, client)))

  return { network, wallet, client, defaultClient, chainMap }
}


