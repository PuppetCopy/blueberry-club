import { combineArray, replayLatest } from "@aelea/core"
import { awaitPromises, map, mergeArray, multicast, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { createWalletClient, custom, WalletClient, Transport, createPublicClient, PublicClient, Chain, Account, http } from 'viem'


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
  publicClientMap: TChainMap,
  walletName: Stream<any>,
  networkChange: Stream<keyof TChainMap>,
): IWalletLink<TChainMap, TChain, TTransport, TPublicClient, TWalletClient> {
  const chainMapKeys = Object.keys(publicClientMap)

  if (!chainMapKeys?.length) {
    throw new Error('chainMap is empty')
  }

  const publicClientList = Object.values(publicClientMap)

  const defaultChain = chainMapKeys[0] as keyof TChainMap
  const initialClient = publicClientMap[defaultChain]

  const chains = publicClientList.map(pc => pc.chain)
  // const wcConnector = new WalletConnectConnector({
  //   chains,
  //   options: {
  //     projectId: 'c7cea9637dde679f833971689e9a3119',
  //     metadata: {
  //       name: 'Puppet',
  //       description: 'Social Mirror Trading Platform',
  //       url: 'https://puppet.finance',
  //       icons: ['https://wagmi.sh/icon.png'],
  //     },
  //   }
  // })


  // const { publicClient, webSocketPublicClient } = configureChains(
  //   chains,
  //   [publicProvider()],
  // )

  // const config = createConfig({
  //   connectors: [],
  //   autoConnect: true,
  //   publicClient,
  //   webSocketPublicClient,
  //   storage: createStorage({ storage: window.localStorage }),
  // })



  const wallet: Stream<TWalletClient | null> = replayLatest(multicast(switchLatest(awaitPromises(map(async params => {
    if (!params) {
      return now(null)
    }



    // const transport = custom(wp)
    const transport = http()
    // const [[address], chainId] = await Promise.all([
    //   wp.request({ method: 'eth_accounts' }) as Promise<Address[]>,
    //   wp.request({ method: 'eth_chainId' }).then(Number) as Promise<number>
    // ])

    // if (!address) {
    //   return now(null)
    // }

    const newLocal: PublicClient<Transport, Chain>[] = Object.values(publicClientMap)
    // const chain: Chain | undefined = wc.find(c => c.chain.id === chainId)?.chain

    // const walletClient = await getWalletClient()


    // const disconnect = eip1193ProviderEventFn(wp, 'disconnect')

    // const walletNetworkChange = awaitPromises(map(async id => {
    //   document.location.reload()

    //   return walletClient
    // }, eip1193ProviderEventFn(wp, 'chainChanged')))

    // const nullWallet = constant(null, disconnect)

    // const accountChange = map(([newAddress]) => {
    //   if (!newAddress) {
    //     return null
    //   }


    //   return createWalletClient({
    //     name,
    //     account: newAddress,
    //     chain,
    //     transport
    //   })
    // }, eip1193ProviderEventFn(wp, 'accountsChanged'))

    return mergeArray([now(null)])
  }, walletName)))))


  const defaultClient = replayLatest(multicast(map((chain): TPublicClient => {
    const globalClient = publicClientMap[chain] || initialClient
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

  return { network, wallet, client, defaultClient, chainMap: publicClientMap }
}


