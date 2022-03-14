import { CHAIN, groupByMap } from "@gambitdao/gmx-middleware"
import { LabItemDescription } from "./types"


export const USE_CHAIN = CHAIN.ARBITRUM_RINKBY
export const GLOBAL_W3P = 'wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'
export const GLOBAL_W3P_AVALANCHE = 'https://api.avax.network/ext/bc/C/rpc'

export const GBC_CONTRACT = '0xa1C6bf3D592221081f26903477c5967649516343'
export const LAB_ITEMS_CONTRACT = '0x88f68f52F43bB17138a8d367650575D52c413069'

export const TREASURY_ARBITRUM = '0xde2dbb7f1c893cc5e2f51cbfd2a73c8a016183a0'
export const TREASURY_AVALANCHE = '0x753b4769154fd100ee763e927305d5b3131dbc8e'
// export const TREASURY = '0x9E7f78EafAEBaf1094202FFA0835157fC5C3ADe0'

export const MINT_WHITELIST_START = Date.UTC(2021, 11, 5, 22, 0, 0)
export const MINT_PUBLIC_START = Date.UTC(2021, 11, 7, 22, 0, 0)
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000"


export const PROJECT = {
  NAME: 'Blueberry Club',
  SYMBOL: 'GBC',
  BASE_URI: '',
}


export const MINT_MAX_SUPPLY = 10000
export const MINT_PRICE = 30000000000000000n
export const USD_PRECISION = 10n ** 18n


export const labItemDescriptionList: LabItemDescription[] = [
  {
    contractAddress: "0xa20f2530d511fb1d0e64c89f7a443b3edafbc57f",
    name: "Avalanche Hoodie",
    description: "yadda yadda",
    id: 10,
    maxSupply: 100,
    saleDate: Date.UTC(2022, 2, 12, 22, 0, 0),
    mintPrice: 30000000000000000n,
  },
  {
    contractAddress: "0xa20f2530d511fb1d0e64c89f7a443b3edafbc57f",
    name: "Fast Food Cap",
    description: "yadda yadda",
    id: 20,
    maxSupply: 100,
    saleDate: Date.UTC(2022, 2, 12, 22, 0, 0),
    mintPrice: 30000000000000000n,
  }
]

export const labItemDescriptionListMap = groupByMap(labItemDescriptionList, i => i.id)