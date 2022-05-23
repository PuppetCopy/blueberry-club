import { CHAIN, groupByMap, intervalInMsMap } from "@gambitdao/gmx-middleware"
import { IAttributeMappings, LabItemSaleDescription, SaleType } from "./types"


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
    type: SaleType.Public,
    name: "Santa Claus Hat",
    description: "GBC holders will be able to mint this item for free on Christmas Day\n\nBut, since Christmas date will be far too long for a test, we shall celebrate an early Ho ho ho! Merry Christmas!",
    id: IAttributeMappings['Christmas Hat'],
    contractAddress: "0x8C6f8EA26081d1680F2EF46aaA423131b1E15595",
    publicCost: 10000000000000000n,
    maxSupply: 1500n,
    publicStartDate: toTime(2022, 3, 25, 22),
    maxPerTx: 1n,
  },
  {
    type: SaleType.Public,
    name: "Santa Claus Beard",
    description: "Just an overpriced beard, it's not worth it!",
    id: IAttributeMappings['Beard White'],
    contractAddress: "0x70B61523d2AEB9d43bF54D03e7F5b08C2D1feCcF",
    publicCost: 20000000000000000n,
    maxSupply: 2023n,
    publicStartDate: 0,
    maxPerTx: 10n,
  },
  {
    type: SaleType.Public,
    name: "Avalanche Hoodie",
    description: `A possible partnership could be a GBC Treasury paid promotion\n\none example would be, anyone who mints this item and wears as a profile(on-chain) would be eligible for an air-drop or allowed for an entry to a special event`,
    id: IAttributeMappings["Avalanche Hoodie"],
    contractAddress: "0x4cD7219505506191F3ba65D1A35E3ABc46f6F8A1",
    maxSupply: 1337n,
    publicStartDate: 0,
    publicCost: 0n,
    maxPerTx: 1n,
  },
  {
    type: SaleType.GbcWhitelist,
    name: "Abstract Background",
    description: `GBC Members are whitelisted and can mint on ${new Date(toTime(2022, 3, 7, 22) * 1000).toLocaleString()} . Public Mint is highly delayed`,
    id: IAttributeMappings['Camo Background'],
    contractAddress: "0xfAb4FF61A01e93c336E3ed113E3eFB9143E4Ad0C",
    maxSupply: 100n,
    publicStartDate: toTime(2022, 9, 27, 22),
    publicCost: 10000000000000000n,
    maxPerTx: 10n,
    whitelistStartDate: toTime(2022, 3, 7, 22),
    whitelistMax: 400n,
    whitelistCost: 10000000000000000n
  },
  {
    type: SaleType.whitelist,
    name: "Builder Vest",
    whitelistStartDate: 0,
    whitelistMax: 400n,
    whitelistCost: 0n,
    description: `This vest is only for true builders, whitelist `,
    id: IAttributeMappings['Builder'],
    contractAddress: "",
    maxSupply: 100n,
    publicStartDate: toTime(2022, 3, 8, 22),
    publicCost: 10000000000000000n,
    maxPerTx: 10n,
    whitelist: [
      "0xDfB24A3aEB768F623e3fD50865Cf9A39b90f719b",
      "0x9E7f78EafAEBaf1094202FFA0835157fC5C3ADe0"
    ],
    signatureList: [
      "0xd648781d0748116d90df29c20b08da46386ec30ac3e08c8b2e5996bf618e812a",
      "0x84c123be8234d5d6ace90e19a891527a6ee084d73e434a8c8ecc624d6f1c0175",
    ]
  },
  {
    type: SaleType.Public,
    name: "Fast Food Cap",
    description: "Because every GMX bottom seller needs one (;",
    id: IAttributeMappings["Fast Food Cap"],
    contractAddress: "0xe4db8Ce1308c4E10fEa2c972960fE8AC05E2f263",
    maxSupply: 33n,
    publicStartDate: toTime(2022, 3, 9, 22),
    publicCost: 20000000000000000n,
    maxPerTx: 1n,
  },

]

export const labItemDescriptionListMap = groupByMap(saleDescriptionList, i => i.id)
