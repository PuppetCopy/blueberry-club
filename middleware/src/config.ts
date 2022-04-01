import { CHAIN, groupByMap } from "@gambitdao/gmx-middleware"
import { IAttributeMappings, LabItemSaleDescription } from "./types"


export const USE_CHAIN = CHAIN.ARBITRUM_RINKBY
export const GLOBAL_W3P = 'wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'
export const GLOBAL_W3P_HTTP = 'https://arbitrum-mainnet.infura.io/v3/6d7e461ad6644743b92327579860b662'
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


const toTime = (...params: Parameters<typeof Date.UTC>) => Math.floor(Date.UTC(...params) / 1000)

export const saleDescriptionList: LabItemSaleDescription[] = [
  {
    name: "Builder",
    description: `Whitelist can mint now, public(non GBC holders are delayed)`,
    id: IAttributeMappings['Builder'],
    contractAddress: "0x0317200442455F140DeE0b331463c5B194AB7211",
    maxSupply: 100n,
    publicStartDate: toTime(2022, 2, 31, 22),
    publicCost: 10000000000000000n,
    maxPerTx: 10n,
    
    whitelistStartDate: 0,
    whitelistMax: 50n,
    whitelistCost: 10000000000000000n
  },
  {
    name: "Camo Background",
    description: "for GBC holders(whitelist), public is highly delayed",
    id: IAttributeMappings['Camo Background'],
    contractAddress: "0x2C532A0d43521D229D963D611ac935B609A26d1a",
    maxSupply: 100n,
    publicStartDate: toTime(2022, 4, 27, 22),
    publicCost: 10000000000000000n,
    maxPerTx: 10n,
    whitelistStartDate: toTime(2022, 6, 27, 22),
    whitelistMax: 50n,
    whitelistCost: 10000000000000000n
  },
  {
    name: "Avalanche Hoodie",
    description: `anyone can mint 1 per tx for free, the more dah bettah! (;`,
    id: IAttributeMappings["Avalanche Hoodie"],
    contractAddress: "0x5c486dC34E5C26211E588d208E87Cef59D396C5f",
    maxSupply: 1337n,
    publicStartDate: 0,
    publicCost: 0n,
    maxPerTx: 1n,
  },
  {
    name: "Fast Food Cap",
    description: "yadda yadda",
    id: IAttributeMappings["Fast Food Cap"],
    contractAddress: "0x4a23E2A06D7E9206cFDCafB0068f5C08D0dAf336",
    maxSupply: 33n,
    publicStartDate: toTime(2022, 2, 25, 22),
    publicCost: 20000000000000000n,
    maxPerTx: 1n,
  },
  {
    name: "Christmas Hat",
    description: "This item will be publicly availalbe in Christmas Day",
    id: IAttributeMappings['Christmas Hat'],
    contractAddress: "0xD0E5C4172E5730C7386cC6ecF258EbC574929F4d",
    publicCost: 10000000000000000n,
    maxSupply: 1500n,
    publicStartDate: toTime(2022, 11, 25, 22),
    maxPerTx: 1n,
  },
  {
    name: "Beard White",
    description: "just an overpried beard, it's not worth it!",
    id: IAttributeMappings['Beard White'],
    contractAddress: "0xFbA672C25Ffb47cc66AAE11A6718b1e7D6E60ab6",
    publicCost: 1000000000000000000n,
    maxSupply: 2023n,
    publicStartDate: 0,
    maxPerTx: 10n,
  },
]

export const labItemDescriptionListMap = groupByMap(saleDescriptionList, i => i.id)