import { combineObject, fromCallback } from "@aelea/core"
import { pallete } from "@aelea/ui-components-theme"
import { map, mergeArray, now } from "@most/core"
import { GetAccountResult, GetNetworkResult, InjectedConnector, configureChains, createConfig, createStorage, getAccount, getNetwork, getPublicClient, getWebSocketPublicClient, watchAccount, watchNetwork } from '@wagmi/core'
import { WalletConnectConnector } from '@wagmi/core/connectors/walletConnect'
import { jsonRpcProvider } from '@wagmi/core/providers/jsonRpc'
import { EthereumClient } from '@web3modal/ethereum'
import { Web3Modal } from '@web3modal/html'
import { arbitrum, avalanche } from "viem/chains"



const chains = [arbitrum, avalanche]

const supportedChains = chains.map(c => c.id)

const projectId = 'c7cea9637dde679f833971689e9a3119'

const configChain = configureChains(
  [arbitrum, avalanche],
  [
    // w3mProvider({ projectId }),
    jsonRpcProvider({
      rpc: chain => {

        // const isSupported = supportedChains.indexOf(chain.id) !== -1
        const supportedChains = [
          1, 3, 4, 5, 10, 42, 56, 69, 97, 100, 137, 280, 324, 420, 42161, 42220, 43114, 80001, 421611,
          421613, 1313161554, 1313161555
        ]
        const NAMESPACE = 'eip155'

        if (supportedChains.includes(chain.id)) {
          return {
            http: `https://rpc.walletconnect.com/v1/?chainId=${NAMESPACE}:${chain.id}&projectId=${projectId}`
          }
        }

        return {
          http: chain.rpcUrls.default.http[0],
          webSocket: chain.rpcUrls.default.webSocket?.[0]
        }
      }
    })
    // jsonRpcProvider({
    //   rpc: (chain) => {
    //     debugger

    //     if (chain.id === CHAIN.AVALANCHE) {
    //       return {
    //         http: `https://api.avax.network/ext/bc/C/rpc`,
    //         webSocket: `wss://api.avax.network/ext/bc/C/ws`,
    //       }
    //     }

    //     const apiKey = import.meta.env.RPC_API_DEV_ARB || 'Rf-9XHJG_C6xvhApXKg1tNCZmAOBaA5A'

    //     return {
    //       http: `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`,
    //       webSocket: `wss://arb-mainnet.g.alchemy.com/v2/${apiKey}`,
    //     }
    //   },
    // })
    // alchemyProvider({ apiKey: `` })
  ],
)


export const wcConnector = new WalletConnectConnector({
  chains,
  options: { projectId, showQrModal: false }
})


const injectedConnector = new InjectedConnector({ chains })
export const walletConfig = createConfig({
  autoConnect: true,
  connectors: [injectedConnector, wcConnector],
  publicClient: configChain.publicClient,
  webSocketPublicClient: configChain.webSocketPublicClient,
  storage: createStorage({ storage: window.localStorage }),
})


const ethereumClient = new EthereumClient(walletConfig, chains)


export const networkChange = fromCallback<GetNetworkResult>(watchNetwork)
export const accountChange = fromCallback<GetAccountResult>(watchAccount)

export const network = map(getNetworkResult => {
  const chain = chains.find(chain => chain.id == getNetworkResult.chain?.id)

  return chain || null
}, mergeArray([
  map(() => getNetwork(), now(null)),
  networkChange
]))


// walletConfig.subscribe((state) => {
//   console.log(state)
// })
// // export const initialConnection = getNetwork()
// // debugger
// //   .then(() => {
// //   debugger
// // })

export const account = mergeArray([
  map(() => getAccount(), now(null)),
  accountChange
])


export const wallet = map(params => {
  return params
}, combineObject({ account, network }))

export const publicClient = map(params => {
  if (params.network == null) {
    throw new Error('network is null')
  }

  const clientAvaialble = getWebSocketPublicClient({ chainId: params.network.id }) || getPublicClient({ chainId: params.network.id })

  return clientAvaialble
}, combineObject({ network }))



export const web3Modal = new Web3Modal({
  projectId,
  themeVariables: {
    '--w3m-accent-color': '#FF8700',
    '--w3m-accent-fill-color': '#000000',
    '--w3m-background-color': pallete.foreground,
    // '--w3m-background-image-url': '/images/customisation/background.png',
    // '--w3m-logo-image-url': '/images/customisation/logo.png',
    '--w3m-background-border-radius': '0px',
    '--w3m-container-border-radius': '0px',
    '--w3m-wallet-icon-border-radius': '0px',
    '--w3m-wallet-icon-large-border-radius': '0px',
    '--w3m-input-border-radius': '0px',
    '--w3m-button-border-radius': '0px',
    '--w3m-secondary-button-border-radius': '0px',
    '--w3m-notification-border-radius': '0px',
    '--w3m-icon-button-border-radius': '0px',
    '--w3m-button-hover-highlight-border-radius': '0px',
    '--w3m-font-family': `'RelativePro', sans-serif`
  }
}, ethereumClient)


