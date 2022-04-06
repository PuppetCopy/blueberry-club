import { CHAIN, groupByMap, intervalInMsMap } from "@gambitdao/gmx-middleware"
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
export const BI_30_PRECISION = 10n ** 30n

export const REWARD_DISTRIBUTOR = {
  distributionPeriod: intervalInMsMap.DAY7,
  activityPeriod: intervalInMsMap.MONTH,
}


const toTime = (...params: Parameters<typeof Date.UTC>) => Math.floor(Date.UTC(...params) / 1000)

export const saleDescriptionList: LabItemSaleDescription[] = [
  {
    name: "Avalanche Hoodie",
    description: `A possible partnership could be a GBC Treasury paid promotion\n\none example would be, anyone who mints this item and wears as a profile(on-chain) would be eligible for an air-drop or allowed for an entry to a special event`,
    id: IAttributeMappings["Avalanche Hoodie"],
    contractAddress: "0x2B8dFf7016C1c33b3834641604aEC1007EFf4405",
    maxSupply: 1337n,
    publicStartDate: 0,
    publicCost: 0n,
    maxPerTx: 1n,
  },
  {
    name: "Abstract Background",
    description: `GBC Members are whitelisted and can mint on ${new Date(toTime(2022, 3, 7, 22) * 1000).toLocaleString()} . Public Mint is highly delayed`,
    id: IAttributeMappings['Camo Background'],
    contractAddress: "0x45C70e971D0402a3f60fE292d7a8efD1238e3531",
    maxSupply: 100n,
    publicStartDate: toTime(2022, 9, 27, 22),
    publicCost: 10000000000000000n,
    maxPerTx: 10n,
    whitelistStartDate: toTime(2022, 3, 7, 22),
    whitelistMax: 400n,
    whitelistCost: 10000000000000000n
  },
  {
    name: "Builder Vest",
    description: `This vest is only for true builders`,
    id: IAttributeMappings['Builder'],
    contractAddress: "0x8Eba63Ff92658D22510534051E680D5d3A2FBCbE",
    maxSupply: 100n,
    publicStartDate: toTime(2022, 3, 8, 22),
    publicCost: 10000000000000000n,
    maxPerTx: 10n,
  },
  {
    name: "Fast Food Cap",
    description: "Because every GMX bottom seller needs one (;",
    id: IAttributeMappings["Fast Food Cap"],
    contractAddress: "0x576bC7D95BddedDFcF817AdA9496f9674848Ab54",
    maxSupply: 33n,
    publicStartDate: toTime(2022, 3, 9, 22),
    publicCost: 20000000000000000n,
    maxPerTx: 1n,
  },
  {
    name: "Santa Claus Hat",
    description: "GBC holders will be able to mint this item for free on Christmas Day\n\nBut, since Christmas date will be far too long for a test, we shall celebrate an early Ho ho ho! Merry Christmas!",
    id: IAttributeMappings['Christmas Hat'],
    contractAddress: "0xa90C156D2632d18F4EB20f96991609DAC5689288",
    publicCost: 10000000000000000n,
    maxSupply: 1500n,
    publicStartDate: toTime(2022, 3, 25, 22),
    maxPerTx: 1n,
  },
  {
    name: "Santa Claus Beard",
    description: "Just an overpriced beard, it's not worth it!",
    id: IAttributeMappings['Beard White'],
    contractAddress: "0x2B1be9Cea002C8797a51c3e8ce4C0f64eD1d9835",
    publicCost: 20000000000000000n,
    maxSupply: 2023n,
    publicStartDate: 0,
    maxPerTx: 10n,
  },
]

export const labItemDescriptionListMap = groupByMap(saleDescriptionList, i => i.id)
