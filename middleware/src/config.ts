import { groupByKey, intervalTimeMap } from "@gambitdao/gmx-middleware"
import { CHAIN } from "@gambitdao/wallet-link"
import { parseEther } from "ethers/lib/utils"
import { IAttributeMappings, LabItemSale, SaleType } from "./types"

const date = new Date()

export const LAB_CHAIN = CHAIN.ARBITRUM

export const GLOBAL_W3P_HTTP = 'https://arbitrum-mainnet.infura.io/v3/6d7e461ad6644743b92327579860b662'

export const GLOBAL_W3P_ARBITRUM = 'wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'
export const GLOBAL_W3P_AVALANCHE = 'https://api.avax.network/ext/bc/C/rpc'

export const BLUEBERRY_REFFERAL_CODE = '0x424c554542455252590000000000000000000000000000000000000000000000'

export const TOURNAMENT_START_PERIOD = Date.UTC(date.getFullYear(), date.getMonth(), 1, 16) / 1000
export const TOURNAMENT_START_END = TOURNAMENT_START_PERIOD + intervalTimeMap.HR24 * 23


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
    name: "Marine Shirt",
    description: `To the berry who set forth on a journey that is new,
To find friends by his side, with hearts full of blue.
He sailed the vast seas, with a spirit so bold,
Searching for a new land, where his fortune could unfold.

Through storms and rough waters, he pressed on with might,
A new frontier land, was his sole guiding light.
With each passing day, his determination grew,
For the opportunities that lay ahead, he knew.

He met new friends, on this journey so grand,
Together they explored, the uncharted land.
With each step they took, their spirits soared high,
For they knew that this journey, was worth every sight.

The sailors returned, with tales of his quest,
Of the new frontier land, that was truly the best.
With a heart full of hope, and a mind full of dreams,
He knew that this journey, was just the beginning it seems.`,
    id: IAttributeMappings["Marine Shirt"],
    mintRuleList: [
      {
        supply: 117,
        type: SaleType.whitelist,
        cost: 0n,
        contractAddress: "0xb4564969CF550ef05D96ac0B7db43d7D74381aE2",
        start: toTime(2022, 11, 24, 18),
        finish: toTime(2023, 3, 24, 18),
        accountLimit: 1,
        addressList: ["0xac878c0f60dac4cd72a4956da2a3c8a46cda1362", "0x1501cf2e9afd2624a485e675427609a1932772ec", "0x0ea37b047b4d2f37cef7be3e6671bf9cb85e2e5b", "0xb26b4a4bba425ac28224cfdd45b4bd00c886cc33", "0x6f1a7d4fc905aa448df0c3f46c5e37e4aaf22892", "0xf2fc3ef6f68ec973485175912418ad246aa9dc7f", "0x2c9c3393156329641b11a8132e013edbbb0f087c", "0x8243f41b976db93db52190566c00fa35ab60302b", "0xa7335b93acef9a799e4c2a8dc559292f222d055c", "0xbeaa65e2098213a87671620974a41515df17c23d", "0xac74f980ff9ff9bd61efdb5d169a616663c9882c", "0xbe1f794f5745407302ff793495607ca75d76453e", "0x04d52e150e49c1bbc9ddde258060a3bf28d9fd70", "0x0e873c65d83c29918a4e975d234614184619356f", "0x81cc4ee8fd496979c976650888182787b6826b5c", "0x72a2da3dd2f9e29c6d11aca62834306e6122b41f", "0x1f2aac54e7f2d001572571980664aa2185aff164", "0x6cd57998cc8a6ad4cef6d5991df0b7417b85abf5", "0x58c54af353db01fde14d8feb09e8c4bda1773d2f", "0x06b44cb2088d3bdc5e8b30d11de3791a0d8f59a0", "0x2f45724d7e384b38d5c97206e78470544304887f", "0xd34b36c8017481cde1e8e11039bc717b4bc93a2f", "0xdc40e3dc8d8ba7c3003a283f82de554f26f2f4df", "0x0d8c72f47c9217f003c82478993b145c4965c526", "0x0936397c81dba1e47ec3828e1b025e507d1d6b38", "0x03d717e27af1b566c3efb729f1151e775b411f2b", "0x1133073a32df0f80ef34ad8a41015a664a1fbaba", "0xcc51f354f2a2597a752bbd168996d1079a772242", "0x4853f81413eeff3c53baef6e9efe7383ac6a24fd", "0x1ea2a806f60d3abd361b2e9ec992ba7b85258343", "0x1b8061a0af9c4eaae4a8c5122d8287f764f0114f", "0xd4df5c7d2950faad026214c0a0434cfe0624761f", "0x7a80c14098e7c9ab37b6c8b6a041823ea9d5afb4", "0xa3b1ae895b114ee3004c2b9ed54574791b07097a", "0x6f50f30e148b0aec9a10706b2784fc596136384c", "0x3abce4e29d700a3915209fdc46c81ffead2f3d5c", "0x92cbd1b38377fa881f749e6b190045903ce7f763", "0x79f1bc5c5ee691206fc55c66402f938dd1e96421", "0x6817cb400e64712d08c11c46c89cdc9c0faf7438", "0xd01b32a6975ee4ddd548cfc8019ebc36bf230bb2", "0xd2bc982a2035db0e1be7c2c1a9f87e31794c653e", "0x401c0f82117b3262b79a7697bf98bbd7c0d4e36c", "0x98f2319afb3e95d05d90fe5720f925dc17dec675", "0xbc5bacd70f723c82c4b43c099e46cc668667306c", "0xd0d9e3505349bc945a414a6ec8ff8bcadabf20e3", "0x749558a1bf79102db6e4b7ca69fe334d0a711846", "0xa219712cc2aaa5aa98ccf2a7ba055231f1752323", "0x6bc8417f1716de63445ff73b6eb99ba949c8b0b1", "0xb012537e72cf866b72537ae11b67cc16479409f1", "0xac98d36783266bc4fbae14751c69aff811406932", "0xbdcbcdbc9f8a33f016fd1c1869e3972d63c4ef22", "0x991eb32f8c988931c916aa96b2c607fd1b781f1c", "0x3c92ea0a974bba933d2e655c11c65e7846cb7154", "0xd9955789f7094b6c0bd5f7e7acfb046520a6a85c", "0xfa89ca286cd7d5daedb9d1ad31b3788c8ce6250d", "0xaa93840c66058f61814192742dbc4f3f8346c16b", "0xdb064f4834d623c47ff6cc4c5cfc5beadb38413a", "0x672c3b982325be86e221fe5d0eb5391ffa9cc8fc", "0x541aa1c1eef7ca719926865e0f89336f7ffc0e05", "0x3f9d386eeb91304ab65899b567ee8756d3298d40", "0x0f8bb4ca04104a029521216bbc86d72ddd32b1e6", "0x47a6b229aaf701ae7e7dbbb2d814ae7418876bba", "0x9d9597be67d2e5fe99bca5fafe7e7455e0a2acbb", "0xf7a0dede29b15c25a6ac9557beee6a393eced3e1", "0xdfb24a3aeb768f623e3fd50865cf9a39b90f719b", "0x7c78c6d09112d7f2f30c36a85cdf9ba062a0f2de", "0x83ac69eb7510d3aff317791890741cdefe7e6c0b", "0xd2a7d8ec1466cb3c531eac23819ca9fc249f35d8", "0xd65649def2f91c90e06613852749efd3a25b71c9", "0x32cda03f30d6b411556f62b196d7389ce8414fbb", "0xe5d6478c91ab5ad7edad8be02ad65f48bf56f2b0", "0xee2bfe340492e7e1155b8ffcc0efd357f18a2336", "0xb799c5273e67eb7a5b26b635ab6ede73bcf4d820", "0x30ac049d85bff91c71cbe30d67c4aea00ce6dbdd", "0x7dd798bf659a9422e2a21480ed6e5d9e0a2bf88f", "0xb77fc6f00fb32ed00bd17355e1f9a5aa9efe2bf9", "0xc23203e8ad67fb13388bf58d513fb42b490c9dc3", "0x84788abfe3c785a1dab5f81e35e9eaeb943208a7", "0x3eb2b60929ecb88f85234da59e529d656b4e5c49", "0x20030d10a24457263fac1559fb912b97d5493a34", "0x1e00764efcdddd267f48c94cc01902620cd61767", "0xd6926ca3d54377bc3c051c7bb6a41738e02c19e4", "0xb8872193dc7e8b604101896864ab47764353bc2d", "0xb6a47f8ed6722b7ab9d7342e4d41f202b1401e40", "0xf790bb9a7221c9a3e9983f3a6c23f6048002a529", "0x0a349c45cbedaa012f58945dfd8a85b426854c76", "0xa17cbbe1b8afd717bcceccbaefe38cf89a4ca690", "0x68bc92d2b3aedef166fa28f66c8f132fd27e5a50", "0x761ef130fbae97ac7a2cf252a41b3015347a55d3", "0x16f8ee9116aeb45d017fb85aab19b718545a2adc", "0x4594de64d7ffcabf324d6420f186b6325bce5c64", "0xea962748a29dc859f736a2053a30b4df0d40352d", "0xff0db36bdf740ce4190892e0d930bc411420ef44", "0xc54572e677b2ed341b09b62485eb511643d14a3b", "0xe8cfae1a1d13cda253ed7ffcb7a766b412bdce1b", "0xa4eb13834f23110eda247a286318b0ec9c159520", "0xfa5a398db85a524464bef328fc5e5e954e707e58", "0xf4a8af1a1a4994cd3417bb1c7e562b276680dcea", "0xf6b9d7e76f982bc326464785eda3360aacbdc784", "0xbc8819c1821bc52b5d30d2dd52f0cb6110510005", "0x3b57579a35425a24c2a786dacebe1837c09e5fbb", "0xe9eb275a7df0a97a8caed8611fee8b6090828664", "0x88bf5a2e82510847e5dcbf33f44a9f611f1c1df5", "0x141a48d5ace33dd69e234b75a171de1e2c6eb00f", "0x94a0321182f95b4b54537a6dd78df5750df3513c", "0x65857132b8acbb2f849d70a4b8950caea42a43ac", "0x62365e0af7b6a188d063825afa3399ba0b5aa7cd", "0xc693b4ffb338579467a541b2bf267b1955870920", "0xe3b30c7dcdd2a01bd581da696a337d7cee3744c2", "0xda63f22bf4bdc0b88536bdf4375fc9e14862abd8", "0xa60eb54094fd9ce3627ddad4de7b63019c6f3c57", "0x52c23e0415561605cfb5263bbc16bcad2f60bb76", "0xa75fb3bd645a02b59a9963c3cc12f34dc86b9660", "0xfe4c4a27bed5e9113480c84a177068f7421a1eb7", "0xfde4a6c95020b7f9772f022fff3d5b9eec91df0c", "0x00841f0ff69b6581857617631fe9c31260f5d218", "0xe340472a596e4ab24c36d212f39e7f634a9dc9e6"],
        signatureList: [],
        nonce: 0,
      }
    ]
  },
  {
    name: "Santa Hat",
    description: `Jingle jingle all the way,
Holly and mistletoe on display,
Santa's hat is red and jolly,
Brimming with gifts in galore and glory,
Here's a surprise from him to thee
May your Christmas be joy-full for all to see!

Merry Christmas Berries!`,
    id: IAttributeMappings["Christmas Hat"],
    mintRuleList: [
      {
        supply: 180,
        type: SaleType.holder,
        cost: 0n,
        contractAddress: "0xb4564969CF550ef05D96ac0B7db43d7D74381aE2",
        start: toTime(2022, 11, 24, 18),
        finish: toTime(2023, 0, 24, 18),
        accountLimit: 1
      }
    ]
  },
  {
    name: "Birthday Hat",
    description: `Happy birthday, dear blueberry
today, we celebrate you, that's the goal

Blueberries are sweet and oh so good
In smoothies, cakes, or just eaten plain
So let's celebrate your special day
With some tasty treats, and maybe a little champagne

Here's to another year of growth
May you continue to be ripe and juicy, no one can doth
Happy birthday, little blueberry friend
We're glad you're here, let the celebrations never end!`,
    id: IAttributeMappings.Birthday,
    mintRuleList: [
      {
        supply: 300,
        type: SaleType.holder,
        cost: 0n,
        contractAddress: "0x8da1Dd6967E018C9d9E31aA1C9e3fc51b95Be3C9",
        start: toTime(2022, 11, 5, 18),
        finish: toTime(2023, 0, 5, 18),
        accountLimit: 1
      }
    ]
  },
  {
    name: "Skeleton",
    description: "Frankenstein and Dracula have nothing on Bloody Mary, although all these Classics are definitely scary. Here’s some thing from GBC for you it’s a real gusher, please let me introduce to you the infamous Mr. BoneCrusher!",
    id: IAttributeMappings["Skeleton"],
    mintRuleList: [
      {
        supply: 75,
        type: SaleType.holder,
        cost: 0n,
        contractAddress: "0xa7c0b1F830D3427688Ea56FAEc42eF2674E1Be6C",
        start: toTime(2022, 9, 30, 18),
        finish: toTime(2022, 10, 30, 18),
        accountLimit: 1
      }
    ]
  },
  {
    name: "Scary Night",
    description: "Ghosts, ghouls & goblins are giving you a fright, while vampires & zombies can’t wait to take a bite. For Halloween there will be plenty of candy for all your delight, so don’t be afraid and have a BERRY spooky night!",
    id: IAttributeMappings["Scary Night"],
    mintRuleList: [
      {
        supply: 125,
        type: SaleType.holder,
        cost: 0n,
        contractAddress: "0xb6112aF0C2B8A3CE4A22BA9BA542830F20Fa4BdA",
        start: toTime(2022, 9, 30, 18),
        finish: toTime(2022, 10, 30, 18),
        accountLimit: 1
      }
    ],
  },
  {
    name: "Holographic",
    description: `GBC goes to NFT Paris
« This item includes additional minter(ONLY) benefits » 

The NFT Paris is an event that will gather Builders, Artists, Curators, Brand, Collectors & Biggest NFT Collections. It will take place on February 24-25th, 2023 near the Eiffeil Tower in Paris. 

By minting this item, you will be able to attend this conference, discover new projects, meet other Berries and much more 🫐👀

For more details check our see discord discussions and even help us improve this experience
`,
    id: IAttributeMappings["Holographic Background"],

    externalLinks: [
      {
        link: 'https://discord.com/channels/941356283234250772/942121185456570439/1033648582881984582',
        name: 'Discord Discussion'
      },
      {
        link: 'https://www.nftparis.xyz/',
        name: 'NFT Paris Website'
      },
      {
        link: 'https://snapshot.org/#/gbc-nft.eth/proposal/0xd48efa441b6c2c53ba5d6f0fa25e5237debbffe446bac60e2e28a04765ab4e10',
        name: 'Governance Proposal'
      },
    ],
    mintRuleList: [
      {
        supply: 41,
        type: SaleType.holder,
        cost: parseEther('0.35').toBigInt(),
        contractAddress: "0xaA8f27dA5e73deF9ffc1CfedD90BCaD9FeA36B20",
        start: toTime(2022, 9, 28, 18),
        finish: toTime(2022, 10, 28, 18),
        accountLimit: 1
      },
      {
        supply: 4,
        type: SaleType.whitelist,
        cost: parseEther('0.35').toBigInt(),
        nonce: 0,
        contractAddress: "0xA8503345A18EF77C21F5eE0Fcf587B115A4bBbe4",
        start: toTime(2022, 9, 28, 18),
        finish: toTime(2022, 10, 28, 18),
        accountLimit: 1,
        addressList: [],
        signatureList: [],
      }
    ]
  },
  {
    name: "GBC x Mithical",
    description: "NFT Berrification from across the nation, putting together with our friends from the depths of imagination a mythical collaboration. To the crypto world I vie, your NFT will amplify when we Berrify the Samurai!",
    id: IAttributeMappings.xMithical,
    mintRuleList: [
      {
        supply: 124,
        type: SaleType.whitelist,
        cost: 0n,
        contractAddress: "0x83d0870C6E61be0bb8C5FFDf05c283a78078815B",
        start: toTime(2022, 8, 30, 18),
        finish: toTime(2022, 9, 30, 18),
        accountLimit: 1,
        addressList: [],
        signatureList: [],
        nonce: 0
      }
    ]
  },
  {
    name: "Ultra-Sound BLAT",
    description: "Unlike the common bat this unique BLAT ( blueberry bat ) is using his blueberry sonar to navigate the merge. Watch as these honed fangs suck dry any Trad-Fi.",
    id: IAttributeMappings["Ultra Sound BLAT"],
    mintRuleList: [
      {
        supply: 400,
        type: SaleType.holder,
        cost: 0n,
        contractAddress: "0x0EA9B8b2124f7545c343725c2029099e627B6f9D",
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

export const labItemDescriptionListMap = groupByKey(saleDescriptionList, i => i.id)
