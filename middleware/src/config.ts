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
    contractAddress: "0x7AD8cF1211FCa25F53072aF2E435B64DF93D8D86",
    mintRuleList: [
      {
        amount: 2,
        type: SaleType.private,
        cost: 0n,
        start: 1654537183,
        transaction: 1,
        nonce: 0,
        addressList: [
          '0x168e86eb1d72566ee0f77be308283ec4e9b60a14', '0x1f05331c7f58714413297add8f566a67fd47ae6b', '0x31ea2730a76c7d480bba0267eb91d02a3087ea88', '0x34fece12d57271cf7be3f8056a2804d5e8339221', '0x3742600f3467cb45ad7e8b71262eae5bd6874f67', '0x3f0d4c1ffbb554f4226944be3880697204c0e83d', '0x45b8bf871931f2aec8ff726f32df325f1ef5ea3a', '0x4a867621600f39460f1372b42998af992e84b07d', '0x5b1a073657e4b2b14ff4200428d7733a32f3b3d0', '0x5b701666559ee487702c28a96f0c0bdf4c58af4e', '0x5d7b96908357a7ebc2c5143daf7faf0b6d5236bf', '0x64b5d4afc94f2eee3924532f35ec7c6e5ef7f26b', '0x70fd51b69a3963afe6e22336ac9df41b59a389b7', '0x761ef130fbae97ac7a2cf252a41b3015347a55d3', '0x81c969decfbec3429d8e0539136f511aed88c81f', '0x85e9e34e9ee4c206e981932ea593373ee4da46bd', '0x8770e06e75daa83c5cb2129bfd0431f9e1da4c84', '0x8814fab4b8eca131293334d9d7b3d20331a55b42', '0x8fb4f6ae091050630bccde15062cbf547ad17372', '0x930258d27bf4b8fc97d04df242b2b20f2db750f4', '0x9552153ced787d924724932a81aaffd8adf94897', '0x9590db3973f2f22cd9845603f564f3000159d7d4', '0x9cbbcd3b4129b1c00f0cd851baf118ebb0c4f168', '0x9e7f78eafaebaf1094202ffa0835157fc5c3ade0', '0xa572a13ee1ce16a386ac995db365d949cba6f9d1', '0xaa93840c66058f61814192742dbc4f3f8346c16b', '0xb1449344d1fdcdc16eacf8c6714744ca2ffb8ec5', '0xb74ac32728dcbae589f03e3537cad217c4706b2b', '0xb8048009959df63aaa439fe0c1448b46d805a464', '0xcb11673592cc6c4b9584f33bbba6c6cf07dde3f7', '0xcb36bd046fe8a42f4289572286ae72cfca4a3669', '0xdc6b4377cec16491707d40827ab22063754729e4', '0xe5be41b08ba9aa08ac3ca1189a4cd86b86b6b2ff', '0xed2c95209938ec8d2430ff39252f13ed07992904', '0xed84fef1f27958b56a404d4c99ab8d352490b6fd', '0xf83a76a56123e2c44d41e7b9716c712a8eb34eeb', '0xfdcd5d722189bb6583a46a582e52981a49817eae'
        ],
        signatureList: [
          [
            '0x2390d9e37359311a3c179c9c728288d5e5c324711201b14ef5167e3634d1593f',
            '0x8f7ec4d58a1d6e6af6a7553bcf9d25402ff38e21aaa7696e3cd72dc386dbaca8',
            '0x581108149920ca08217f481122ea290be8b4c054b90d41015811c6ab3fc5e47e',
            '0xa8a5c42a5a522c28563543b5f6f345d7fa8764eed634a0055b9be62b81d40404',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xd148931217770b57eca0dbf1747131cbae69a5c02230da1facd586e838d54cf0',
            '0x9f5efa0a442c4c2e53eba3655d41f2f881e991088c3a3210eeea93c8b98812f4',
            '0x1b13a78882625cc5b748fe13fa5053b212f87114e2bc0c56095398351fd9f9ac',
            '0x8078956ddb56accaf126f1d6dffe6f4675504acb91957c30068a313a22fa0289',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xaf16e74c2a230430dcc49b145aace9f75a023b2b8244280df6b810e0a39f40c7',
            '0x385584c06a321359cf9fd69295b0d7ab606e8feb437d345d8af7210bcf79d0b2',
            '0x877ba6e4f83260314e8228aee10eceac38072c054a288f675231388caf0aa8be',
            '0x8b69217d30684390b9c840aa69c9e33ffb774935e1d9604b518f00b742317f2f',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xbccb788af35037e84a705d347f6976ebc0133be0389e295ee20e1e2999634a05',
            '0xea0b475886a07114e328a0a685555613d45c2ab1d7df42c93b488660182500c5',
            '0x8915a1105a828e247caec4ff4704abd6382d781842e9ac04f8bacb664214ae6b',
            '0x8078956ddb56accaf126f1d6dffe6f4675504acb91957c30068a313a22fa0289',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x86a9af0fd9caacbf8c7cf2e46cae94303b5e4c0f9c03a50bd4b824693f5e49e4',
            '0x0567cec8a019ef7d8e09bb35f70f33bdc05b580dffef3c5001a6ddba85bbaeb2',
            '0x0ea4cdabcac2818ec556de8585ccf8a1c33a5849a736bfd82b9cfcfd2e5817a1',
            '0x8b69217d30684390b9c840aa69c9e33ffb774935e1d9604b518f00b742317f2f',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xc2346c7ebde5f82e88b0f107c5d47094eb5abe1700c75b150a4cbe2557b43480',
            '0xefe688eb92775c6b209fe878c49d06bf76f8d0529d056b013987ad17711d27d3',
            '0x1b13a78882625cc5b748fe13fa5053b212f87114e2bc0c56095398351fd9f9ac',
            '0x8078956ddb56accaf126f1d6dffe6f4675504acb91957c30068a313a22fa0289',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x22137bd7c2fdce2cef350752ef12ae5a76d3806cc09e2db47987b20fa2c756c2',
            '0x8f7ec4d58a1d6e6af6a7553bcf9d25402ff38e21aaa7696e3cd72dc386dbaca8',
            '0x581108149920ca08217f481122ea290be8b4c054b90d41015811c6ab3fc5e47e',
            '0xa8a5c42a5a522c28563543b5f6f345d7fa8764eed634a0055b9be62b81d40404',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xb6a460a5b9a57e042398289ba878eb059554dea192f7046f154f0851a54878d8',
            '0xfb1caa7b7fd563176dc59631e8c81e1c179f167364cd660f5e5ce0478629153b',
            '0x8915a1105a828e247caec4ff4704abd6382d781842e9ac04f8bacb664214ae6b',
            '0x8078956ddb56accaf126f1d6dffe6f4675504acb91957c30068a313a22fa0289',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xc45d6b02ec33a49b45461c715be747fd6310ab959cc171db68cb8bdebcf4a058',
            '0xefe688eb92775c6b209fe878c49d06bf76f8d0529d056b013987ad17711d27d3',
            '0x1b13a78882625cc5b748fe13fa5053b212f87114e2bc0c56095398351fd9f9ac',
            '0x8078956ddb56accaf126f1d6dffe6f4675504acb91957c30068a313a22fa0289',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x7bcdc654f2bec27ca9fcc08ec342a3711be28649b4c84d56add6e219202620bc',
            '0x3f4cffa06b8db3b77956bd24e4c82c2834e0c4070ebdaa08fc7a4dbdb4053692',
            '0x0ea4cdabcac2818ec556de8585ccf8a1c33a5849a736bfd82b9cfcfd2e5817a1',
            '0x8b69217d30684390b9c840aa69c9e33ffb774935e1d9604b518f00b742317f2f',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x11c84a8aa65c9d03fcf0ae5870c6749807085682f2e645847c7bfa96f69c97e8',
            '0xae189b3a5c0a4e5e31417f3bd7e8e0ca96062a0509ed135d3a14bd27dbebf1d8',
            '0x0ab4b8b51e8eec78d1bec25e5171e9c4c3418bbcb8107da2abdbf338e5866062',
            '0xa8a5c42a5a522c28563543b5f6f345d7fa8764eed634a0055b9be62b81d40404',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x1aecb6ecf66d00a3b076863290220797d994e96815753ee0c2cb991b12e9217a',
            '0x4f72c69dfb5fd12154b1be98bad3e20eb84d881c9a07e219545d2144180530ca',
            '0x581108149920ca08217f481122ea290be8b4c054b90d41015811c6ab3fc5e47e',
            '0xa8a5c42a5a522c28563543b5f6f345d7fa8764eed634a0055b9be62b81d40404',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xb8b74df2582eaa8ebba89d628aae9390f51e747d7db64762ef1d2977f879e09e',
            '0xfb1caa7b7fd563176dc59631e8c81e1c179f167364cd660f5e5ce0478629153b',
            '0x8915a1105a828e247caec4ff4704abd6382d781842e9ac04f8bacb664214ae6b',
            '0x8078956ddb56accaf126f1d6dffe6f4675504acb91957c30068a313a22fa0289',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xb4e5d66c6d0c9f1c5101b6d6bf42f4da83e0f4c8248c70b50e67db66dea49b28',
            '0xf2042c9b7012fd6c17b3e82e777cd3e476db2ee01da2db1214f98702e54f25b5',
            '0x877ba6e4f83260314e8228aee10eceac38072c054a288f675231388caf0aa8be',
            '0x8b69217d30684390b9c840aa69c9e33ffb774935e1d9604b518f00b742317f2f',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xae71ef32fd21c247749dae3bcefbb83349f21728563e23635f902dfae675ba79',
            '0x385584c06a321359cf9fd69295b0d7ab606e8feb437d345d8af7210bcf79d0b2',
            '0x877ba6e4f83260314e8228aee10eceac38072c054a288f675231388caf0aa8be',
            '0x8b69217d30684390b9c840aa69c9e33ffb774935e1d9604b518f00b742317f2f',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xbda36c28b9671580d00b8ee49ef53c1498a13c195e50e79dcb30da9d33c7054a',
            '0xea0b475886a07114e328a0a685555613d45c2ab1d7df42c93b488660182500c5',
            '0x8915a1105a828e247caec4ff4704abd6382d781842e9ac04f8bacb664214ae6b',
            '0x8078956ddb56accaf126f1d6dffe6f4675504acb91957c30068a313a22fa0289',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x8d3e7a5026fbe5e794a2a3589c72171b826a9dbe9503e19012295564ef2c0860',
            '0x0567cec8a019ef7d8e09bb35f70f33bdc05b580dffef3c5001a6ddba85bbaeb2',
            '0x0ea4cdabcac2818ec556de8585ccf8a1c33a5849a736bfd82b9cfcfd2e5817a1',
            '0x8b69217d30684390b9c840aa69c9e33ffb774935e1d9604b518f00b742317f2f',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x66a2a5c8dae5fe25caaf8b293d0e06d2a3231a97ce661f58a7cfe9d853e69b2e',
            '0x2c60ea8c4a03047b70d98be777c949070d8167a14bddc98351efe63964af3163',
            '0xeb7c27cc995587e6f0e04b2810ba9af6a2bbaa57be5df42f4e3166940da38833',
            '0xc1f568d1a6f4b5253fe28c8dd3857803fb923a5eb5498fdcac5cdaf786ae8bbd',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xecaaf47db9101811a7de1a189a64c7aabe0e2438f6eab893afebd4beb4d2bbbf',
            '0xe33aad50837886829ff85a38a1c7e6e4af496bdde4e7e0567f2ba87e23e9c8d5',
            '0xed7f1bf28b142a3684a21fac28c7fa72777b10a67e4000f129943a37c51fdb3d',
            '0xb1e79b49845586e3132d563d8196920b11be8633139f14168a247f8ef01f1586'
          ],
          [
            '0x4fa40c1d8e806758a95c2fe1de4c10d284e0bfc9dbead5779b1922ae62e43ffe',
            '0xc2e171e24fe075fbac4da66f31e7cf2b6cc31fb796362d3064282ac8602511e7',
            '0xcaed7f0cd744fdf03cbdc09ed52cd4bffbd4bd922e7081ecb7001f76e3cd61be',
            '0xc1f568d1a6f4b5253fe28c8dd3857803fb923a5eb5498fdcac5cdaf786ae8bbd',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x35b0bda2c5c499ae96c9c1da0714a33684dcc4d46d961471d61888a142c4b6c3',
            '0xb1e79b49845586e3132d563d8196920b11be8633139f14168a247f8ef01f1586'
          ],
          [
            '0xcb9944aae2373c7403833d5ae2f96ddf62a4e64295a2ba185b8a6118fc49824b',
            '0x9f5efa0a442c4c2e53eba3655d41f2f881e991088c3a3210eeea93c8b98812f4',
            '0x1b13a78882625cc5b748fe13fa5053b212f87114e2bc0c56095398351fd9f9ac',
            '0x8078956ddb56accaf126f1d6dffe6f4675504acb91957c30068a313a22fa0289',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x136b1c7c5be09155cbafe44676f87fe67f506514b5fc90e696500df62a3a8746',
            '0x4f72c69dfb5fd12154b1be98bad3e20eb84d881c9a07e219545d2144180530ca',
            '0x581108149920ca08217f481122ea290be8b4c054b90d41015811c6ab3fc5e47e',
            '0xa8a5c42a5a522c28563543b5f6f345d7fa8764eed634a0055b9be62b81d40404',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x68d7e537e182e598b2c7e4124c5cc78729054b4e9b137498ea7289e857e4f010',
            '0x5b13fcc50a9af62a44e051c8bd6cea3f9b5e7ebc90d8bbed028f2938f3a09b3e',
            '0xeb7c27cc995587e6f0e04b2810ba9af6a2bbaa57be5df42f4e3166940da38833',
            '0xc1f568d1a6f4b5253fe28c8dd3857803fb923a5eb5498fdcac5cdaf786ae8bbd',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x390424eb401b55926890957ef13c961d8406889f8db3cc274cf91f0948983ad2',
            '0x927af6dcaae40ac353478c799db53cb9a6cb5e13e908ab9939ee620c849cf76f',
            '0xcaed7f0cd744fdf03cbdc09ed52cd4bffbd4bd922e7081ecb7001f76e3cd61be',
            '0xc1f568d1a6f4b5253fe28c8dd3857803fb923a5eb5498fdcac5cdaf786ae8bbd',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x3bf1732f67c6237cc64d8f0bdec2800fcfd8cb9eca34e26bebf023ec07f64c62',
            '0x927af6dcaae40ac353478c799db53cb9a6cb5e13e908ab9939ee620c849cf76f',
            '0xcaed7f0cd744fdf03cbdc09ed52cd4bffbd4bd922e7081ecb7001f76e3cd61be',
            '0xc1f568d1a6f4b5253fe28c8dd3857803fb923a5eb5498fdcac5cdaf786ae8bbd',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x0879d6d4160b4deb71b468b5ff270e557f22452a871a5e87f0f03c71e075399f',
            '0xb29f4436cb2d3296731bc53f577b87ca4ab7765f73cf0dce19d610dd94a370e3',
            '0x0ab4b8b51e8eec78d1bec25e5171e9c4c3418bbcb8107da2abdbf338e5866062',
            '0xa8a5c42a5a522c28563543b5f6f345d7fa8764eed634a0055b9be62b81d40404',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xe36ef4b9b443aeb56194159a478c788c3e4586b761d83108c72c8a026886fb21',
            '0xe33aad50837886829ff85a38a1c7e6e4af496bdde4e7e0567f2ba87e23e9c8d5',
            '0xed7f1bf28b142a3684a21fac28c7fa72777b10a67e4000f129943a37c51fdb3d',
            '0xb1e79b49845586e3132d563d8196920b11be8633139f14168a247f8ef01f1586'
          ],
          [
            '0x07f59251518ea850feda292712b076f59138a105b8ac3541d1aba4d5009e1086',
            '0xb29f4436cb2d3296731bc53f577b87ca4ab7765f73cf0dce19d610dd94a370e3',
            '0x0ab4b8b51e8eec78d1bec25e5171e9c4c3418bbcb8107da2abdbf338e5866062',
            '0xa8a5c42a5a522c28563543b5f6f345d7fa8764eed634a0055b9be62b81d40404',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x62a4e092dfdfe354abfadcc994c5169ffa170277a8a4e50691ee65ce1d22ef36',
            '0x2c60ea8c4a03047b70d98be777c949070d8167a14bddc98351efe63964af3163',
            '0xeb7c27cc995587e6f0e04b2810ba9af6a2bbaa57be5df42f4e3166940da38833',
            '0xc1f568d1a6f4b5253fe28c8dd3857803fb923a5eb5498fdcac5cdaf786ae8bbd',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xb67bec6ae485ebf68ce57093d1927cfcfdf6ace2379a2593d8a1792d5db58bbc',
            '0xf2042c9b7012fd6c17b3e82e777cd3e476db2ee01da2db1214f98702e54f25b5',
            '0x877ba6e4f83260314e8228aee10eceac38072c054a288f675231388caf0aa8be',
            '0x8b69217d30684390b9c840aa69c9e33ffb774935e1d9604b518f00b742317f2f',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x70a60d47ff08dff67a9bcefe7e8b2496171f2728bb013fe082674663378ad5fe',
            '0x5b13fcc50a9af62a44e051c8bd6cea3f9b5e7ebc90d8bbed028f2938f3a09b3e',
            '0xeb7c27cc995587e6f0e04b2810ba9af6a2bbaa57be5df42f4e3166940da38833',
            '0xc1f568d1a6f4b5253fe28c8dd3857803fb923a5eb5498fdcac5cdaf786ae8bbd',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0x0b99adddf0adea104b8bbd9b38d4376f0b05adde09f550bca45696e158b3a1c6',
            '0xae189b3a5c0a4e5e31417f3bd7e8e0ca96062a0509ed135d3a14bd27dbebf1d8',
            '0x0ab4b8b51e8eec78d1bec25e5171e9c4c3418bbcb8107da2abdbf338e5866062',
            '0xa8a5c42a5a522c28563543b5f6f345d7fa8764eed634a0055b9be62b81d40404',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xe21e1528073f0165b8408abc2bc69471aaa364c31a2986cf15d29767c2ba73a3',
            '0x39a3f2487c99c08695e65770d7202450001ceca35b82b9ff7f8558ddce22bb20',
            '0xed7f1bf28b142a3684a21fac28c7fa72777b10a67e4000f129943a37c51fdb3d',
            '0xb1e79b49845586e3132d563d8196920b11be8633139f14168a247f8ef01f1586'
          ],
          [
            '0x71b0ab2d698c3379606e2f804d867e7537c8166172a865dd8d150ad5cc558ceb',
            '0x3f4cffa06b8db3b77956bd24e4c82c2834e0c4070ebdaa08fc7a4dbdb4053692',
            '0x0ea4cdabcac2818ec556de8585ccf8a1c33a5849a736bfd82b9cfcfd2e5817a1',
            '0x8b69217d30684390b9c840aa69c9e33ffb774935e1d9604b518f00b742317f2f',
            '0x1905e874b719f456f91c2e01fd8b29a81507b0fb6f80a7a25d56c20daf0ccf8d',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ],
          [
            '0xd56f73d4f9b3b767a2b8eca73d5d3a7b377313a8dc12e21bdc5899af2b6bb9e4',
            '0x39a3f2487c99c08695e65770d7202450001ceca35b82b9ff7f8558ddce22bb20',
            '0xed7f1bf28b142a3684a21fac28c7fa72777b10a67e4000f129943a37c51fdb3d',
            '0xb1e79b49845586e3132d563d8196920b11be8633139f14168a247f8ef01f1586'
          ],
          [
            '0x5be84940edf0da754b6e62d454a647b9cf1775df11be297377f384f675fdddaf',
            '0xc2e171e24fe075fbac4da66f31e7cf2b6cc31fb796362d3064282ac8602511e7',
            '0xcaed7f0cd744fdf03cbdc09ed52cd4bffbd4bd922e7081ecb7001f76e3cd61be',
            '0xc1f568d1a6f4b5253fe28c8dd3857803fb923a5eb5498fdcac5cdaf786ae8bbd',
            '0xe97a021bc9f0458005ac1459d224c7b6c338d83d382492b05b8195666c9c733e',
            '0xe91ccc023f22096c80f2d6191c62260e71da10f36dcd7fe35fa51dfef87e33b3'
          ]
        ],
      },
      {
        amount: 2,
        type: SaleType.Public,
        cost: 1000000000000000n,
        start: 1654608270 + intervalTimeMap.HR2,
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
