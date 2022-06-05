import { CHAIN, groupByMap, intervalInMsMap } from "@gambitdao/gmx-middleware"
import { IAttributeMappings, LabItemSale, SaleType } from "./types"


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

export const saleConfig = {
  saleDuration: intervalInMsMap.DAY7 * 2, // 2 weeks
  maxMintable: 50
}

export const saleDescriptionList: LabItemSale[] = [
  {
    name: "Builder Vest",
    description: `This vest is only for true builders, whitelist `,
    id: IAttributeMappings['Builder'],
    contractAddress: "0xac2e53510b7fDD951e04Dd04E6992223Db15fF92",
    mintRuleList: [
      {
        walletMintable: 5,
        type: SaleType.holderWhitelist,
        cost: 10000000000000000n,
        start: toTime(2022, 5, 4, 22),
        amount: 5,
        transaction: 1
      }
    ]
  },
  {
    name: "Santa Claus Hat",
    description: "GBC holders will be able to mint this item for free on Christmas Day\n\nBut, since Christmas date will be far too long for a test, we shall celebrate an early Ho ho ho! Merry Christmas!",
    id: IAttributeMappings['Christmas Hat'],
    contractAddress: "0xA6C7405Abfc4F0fEf4582De32E0a8f77cDbD90fe",
    mintRuleList: [
      {
        amount: 4,
        type: SaleType.Public,
        cost: 10000000000000000n,
        start: toTime(2022, 3, 25, 22),
        transaction: 1
      }
    ]
  },
  {
    name: "Santa Claus Beard",
    description: "Just an overpriced beard, it's not worth it!",
    id: IAttributeMappings['Beard White'],
    contractAddress: "0x8330540bE7B1710BD4449882397C53513C1Ee177",
    mintRuleList: [
      {
        amount: 500,
        type: SaleType.Public,
        cost: 10000000000000000n,
        start: 0,
        transaction: 10
      }
    ]
  },
  {
    name: "Avalanche Hoodie",
    description: `A possible partnership could be a GBC Treasury paid promotion\n\none example would be, anyone who mints this item and wears as a profile(on-chain) would be eligible for an air-drop or allowed for an entry to a special event`,
    id: IAttributeMappings["Avalanche Hoodie"],
    contractAddress: "0xdd801Fe5002d84Cd5931AfBb8bBdd6Ae6b939E08",
    mintRuleList: [
      {
        amount: 2023,
        type: SaleType.Public,
        cost: 10000000000000000n,
        start: 0,
        transaction: 10
      }
    ]
  },
  {
    name: "Abstract Background",
    description: `GBC Members are whitelisted and can mint on ${new Date(toTime(2022, 3, 7, 22) * 1000).toLocaleString()} . Public Mint is highly delayed`,
    id: IAttributeMappings['Camo Background'],
    contractAddress: "0x09e25b9F5916B15c827389512678C730fA96a7A2",
    mintRuleList: [
      {
        amount: 2,
        type: SaleType.whitelist,
        cost: 3000000000000000n,
        start: 0,
        transaction: 1,
        addressList: [
          "0xDfB24A3aEB768F623e3fD50865Cf9A39b90f719b",
          "0x9E7f78EafAEBaf1094202FFA0835157fC5C3ADe0"
        ],
        signatureList: [
          "0xd648781d0748116d90df29c20b08da46386ec30ac3e08c8b2e5996bf618e812a",
          "0x84c123be8234d5d6ace90e19a891527a6ee084d73e434a8c8ecc624d6f1c0175",
        ],
      },
      {
        amount: 2,
        type: SaleType.Public,
        cost: 1000000000000000n,
        start: 0,
        transaction: 10
      },
    ]
  },

  {
    name: "Fast Food Cap",
    description: "Because every GMX bottom seller needs one (;",
    id: IAttributeMappings["Fast Food Cap"],
    contractAddress: "0x326c4d5CF8a89E4006ec7cc717EDcd6cf4A6a46A",
    mintRuleList: [
      {
        amount: 33,
        type: SaleType.Public,
        cost: 20000000000000000n,
        start: toTime(2022, 3, 9, 22),
        transaction: 2
      }
    ]
  },

]

export const labItemDescriptionListMap = groupByMap(saleDescriptionList, i => i.id)
