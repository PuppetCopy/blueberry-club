import { CHAIN, groupByMap } from "@gambitdao/gmx-middleware"
import { IAttributeMappings, LabItemDescription } from "./types"


export const USE_CHAIN = CHAIN.ETH_ROPSTEN
export const GLOBAL_W3P = 'wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'
export const GLOBAL_W3P_AVALANCHE = 'https://api.avax.network/ext/bc/C/rpc'

export const MINT_WHITELIST_START = Date.UTC(2021, 11, 5, 22, 0, 0)
export const MINT_PUBLIC_START = Date.UTC(2021, 11, 7, 22, 0, 0)
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000"


export const GBC_DESCRIPTION = {
  NAME: 'Blueberry Club',
  SYMBOL: 'GBC',
  BASE_URI: 'ipfs://QmZfVGMtQPeSfre5yHDzDdw4ocZ1WEakGtbYqvtvhhD4zQ/',
}


export const MINT_MAX_SUPPLY = 10000
export const MINT_PRICE = 30000000000000000n
export const USD_PRECISION = 10n ** 18n


export const labItemDescriptionList: LabItemDescription[] = [
  {
    name: "Avalanche Hoodie",
    description: "yadda yadda",
    id: IAttributeMappings["Avalanche Hoodie"],
    contractAddress: "0x4EE5f3421A47D163F0E177075C595e6728fb2293",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 2, 12, 22, 0, 0),
    mintPrice: 30000000000000000n,
  },
  {
    name: "Fast Food Cap",
    description: "yadda yadda",
    id: IAttributeMappings["Fast Food Cap"],
    contractAddress: "0x67eE4561948ba4a1Bc25CDd475728Bb0D73e4621",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 2, 12, 22, 0, 0),
    mintPrice: 30000000000000000n,
  },
  {
    name: "Christmas Hat",
    description: "yadda yadda",
    id: IAttributeMappings['Christmas Hat'],
    contractAddress: "0x3Af775be949fD8aB533d1CCE15DcDe8f44dd9cDb",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 11, 25, 22, 0, 0),
    whitelistDate: Date.UTC(2023, 0, 1, 22, 0, 0),
    mintPrice: 30000000000000000n,
  },
  {
    name: "Beard White",
    description: "yadda yadda",
    id: IAttributeMappings['Beard White'],
    contractAddress: "0x668e3754371c3c129A3c0AB18a5C9B93cac92452",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 11, 25, 22, 0, 0),
    mintPrice: 30000000000000000n,
  },
  {
    name: "Camo Background",
    description: "yadda yadda",
    id: IAttributeMappings['Camo Background'],
    contractAddress: "0x935D6A513dAaDB531a69507474431E739040c0F1",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 11, 25, 22, 0, 0),
    mintPrice: 30000000000000000n,
  },
  {
    name: "Builder",
    description: "yadda yadda",
    id: IAttributeMappings['Builder'],
    contractAddress: "0x74bbf321D2De518F970e1d5D558460cc7542A419",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 11, 25, 22, 0, 0),
    whitelistDate: Date.UTC(2023, 0, 1, 22, 0, 0),
    mintPrice: 30000000000000000n,
  },
]

export const labItemDescriptionListMap = groupByMap(labItemDescriptionList, i => i.id)