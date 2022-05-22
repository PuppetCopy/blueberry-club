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
    contractAddress: "0x8E5aE1a74c048937323212A0122F5942f1D0b033",
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
    contractAddress: "0x36677c08b55E5a281A135213f00D7Ed3Cb7B2211",
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
    contractAddress: "0xCa43C7086728AA9e94551a5C3923AcD4cAc9E54f",
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
    contractAddress: "0x0ADe9672d36d99d5Ced3A8f82276a32D1534716a",
    maxSupply: 100n,
    publicStartDate: toTime(2022, 9, 27, 22),
    publicCost: 10000000000000000n,
    maxPerTx: 10n,
    whitelistStartDate: toTime(2022, 3, 7, 22),
    whitelistMax: 400n,
    whitelistCost: 10000000000000000n
  },
  // {
  //   type: SaleType.whitelist,
  //   name: "Builder Vest",
  //   whitelistStartDate: toTime(2022, 9, 27, 22),
  //   whitelistMax: 400n,
  //   whitelistCost: 0n,
  //   description: `This vest is only for true builders, whitelist `,
  //   id: IAttributeMappings['Builder'],
  //   contractAddress: "",
  //   maxSupply: 100n,
  //   publicStartDate: toTime(2022, 3, 8, 22),
  //   publicCost: 10000000000000000n,
  //   maxPerTx: 10n,
  //   merkleRoot: '0x5646704c207d65e311fb1a8fdde2d329a02af7069e4ce7af08768e0c3a6a45cc'
  // },
  {
    type: SaleType.Public,
    name: "Fast Food Cap",
    description: "Because every GMX bottom seller needs one (;",
    id: IAttributeMappings["Fast Food Cap"],
    contractAddress: "0x9Ce877eE2aaDbCc31b669Bf0d1c9205da9E8135b",
    maxSupply: 33n,
    publicStartDate: toTime(2022, 3, 9, 22),
    publicCost: 20000000000000000n,
    maxPerTx: 1n,
  },

]

export const labItemDescriptionListMap = groupByMap(saleDescriptionList, i => i.id)
