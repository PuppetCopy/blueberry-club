import { CHAIN, groupByMap, intervalTimeMap, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { IAttributeMappings, LabItemSale, SaleType } from "./types"


export const USE_CHAIN = CHAIN.ARBITRUM

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
  saleDuration: intervalTimeMap.MONTH,
  maxMintable: 50
}

export const saleDescriptionList: LabItemSale[] = [
  // {
  //   name: "Lab Flask",
  //   description: `To celebrate the Blueberry Lab, we are offering this Lab Flask to those who have used the Blueberry Lab Testnet.`,
  //   id: IAttributeMappings["Lab Flask"],
  //   contractAddress: "0xac2e53510b7fDD951e04Dd04E6992223Db15fF92",
  //   mintRuleList: [
  //     {
  //       amount: 2,
  //       type: SaleType.private,
  //       cost: 0n,
  //       start: toTime(2022, 5, 7, 22),
  //       transaction: 1,
  //       addressList: [
  //       ],
  //       signatureList: [
  //       ],
  //     }
  //   ]
  // },
  // {
  //   name: "GBC x Giorgio Balbi",
  //   description: `Abstract Generative Background by the Talented Giorgio Balbi.`,
  //   id: IAttributeMappings["GBC x Giorgio Balbi"],
  //   contractAddress: "",
  //   mintRuleList: [
  //     {
  //       amount: 2,
  //       type: SaleType.private,
  //       cost: 0n,
  //       start: toTime(2022, 5, 7, 22),
  //       transaction: 1,
  //       addressList: [

  //       ],
  //       signatureList: [
    
  //       ],
  //     },
  //     {
  //       amount: 20,
  //       type: SaleType.Public,
  //       cost: 10000000000000000n,
  //       start: toTime(2022, 5, 7, 22),
  //       transaction: 1
  //     }
  //   ]
  // },
  {
    name: "GLP Shirt",
    description: "The perfect shirt for chilling out while GLP gives you passive income. Free claim for the Blueberry Lab Day 1",
    id: IAttributeMappings["GLP Shirt"],
    contractAddress: "0xe1822ABcF26A86151651449d7122220dC07d8301",
    mintRuleList: [
      {
        amount: 800,
        type: SaleType.holder,
        walletMintable: 50,
        cost: 0n,
        start: toTime(2022, 5, 7, 22),
        transaction: 50
      }
    ]
  },

]

export const labItemDescriptionListMap = groupByMap(saleDescriptionList, i => i.id)
