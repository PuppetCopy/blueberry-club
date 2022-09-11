import { CHAIN, groupByMap, intervalTimeMap } from "@gambitdao/gmx-middleware"
import { parseEther } from "ethers/lib/utils"
import { IAttributeMappings, LabItemSale, SaleType } from "./types"


export const USE_CHAIN = CHAIN.ARBITRUM

export const GLOBAL_W3P = 'wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'
export const GLOBAL_W3P_HTTP = 'https://arbitrum-mainnet.infura.io/v3/6d7e461ad6644743b92327579860b662'

export const GLOBAL_W3P_ARBITRUM = 'wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'
export const GLOBAL_W3P_AVALANCHE = 'https://api.avax.network/ext/bc/C/rpc'

export const BLUEBERRY_REFFERAL_CODE = '0x424c554542455252590000000000000000000000000000000000000000000000'

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
  // {
  //   name: "Uzumaki",
  //   description: "The BLUEBERRY referral code is show stoppin, So the NFT’s are droppin, These electrified berries be poppin, Got their hands karate choppin.",
  //   id: IAttributeMappings.Uzumaki,
  //   mintRuleList: [
  //     {
  //       supply: 166,
  //       type: SaleType.whitelist,
  //       cost: 0n,
  //       addressList: ["0x04d52e150E49c1bbc9Ddde258060A3bF28D9fD70", "0xbeaa65e2098213a87671620974a41515df17c23d", "0x94a0321182f95b4b54537a6dd78df5750df3513c", "0x608c4fed777fab2cef1ab18d94783acfdcf87834", "0xf6b9d7e76f982bc326464785eda3360aacbdc784", "0x401c0f82117b3262b79a7697bf98bbd7c0d4e36c", "0xee2bfe340492e7e1155b8ffcc0efd357f18a2336", "0x1501cf2e9afd2624a485e675427609a1932772ec", "0xcff929f8d70fcf31bb4c6012a77a30435cc56ab4", "0x206d7f45fae22d9926bdb2169dce6e52ed33828f", "0xda63f22bf4bdc0b88536bdf4375fc9e14862abd8", "0x88bf5a2e82510847e5dcbf33f44a9f611f1c1df5", "0xd6b9608036f292d218ba6cdc11f3ee4a0cbb1b88", "0x4594de64d7ffcabf324d6420f186b6325bce5c64", "0xf790bb9a7221c9a3e9983f3a6c23f6048002a529", "0xc665a50ba7dff0f6af16c3f00ee3d42a22ed04ff", "0x213ce00b63c94e34e42c41725f409dbc9d9ec135", "0xbf1dcbe58b5a600a8c0134cec1cbccff34ffbdef", "0x496563b1fa5f7c97b91d21cf7edfdc7d49bc0443", "0xe8cfae1a1d13cda253ed7ffcb7a766b412bdce1b", "0xd01b32a6975ee4ddd548cfc8019ebc36bf230bb2", "0xbc8819c1821bc52b5d30d2dd52f0cb6110510005", "0x66029401dc14079a1b0cdbb77d6403cd2df27562", "0xb8872193dc7e8b604101896864ab47764353bc2d", "0x658846200793904e49c3a157698f5c1c7aaa8c8f", "0x6f50f30e148b0aec9a10706b2784fc596136384c", "0xc23203e8ad67fb13388bf58d513fb42b490c9dc3", "0xcf1167710fe297b3646949556095214059469997", "0xc95d4bceb1405580a5e38107f1477ea98ad8ba6a", "0xdd011bc8d5f5b9c716e711b515a044346e4104c6", "0x581de43b0273915f61d015e394d2c6af1f9ce8e6", "0xf4a8af1a1a4994cd3417bb1c7e562b276680dcea", "0xc693b4ffb338579467a541b2bf267b1955870920", "0xbc5bacd70f723c82c4b43c099e46cc668667306c", "0x64e53300c0582cb80f32a702b87a27bb29f8b15c", "0xdf0a13a21cb06383fedda3b469e502bf0d60f602", "0x7a80c14098e7c9ab37b6c8b6a041823ea9d5afb4", "0x0e873c65d83c29918a4e975d234614184619356f", "0x0936397c81dba1e47ec3828e1b025e507d1d6b38", "0x2c9c3393156329641b11a8132e013edbbb0f087c", "0xaff5407734cb3f00f37c8bfaeae4663601101ee9", "0xa0a2438c07fe89fda06d13cd78a5bacf78bfe908", "0x19a648cb41e2944f4826d86712fbf3b0a19e5fa5", "0x84788abfe3c785a1dab5f81e35e9eaeb943208a7", "0xd300ebc6f8829f6049f6d600ff453a291cbf373f", "0xb6a47f8ed6722b7ab9d7342e4d41f202b1401e40", "0x9774e1902a8c4c6df1679d8f7ec7ce2cfc292987", "0x5e802926696c002dd7d87c823fb8e8c615c5f7af", "0xe270b4149d1ffd10cde93083a0e41081a279ddd1", "0x9f1cfc94fec8826b7e546cb77b6f7c2707b2bf98", "0xa4eb13834f23110eda247a286318b0ec9c159520", "0x65857132b8acbb2f849d70a4b8950caea42a43ac", "0xa04275c10f39e8675a34e147e2ef78d35129f2b6", "0xf2fc3ef6f68ec973485175912418ad246aa9dc7f", "0xefa44eefd723f1e914c1d75575e57ba16cff1a75", "0x6bc8417f1716de63445ff73b6eb99ba949c8b0b1", "0x183b55b55127d35d3424e838aad045692045a144", "0xaa93840c66058f61814192742dbc4f3f8346c16b", "0x0ec17322313209a2f6c04b5cf8dacac78b2383b2", "0xff0db36bdf740ce4190892e0d930bc411420ef44", "0x749558a1bf79102db6e4b7ca69fe334d0a711846", "0x72a2da3dd2f9e29c6d11aca62834306e6122b41f", "0xe20b6fd071415d60d0700222c0f8b7e37f11de76", "0x35689dc33bb8e1a1dcd0b767b28bbc0cc53f3298", "0x0fcb48a69043e4d480da11f4196c3fa0fde3e39f", "0x59b9fac77b64dcc0006207a2a41d90d96b3bc301", "0x8243f41b976db93db52190566c00fa35ab60302b", "0xfb9fdb89cdd1bef05e6b33631af914948e1b33ac", "0xc30941b621bb69eb43b0ddcdb00affda95a52581", "0x33d1b1855d2638ae4f535cc408d7397aa7f92f26", "0xdcc2729bf519b2824a7840617ce15e6ce41a54df", "0x7cc38a05436c19b6bbc6f36c319e0b88bfc8b71a", "0x31ea2730a76c7d480bba0267eb91d02a3087ea88", "0xd34b36c8017481cde1e8e11039bc717b4bc93a2f", "0x805b066bad79cebfd31461fe42ab016de6b2b610", "0xb0331b22161ca290a15f825a29c008dcb5e1ff68", "0x83ac69eb7510d3aff317791890741cdefe7e6c0b", "0x3326a724606cd3f6deb442546738123a4a2336aa", "0xe21755b8c254bdcf32eefb1451d932c296054a25", "0xc2f39bfcdee4c4c33359edba8fb3c4cfa044e8fb", "0x0130f3a1b787ecbcacfe5af1f4fb50b97225d14c", "0x22f154a17eb7faa9423a2f9e5dbbe0f4e32c617f", "0xf61b0ea2340f84b97c29bae53d23b68dea3352df", "0x1ea2a806f60d3abd361b2e9ec992ba7b85258343", "0xb4683dffed6dcf3f3c5c046c2592880f0b4f3fb2", "0xd46e4bc5cf4e6285f2982a1b005771613ad40a7d", "0x1b1a4fb64b5bb26dbd5a4b8a291e4de1bd5d58f9", "0xbeca610feec013a9707476b870fd8967ee00ce08", "0x1f2aac54e7f2d001572571980664aa2185aff164", "0xa75fb3bd645a02b59a9963c3cc12f34dc86b9660", "0xae33a2226177dfea7b8d9eac3d9aafa72f93b2a9", "0x9ea7d921fac87095e3abbc3f16bcfc2db79ef926", "0x32759f682532dc6de41841b9fded23e136b1c5ff", "0xa572a13ee1ce16a386ac995db365d949cba6f9d1", "0xbd5f0898854cb50874988304f198e44c945ce031", "0x8dc41f0bdfe880767002e664158152c868a187d9", "0xcc4986c32266d2493582b27b896968e4b133b9ef", "0xab8c87fdc4e1f809b0b19fce909239c6c2f431e9", "0x2d054602f39ee2285fdde7300753e9484d42adbd", "0x38fc6b91adad8dc5eee48f974981601727dceb6a", "0x98f2319afb3e95d05d90fe5720f925dc17dec675", "0x4853f81413eeff3c53baef6e9efe7383ac6a24fd", "0x3026f81989a1d52f4755051c6d8eba1280efb03c", "0x761ef130fbae97ac7a2cf252a41b3015347a55d3", "0x2f45724d7e384b38d5c97206e78470544304887f", "0xf18781657139a09dfb2cb8f9cfe75337338af929", "0xfcc4e9f8d0c1d6b91982064dab569c739fe3d14e", "0xd1376fe1330752531fbd956fc57e6c1a11d5259e", "0x92cbd1b38377fa881f749e6b190045903ce7f763", "0x8f3093416640d0e4ef12cd9e9be9115d6dff6c6e", "0x6104a3a414a49ad7fd362a50e38abbd4ef0dd877", "0xd9955789f7094b6c0bd5f7e7acfb046520a6a85c", "0xd2a4227f6490e7a365e3d887c2b14f687d181f76", "0x83dcf354c365dd883eb18430d87354ece6700fcd", "0x863e89758ff6918461b18d7cfe0e6b4e1d333285", "0xb0340da8d030f9ea6afa0095a7d9f13fcd44d81c", "0x4fc9f6c4dbcf314f5e9e9f1b73cef81faf32ec1d", "0x492261c62c8f0e1783b6f3e60d5c03e2e532f167", "0x9d57e8fc7198a9afe31f7cbffd350fd7a6ae6928", "0x30ac049d85bff91c71cbe30d67c4aea00ce6dbdd", "0x0fc59e181244ac9ba1daac47fc4c7888ffefa391", "0xd2be832911a252302bac09e30fc124a405e142df", "0xf7a0dede29b15c25a6ac9557beee6a393eced3e1", "0xd0d9e3505349bc945a414a6ec8ff8bcadabf20e3", "0x2f09ab324833f632cf0f996f1bc094bdd9eca049", "0xbdae0e501c69791e080ac2e25a5591070e424bea", "0x541aa1c1eef7ca719926865e0f89336f7ffc0e05", "0xbf73623186411b1d26cd34957b7e5be6d9fd3b44", "0xe0171dad0a60c2ff0612655fa57218aa111c10b1", "0xcc51f354f2a2597a752bbd168996d1079a772242", "0xc9c0c7e9d6423a61a82a872b2496f685212e0a56", "0x3b58bf4c830dd93233c8afc11e6735a58e8b1769", "0x58ffd1447e30ede4f53f9ebbc7e8c93861c59e62", "0x0c8bb8d815a13feb15a5293af2d40453238426d8", "0xe5656d9cf64ff41ceb7e26e819d70df8b66d1595", "0x75542f7feb7043599b2a0907757e59da6998fa20", "0xd2a7d8ec1466cb3c531eac23819ca9fc249f35d8", "0xa77173371004cbd7312ba48147df9609ce5b984a", "0xb7ce9bb8ccaec7a874cac8a010e24ea0b1d6e9df", "0x041fa6a56cc203b210dbad9ee45dc08c1f88aba3", "0x2711b8bcc1166ea0d10f53ab099f05810554bc6f", "0x5ae83e49f32a8003a821b77608267e743d2b0731", "0xe5be6cac5d3d90288ac65976277afdec0eb74e1f", "0x0feeb7936a806bf2006eb3d73d3552eaf4300fec", "0x6817cb400e64712d08c11c46c89cdc9c0faf7438", "0x8770e06e75daa83c5cb2129bfd0431f9e1da4c84", "0x2feaed2359705332d607b4353e6d67618f3f23a9", "0xed38ea368888788a0d5939872676b5700e2fc52b", "0x244b59ceaa1149d33ca72ddb172beed2b4026a52", "0x2b77b658be061608cb28e321910c9b5d0a99f15e", "0x669a623c4851860721045cdf3337d556ed4341a1", "0xedb06c2fc7ca9ebbcf83a3301482b79214e26404", "0x3f9d386eeb91304ab65899b567ee8756d3298d40", "0x1133073a32df0f80ef34ad8a41015a664a1fbaba", "0x06acdcd3c5c54201a322b6f87ba4dd7869a73bd9", "0x7cfa9d7b8f302347ae557dd38b77fa110bbc1551", "0xa7f9e4f521f6a023af041cc8097d12c4517bd32d", "0x350cbb6e8cb8424f15d5ee211dffbede125d8268", "0x83b6f0924a20cda59266de250e42fff852588bec", "0xd2bfcc79931935ed881fc49f1588c27857cc59af", "0x8854b22e4f00f4ba5f141fa983e95a8c025f7e3e", "0xec0cf15a2857d39f9ff55bc532a977fa590e5161", "0x597152bc3902bbfd90de2c3faaff9d37b0649577", "0xa07d117685c2a66c60e36b7e85bf1af3cef4fcde", "0x8dfd689c3083fbd0395b39d60baa3f8e52254bbf", "0x06b44cb2088d3bdc5e8b30d11de3791a0d8f59a0"],
  //       nonce: 0,
  //       signatureList: [],
  //       contractAddress: "0xCB65F3FB88887f85B0C152dBdECdabb8e1aAC82F",
  //       start: toTime(2022, 8, 1, 18),
  //       finish: toTime(2022, 9, 1, 18),
  //       accountLimit: 1
  //     }
  //   ]
  // },
  {
    name: "Ultra-Sound BLAT",
    description: "Unlike the common bat this unique BLAT ( blueberry bat ) is using his blueberry sonar to navigate the merge. Watch as these honed fangs suck dry any Trad-Fi.",
    id: IAttributeMappings["Ultra Sound BLAT"],
    mintRuleList: [
      {
        supply: 400,
        type: SaleType.holder,
        cost: 0n,
        contractAddress: "",
        start: toTime(2022, 8, 14, 18),
        finish: toTime(2022, 9, 14, 18),
        accountLimit: 1
      }
    ]
  },
  {
    name: "Juicy Head",
    description: "Some do six packs to wise cracks instead I’m drinking my blueberry juice packs while I  kickback preparing for the GMX counter attack!",
    id: IAttributeMappings["Juice Head"],
    mintRuleList: [
      {
        supply: 50,
        type: SaleType.holder,
        cost: parseEther('0.05').toBigInt(),
        contractAddress: "0xCB65F3FB88887f85B0C152dBdECdabb8e1aAC82F",
        start: toTime(2022, 7, 10, 18),
        finish: toTime(2022, 8, 10, 18),
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
        contractAddress: "0xa90C156D2632d18F4EB20f96991609DAC5689288",
        start: toTime(2022, 7, 8, 18),
        finish: toTime(2022, 8, 8, 18),
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
