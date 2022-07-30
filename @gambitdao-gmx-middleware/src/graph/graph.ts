import {
  TradeStatus, IAccountQueryParamApi, IChainParamApi
} from "../types"
import { ClientOptions, createClient, OperationContext, TypedDocumentNode } from "@urql/core"
import fetch from 'isomorphic-fetch'
import { CHAIN } from "../constant"
export * as document from './document'

export type IAccountTradeListParamApi = IChainParamApi & IAccountQueryParamApi & { status: TradeStatus };



export const prepareClient = (opts: ClientOptions) => {

  const client = createClient(opts)

  return async <Data, Variables extends object = {}>(document: TypedDocumentNode<Data, Variables>, params: Variables, context?: Partial<OperationContext>): Promise<Data> => {
    const result = await client.query(document, params, context)
      .toPromise()

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result.data!
  }
}




export const arbitrumGraph = prepareClient({
  fetch,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-arbitrum'
})
export const avalancheGraph = prepareClient({
  fetch,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-avalanche'
})


export const graphClientMap = {
  [CHAIN.ARBITRUM]: arbitrumGraph,
  [CHAIN.AVALANCHE]: avalancheGraph,
}

