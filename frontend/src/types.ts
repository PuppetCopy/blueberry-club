


export interface IToken {
  id: string
  uri: string
  owner: IOwner

  transfers: ITransfer[]
  contract: IContract
}

export interface IContract {
  id: string
  name: string
  symbol: string
  totalSupply: bigint
  mintedTokens: IToken[]
}

export interface ITransfer {
  id: string
  token: IToken
  from: IOwner
  to: IOwner
  transactionHash: string
  block: bigint
  timestamp: bigint
}

export interface IOwner {
  id: string
  ownedTokens: IToken[]
  balance: bigint
}

export interface ITokenMetadata {
  description: string
  image: string
  name: string

  attributes: {
    trait_type: string
    value: string
  }[]
}


export interface ITreasuryStore {
  startedStakingGlpTimestamp: null | number
  startedStakingGmxTimestamp: null | number
}