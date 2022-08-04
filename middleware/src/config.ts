import { CHAIN, groupByMap, intervalTimeMap } from "@gambitdao/gmx-middleware"
import { parseEther } from "ethers/lib/utils"
import { IAttributeMappings, LabItemSale, SaleType } from "./types"


export const USE_CHAIN = CHAIN.ARBITRUM

export const GLOBAL_W3P = 'wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'
export const GLOBAL_W3P_HTTP = 'https://arbitrum-mainnet.infura.io/v3/6d7e461ad6644743b92327579860b662'

export const GLOBAL_W3P_ARBITRUM = 'wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'
export const GLOBAL_W3P_AVALANCHE = 'https://api.avax.network/ext/bc/C/rpc'

export const MINT_WHITELIST_START = Date.UTC(2021, 11, 5, 22, 0, 0)
export const MINT_PUBLIC_START = Date.UTC(2021, 11, 7, 22, 0, 0)


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
  {
    name: "Juicy Head",
    description: "Some do six packs to wise cracks instead I’m drinking my blueberry juice packs while I  kickback preparing for the GMX counter attack!",
    id: IAttributeMappings["Juice Head"],
    mintRuleList: [
      {
        supply: 50,
        type: SaleType.holder,
        cost: parseEther('0.05').toBigInt(),
        contractAddress: "0xeD2381332e20f21D2AC2eD17F338D92D7d3De351",
        start: toTime(2022, 7, 10, 8),
        finish: toTime(2022, 8, 10, 8),
        accountLimit: 1
      }
    ]
  },
  {
    name: "Smoky",
    description: "Elevation of my elation from my botanical cultivation brings about my intellectual stimulation. Lighters up berries, it's the GMX generation",
    id: IAttributeMappings.High,
    mintRuleList: [
      {
        supply: 82,
        type: SaleType.holder,
        cost: parseEther('0.0420').toBigInt(),
        contractAddress: "0x576bC7D95BddedDFcF817AdA9496f9674848Ab54",
        start: toTime(2022, 7, 8, 8),
        finish: toTime(2022, 8, 8, 8),
        accountLimit: 1
      }
    ]
  },
  {
    name: "Noodles",
    description: "Put these soggy little wiggles in your mouth and imagine how amazing the taste of success will make u feel. Slurping up crypto and letting it become one within. You need these noodles thriving in your little bustard body when you extract pure blueberry gold in the next bull run! Time to shine little berry, time to shine.",
    id: IAttributeMappings.Noodles,
    mintRuleList: [
      {
        supply: 75,
        type: SaleType.holder,
        cost: parseEther('0.04').toBigInt(),
        contractAddress: "0x8CcC075E1c845FB3e0caBf04aF537171DF66b3A6",
        start: toTime(2022, 6, 9, 18),
        finish: toTime(2022, 7, 9, 18),
        accountLimit: 3
      }
    ]
  },
  {
    name: "GBC x Wine Bottle Club",
    description: `For all members present at the Wine Bottle Club x GBC event in Bordeaux`,
    id: IAttributeMappings["GBC x Wine Bottle Club"],
    mintRuleList: [
      {
        supply: 11,
        type: SaleType.whitelist,
        cost: 0n,
        nonce: 0,
        contractAddress: "0x7Cae36E0b9b745c1e0C5C9966a6101d57B4B991e",
        start: toTime(2022, 5, 24, 18),
        finish: toTime(2022, 6, 24, 18),
        accountLimit: 1,
        addressList: [],
        signatureList: [],
      }
    ]
  },
  {
    name: "Summer Buoy",
    description: "The perfect accessory for summer time",
    id: IAttributeMappings["Summer Buoy"],
    mintRuleList: [
      {
        supply: 77,
        type: SaleType.holder,
        cost: parseEther('0.03').toBigInt(),
        contractAddress: "0x1695819e85B26F31A2a89f60152C3A1151D865C1",
        start: toTime(2022, 5, 22, 18),
        finish: toTime(2022, 6, 22, 18),
        accountLimit: 2
      }
    ]
  },
  {
    name: "Fast Food Cap",
    description: "this cap ensures you a job security you never wanted, it has been told to have magical powers to turn things around when you least expect it",
    id: IAttributeMappings["Fast Food Cap"],
    mintRuleList: [
      {
        supply: 99,
        type: SaleType.holder,
        cost: 0n,
        contractAddress: "0x6b5D7E536BB5c36B8fFb6C004F156cE1eE0da72F",
        start: toTime(2022, 5, 25, 18),
        finish: toTime(2022, 6, 25, 18),
        accountLimit: 1
      }
    ]
  },


  {
    name: "Lab Flask",
    description: `To celebrate the Blueberry Lab, we are offering this Lab Flask to those who have used the Blueberry Lab Testnet.`,
    id: IAttributeMappings["Lab Flask"],
    mintRuleList: [
      {
        supply: 171,
        type: SaleType.whitelist,
        cost: 0n,
        nonce: 0,
        contractAddress: "0x555de9Ced3F1d854751b4D3d3676Cfa3bA54BDFb",
        start: toTime(2022, 5, 7, 22),
        finish: toTime(2022, 5, 20, 16),
        accountLimit: 1,
        addressList: [],
        signatureList: [],
      }
    ]
  },
  {
    name: "GBC x Giorgio Balbi",
    description: `Abstract Generative Background by the Talented Giorgio Balbi.`,
    id: IAttributeMappings["GBC x Giorgio Balbi"],
    mintRuleList: [
      {
        supply: 100,
        type: SaleType.whitelist,
        cost: 0n,
        nonce: 0,
        contractAddress: "0x89991C609A04970141d0a88e6179f862b34c0303",
        start: toTime(2022, 5, 7, 22),
        finish: toTime(2022, 5, 20, 16),
        accountLimit: 1,
        addressList: [],
        signatureList: [],
      }
    ]
  },
  {
    name: "GLP Shirt",
    description: "The perfect shirt for chilling out while GLP gives you passive income. Free claim for the first Blueberry Lab Item",
    id: IAttributeMappings["GLP Shirt"],
    mintRuleList: [
      {
        supply: 800,
        type: SaleType.holder,
        cost: 0n,
        contractAddress: "0xe1822ABcF26A86151651449d7122220dC07d8301",
        start: toTime(2022, 5, 7, 22),
        finish: toTime(2022, 6, 7, 22),
        accountLimit: 50
      }
    ]
  },

]

export const labItemDescriptionListMap = groupByMap(saleDescriptionList, i => i.id)
