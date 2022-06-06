import { CHAIN, groupByMap, intervalTimeMap, unixTimestampNow } from "@gambitdao/gmx-middleware"
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
  distributionPeriod: intervalTimeMap.DAY7,
  activityPeriod: intervalTimeMap.MONTH,
}



const toTime = (...params: Parameters<typeof Date.UTC>) => Math.floor(Date.UTC(...params) / 1000)

export const saleConfig = {
  saleDuration: intervalTimeMap.MONTH, // 2 weeks
  maxMintable: 50
}

export const saleDescriptionList: LabItemSale[] = [
  {
    name: "Builder Vest",
    description: `This vest is only for true builders, whitelist `,
    id: IAttributeMappings['Builder'],
    contractAddress: "0xcDE625CB5d633E64d0A0b716516b224dd2c9fA50",
    mintRuleList: [
      {
        walletMintable: 5,
        type: SaleType.holder,
        cost: 10000000000000000n,
        start: unixTimestampNow(),
        amount: 20,
        transaction: 5
      }
    ]
  },
  {
    name: "Santa Claus Hat",
    description: "GBC holders will be able to mint this item for free on Christmas Day\n\nBut, since Christmas date will be far too long for a test, we shall celebrate an early Ho ho ho! Merry Christmas!",
    id: IAttributeMappings['Christmas Hat'],
    contractAddress: "0x8fce85C9DC0D77205B07BAd41C1fe43033738CDd",
    mintRuleList: [
      {
        amount: 4,
        type: SaleType.Public,
        cost: 10000000000000000n,
        start: unixTimestampNow(),
        transaction: 1
      }
    ]
  },
  {
    name: "Santa Claus Beard",
    description: "Just an overpriced beard, it's not worth it!",
    id: IAttributeMappings['Beard White'],
    contractAddress: "0xd4988B8fd036986eE1Bd5de223144c4C74629683",
    mintRuleList: [
      {
        amount: 133,
        type: SaleType.Public,
        cost: 10000000000000000n,
        start: unixTimestampNow() + intervalTimeMap.HR4,
        transaction: 10
      }
    ]
  },
  {
    name: "Avalanche Hoodie",
    description: `A possible partnership could be a GBC Treasury paid promotion\n\none example would be, anyone who mints this item and wears as a profile(on-chain) would be eligible for an air-drop or allowed for an entry to a special event`,
    id: IAttributeMappings["Avalanche Hoodie"],
    contractAddress: "0xbAcEcd0A65056D72B84887a801E02a8CC81d651f",
    mintRuleList: [
      {
        amount: 2023,
        type: SaleType.Public,
        cost: 10000000000000000n,
        start: unixTimestampNow(),
        transaction: 10
      }
    ]
  },
  {
    name: "Abstract Background",
    description: `GBC Members are whitelisted and can mint on ${new Date(toTime(2022, 3, 7, 22) * 1000).toLocaleString()} . Public Mint is highly delayed`,
    id: IAttributeMappings['Camo Background'],
    contractAddress: "0x1D2cbA6e8bF6FB3c263101c3e69514f838B6Fcf6",
    mintRuleList: [
      {
        amount: 2,
        type: SaleType.private,
        cost: 3000000000000000n,
        start: 1654537183,
        transaction: 1,
        addressList: [
          "0xDfB24A3aEB768F623e3fD50865Cf9A39b90f719b",
          "0x9E7f78EafAEBaf1094202FFA0835157fC5C3ADe0"
        ],
        signatureList: [
          '0x9265e3e12d26dd379cc4671597a38c762335d88df7a6caefbdc3b6c152bb62d7',
          '0xaf69f858d5c312b0dc80fdd76cdced12c2c631196704477ea48aac8d4e489d11'
        ],
      },
      {
        amount: 2,
        type: SaleType.Public,
        cost: 1000000000000000n,
        start: unixTimestampNow(),
        transaction: 10
      },
    ]
  },

  {
    name: "Fast Food Cap",
    description: "Because every GMX bottom seller needs one (;",
    id: IAttributeMappings["Fast Food Cap"],
    contractAddress: "0x759D662D2842454Ad0234d20E0b5e9c1E76754CA",
    mintRuleList: [
      {
        amount: 33,
        type: SaleType.Public,
        cost: 20000000000000000n,
        start: unixTimestampNow(),
        transaction: 2
      }
    ]
  },

]

export const labItemDescriptionListMap = groupByMap(saleDescriptionList, i => i.id)
