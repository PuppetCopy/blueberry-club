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
export const BI_18_PRECISION = 10n ** 18n


export const labItemDescriptionList: LabItemDescription[] = [
  {
    name: "Builder",
    description: "yadda yadda",
    id: IAttributeMappings['Builder'],
    contractAddress: "0xAa86921095c1B9CCc089c01628ffDCF6EFA7c49c",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 11, 25, 22, 0, 0),
    whitelistDate: Date.UTC(2023, 0, 1, 22, 0, 0),
    mintPrice: 10000000000000000n,
  },
  {
    name: "Camo Background",
    description: "yadda yadda",
    id: IAttributeMappings['Camo Background'],
    contractAddress: "0x89991C609A04970141d0a88e6179f862b34c0303",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 2, 12, 22, 0, 0),
    mintPrice: 10000000000000000n,
  },
  {
    name: "Avalanche Hoodie",
    description: "yadda yadda",
    id: IAttributeMappings["Avalanche Hoodie"],
    contractAddress: "0x005B352D6b6F4CacE6c213b39cB24D1404a73122",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 2, 12, 22, 0, 0),
    mintPrice: 0n,
  },
  {
    name: "Lab Head",
    description: "yadda yadda",
    id: IAttributeMappings["Lab Head"],
    contractAddress: "0x005B352D6b6F4CacE6c213b39cB24D1404a73122",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 2, 12, 22, 0, 0),
    mintPrice: 0n,
  },
  {
    name: "Fast Food Cap",
    description: "yadda yadda",
    id: IAttributeMappings["Fast Food Cap"],
    contractAddress: "0x8277592789887bD9caBb6E847002D96726a38f96",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 2, 12, 22, 0, 0),
    mintPrice: 1000000000000000000n,
  },
  {
    name: "Christmas Hat",
    description: "yadda yadda",
    id: IAttributeMappings['Christmas Hat'],
    contractAddress: "0x67f89f725005B45036ee4B4C3cCAf6FA4f2012af",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 11, 25, 22, 0, 0),
    whitelistDate: Date.UTC(2023, 0, 1, 22, 0, 0),
    mintPrice: 10000000000000000n,
  },
  {
    name: "Beard White",
    description: "yadda yadda",
    id: IAttributeMappings['Beard White'],
    contractAddress: "0xE8B6d8C161bFA073e4BBA04dB5f9678d0BAa1eF2",
    maxSupply: 100,
    saleDate: Date.UTC(2022, 11, 25, 22, 0, 0),
    mintPrice: 10000000000000000n,
  },
]

export const labItemDescriptionListMap = groupByMap(labItemDescriptionList, i => i.id)