import { combineArray, replayLatest } from "@aelea/core"
import { Web3Provider } from "@ethersproject/providers"
import { CHAIN, NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import { awaitPromises, constant, map, merge, mergeArray, multicast, snapshot } from "@most/core"
import { Stream } from "@most/types"
import { EIP1193Provider } from "eip1193-provider"
import { eip1193ProviderEvent, parseError } from "./common"


export interface IWalletLink<T extends EIP1193Provider = EIP1193Provider> {
  account: Stream<string | null>
  network: Stream<CHAIN | null>

  provider: Stream<Web3Provider | null>
  walletChange: Stream<T | null>
}



// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
// walletconnect chaining chain issue https://github.com/WalletConnect/walletconnect-monorepo/issues/612
// attempting to manage wallet connection and event flow
export function initWalletLink<T extends EIP1193Provider>(walletChange: Stream<T | null>): IWalletLink<T> {
  const walletEvent = eip1193ProviderEvent(walletChange)

  const disconnect = constant(null, walletEvent('disconnect'))
  const networkChange = map(Number, walletEvent('chainChanged'))
  const accountChange = map(list => list[0], walletEvent('accountsChanged'))


  const ethersWeb3Wrapper = awaitPromises(combineArray(async (wallet) => {
    if (wallet) {
      const chainId = await wallet.request({ method: 'eth_chainId' }) as any as number
      const w3p = new Web3Provider(wallet, Number(chainId))
      // const network = await w3p.getNetwork()
      return w3p
    }

    return null
  }, walletChange))



  const proivderChange = awaitPromises(snapshot(async (walletProvider, net) => {
    if (walletProvider === null) {
      return null
    }

    const w3p = new Web3Provider(walletProvider, net)
    // await w3p.getNetwork()

    return w3p
  }, walletChange, networkChange))



  
  const provider = mergeArray([ethersWeb3Wrapper, proivderChange, disconnect])

  const network = map(w3p => w3p?.network.chainId || null, provider)


  const currentAccount = awaitPromises(map(async (provi) => {
    if (provi === null) {
      return null
    }

    return provi.getSigner().getAddress()
  }, provider))

  const account = merge(accountChange, currentAccount)

  return { account, network, provider,  walletChange }
}


// https://eips.ethereum.org/EIPS/eip-3085
export async function attemptToSwitchNetwork(metamask: EIP1193Provider, chain: CHAIN) {
  try {
    // check if the chain to connect to is installed
    await metamask.request({
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
        await metamask.request({
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

export { parseError }
 