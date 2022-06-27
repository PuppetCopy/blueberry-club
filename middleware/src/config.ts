import { CHAIN, groupByMap, intervalTimeMap } from "@gambitdao/gmx-middleware"
import { parseEther } from "ethers/lib/utils"
import { IAttributeMappings, LabItemSale, SaleType } from "./types"


export const USE_CHAIN = CHAIN.ARBITRUM_RINKBY

export const GLOBAL_W3P = 'wss://arb-rinkeby.g.alchemy.com/v2/lQJmbKMHodW3eT3FdEQdkzk5S6gQ5-Lh'
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
    name: "GBC x Wine Bottle Club",
    description: `For all members present at the Wine Bottle Club x GBC event in Bordeaux`,
    id: IAttributeMappings["GBC x Wine Bottle Club"],
    mintRuleList: [
      {
        supply: 11,
        type: SaleType.whitelist,
        cost: 0n,
        nonce: 0,
        contractAddress: "0x7F786004a3f5A0d57E78DF4E7A3667f750e9b640",
        start: toTime(2022, 5, 24, 18),
        finish: toTime(2022, 6, 24, 18),
        accountLimit: 1,
        addressList: [
          "0x100c9e74D265767D308A15d39DF8A6Db91580cea",
          "0x03430A8D4997fC42035c51EE052EC776bc980495",
          "0xc30941B621BB69Eb43B0DdCdB00AFFDa95a52581",
          "0x03fbe58b62d538847cac7BB6026E4B03d4aE9D3B",
          "0x5b1a073657E4B2B14Ff4200428d7733a32F3B3D0",
          "0xE99bc74DB1dACca4b6CB785029c4738D184001C5",
          "0xA4E8b4EEc97643676ed87f413e9A63Dcf3f4D985",
          "0x8642214d3cb4Eb38EE618Be37f78DD74a3093869",
          "0xF6B9d7E76F982Bc326464785Eda3360aACbDc784",
          "0x0fc59e181244aC9bA1DaAC47fc4C7888FfefA391",
          "0x4fa34185f848F83449706bF37b0A59F8d0c73D1a",
        ],
        signatureList: [
          [
            '0x5bc530386e5942914e3ba5a4aef560afba7194dfb4c10e299db5ce7b8198b84e',
            '0x9409592193eb65e98842d9c23dfbe92c691736320a088baf3db45d153f6a56fc',
            '0x709b6a19e76cea2230c35dbd07c989276643d6f6634be8c147f13f55ed7d567c',
            '0x2a3d55fe223602cd2d5aa0be2538966c1daaeb40ff53b4b24c197af8b63bb89a'
          ],
          [
            '0xaecbdf6382fe3d2dcb585bfc7cd74e7c00e082cbe105801d0fae5daec69bb652',
            '0xf3e3aa7a68d8b7c9f1fe4a36995227c22a13d09d7e3e1b21b5de7903bdbcddec',
            '0x383b4b3a9915074e1d0be7ddcf131150fb3423bbf8e824523e917425568383d9',
            '0x2a3d55fe223602cd2d5aa0be2538966c1daaeb40ff53b4b24c197af8b63bb89a'
          ],
          [
            '0x8a1d916513eda685af2e5f18403b357c5b0d320a26a40baaaf6b9bf5ded1cc2a',
            '0x98826e14cd7dbe81d283ca542524ccf3b678e5ae5cee15a9fbeea9e383fb5b32',
            '0x383b4b3a9915074e1d0be7ddcf131150fb3423bbf8e824523e917425568383d9',
            '0x2a3d55fe223602cd2d5aa0be2538966c1daaeb40ff53b4b24c197af8b63bb89a'
          ],
          [
            '0xc6c662705851c515348646051cd8b7ed855e2ccd9c71a93b43f204952c7847d4',
            '0xcd9b1d2e3ddaac6784b8420a6341a8c3c343a48db981567da052792049cd0b40',
            '0x0df6208b9fe33b0cf4b37b599b6da95b32bcaa51561ff64023c1a227417d7dd3'
          ],
          [
            '0x893f60a58b919637310a5a64678d14b53457d6237f7a670c0a98542d180f1d96',
            '0x9530e82fd53cc5fadcff1a2820c33aa4a511bcc2e12f22cfc7de3a87ba2d4fa9',
            '0x709b6a19e76cea2230c35dbd07c989276643d6f6634be8c147f13f55ed7d567c',
            '0x2a3d55fe223602cd2d5aa0be2538966c1daaeb40ff53b4b24c197af8b63bb89a'
          ],
          [
            '0x47404e83b34356809e7c0c174e770e82460eacd441a048b7b53d04b8f8acc695',
            '0x0df6208b9fe33b0cf4b37b599b6da95b32bcaa51561ff64023c1a227417d7dd3'
          ],
          [
            '0x9c516f2a322d34dddee488c748c1aabfb2d07cc2da9bb1563f907d5153c390d1',
            '0x98826e14cd7dbe81d283ca542524ccf3b678e5ae5cee15a9fbeea9e383fb5b32',
            '0x383b4b3a9915074e1d0be7ddcf131150fb3423bbf8e824523e917425568383d9',
            '0x2a3d55fe223602cd2d5aa0be2538966c1daaeb40ff53b4b24c197af8b63bb89a'
          ],
          [
            '0xc65fe5e22df2ed56968b553aa4abf29284df338abf2ef52426e5c94da94258a2',
            '0xcd9b1d2e3ddaac6784b8420a6341a8c3c343a48db981567da052792049cd0b40',
            '0x0df6208b9fe33b0cf4b37b599b6da95b32bcaa51561ff64023c1a227417d7dd3'
          ],
          [
            '0x7f663acc9211b1b3da911fadccc35c7a2b4e78a163dd723b99ac86280089bdd6',
            '0x9530e82fd53cc5fadcff1a2820c33aa4a511bcc2e12f22cfc7de3a87ba2d4fa9',
            '0x709b6a19e76cea2230c35dbd07c989276643d6f6634be8c147f13f55ed7d567c',
            '0x2a3d55fe223602cd2d5aa0be2538966c1daaeb40ff53b4b24c197af8b63bb89a'
          ],
          [
            '0x6ec9197b3b49d9202a18b2f40b802afb3ead402ba3166c6682fc75a224e1f497',
            '0x9409592193eb65e98842d9c23dfbe92c691736320a088baf3db45d153f6a56fc',
            '0x709b6a19e76cea2230c35dbd07c989276643d6f6634be8c147f13f55ed7d567c',
            '0x2a3d55fe223602cd2d5aa0be2538966c1daaeb40ff53b4b24c197af8b63bb89a'
          ],
          [
            '0xbae78a074c3b4fcb832ce1599afe8ec3ad529b44520912ba7a68993d9cb5aff6',
            '0xf3e3aa7a68d8b7c9f1fe4a36995227c22a13d09d7e3e1b21b5de7903bdbcddec',
            '0x383b4b3a9915074e1d0be7ddcf131150fb3423bbf8e824523e917425568383d9',
            '0x2a3d55fe223602cd2d5aa0be2538966c1daaeb40ff53b4b24c197af8b63bb89a'
          ]
        ],
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
        cost: parseEther('0.1').toBigInt(),
        contractAddress: "0x038e7429d0Cf1f3d4ed89BD2146eB9deD8A36955",
        start: toTime(2022, 5, 11, 18),
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
        contractAddress: "0x05C86cF879467cc18Bc5c95F5bB74d8079ccF52d",
        start: toTime(2022, 5, 20, 18),
        finish: toTime(2022, 6, 20, 18),
        accountLimit: 1
      }
    ]
  },

]

export const labItemDescriptionListMap = groupByMap(saleDescriptionList, i => i.id)
