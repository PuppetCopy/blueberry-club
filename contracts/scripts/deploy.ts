import {
  Profile__factory, GBCLab__factory,
  Police__factory, Closet__factory, GBC__factory, Public__factory, Holder__factory, Mintable, Whitelist__factory
} from "../typechain-types"
import { AddressZero, CHAIN } from "@gambitdao/gmx-middleware"

import { ethers, network } from "hardhat"

import getAddress, { ZERO_ADDRESS } from "../utils/getAddress"
import { connectOrDeploy } from "../utils/deploy"
import { attributeIndexToLabel, GBC_ADDRESS, getLabItemTupleIndex, saleDescriptionList, SaleType } from "@gambitdao/gbc-middleware"
import { getMerkleProofs } from "../utils/whitelist"
import { NFTStorage, File, Token as NFTToken } from "nft.storage"
import { labItemSvg } from "../utils/image"
import { Resvg } from "@resvg/resvg-js"



enum ROLES {
  MINTER,
  BURNER,
  DESIGNER
}
export default ROLES


/**
 *  DEPLOYER WIZARD 🧙‍♂️
 *
 *  How it works ?
 *  Each contract has is own variable if you set an address it will skip deployement of this
 *  specifique contract and just use the address given instead. Be carefull there is no verification
 *  of the address you gived !
 */

// This contract/address can be used on other contracts
const TREASURY = '' // Multisig or you personal address (if you leave it blank it will be the owner address)
const GBC = GBC_ADDRESS.GBC // The GBC ERC721 (NFT) contract
// const POLICE = "" // Police contract
const POLICE = GBC_ADDRESS.POLICE // Police contract
// const LAB = "" // The Lab items ERC1155 contract
const LAB = GBC_ADDRESS.LAB // The Lab items ERC1155 contract

// This contract can be redeployed safely they are not required
// on others contract (for now)
const PROFILE = GBC_ADDRESS.PROFILE
const CLOSET = GBC_ADDRESS.CLOSET



const main = async () => {

  const [creator] = (await ethers.getSigners())

  console.clear()

  console.log(`DEPLOYER WIZARD 🧙‍♂️ (by IrvingDev)`)


  console.log(`------------------------------------------------------------------------------\n`)
  console.log(`🔑 Deployer: ${creator.address}`)

  const owner = getAddress(TREASURY) == ZERO_ADDRESS ? creator.address : getAddress(TREASURY)

  console.log(`💰 Treasury address: ${owner}\n`)
  console.log(`------------------------------------------------------------------------------\n`)

  const gbc = await connectOrDeploy(GBC, GBC__factory, "Blueberry Club", "GBC", "")


  console.log(`------------------------------------------------------------------------------\n`)
  const police = await connectOrDeploy(POLICE, Police__factory, creator.address)
  console.log(`------------------------------------------------------------------------------\n`)

  const lab = await connectOrDeploy(LAB, GBCLab__factory, owner, police.address)

  if (getAddress(LAB) == AddressZero) {
    try {
      console.log(`✋ Adding roles for LAB`)
      await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["mint(address,uint256,uint256,bytes)"]), true)
      await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["batchMint(address,uint256[],uint256[],bytes)"]), true)
      console.log(`  - MINTER role created !`)
      await police.setRoleCapability(ROLES.BURNER, lab.address, lab.interface.getSighash(lab.interface.functions["burn(address,uint256,uint256)"]), true)
      await police.setRoleCapability(ROLES.BURNER, lab.address, lab.interface.getSighash(lab.interface.functions["batchBurn(address,uint256[],uint256[])"]), true)
      console.log(`  - BURNER role created !`)
    } catch (error) {
      console.log(`❌ Actual deployer is not owner of previous police contract`)
    }
  }

  console.log(`------------------------------------------------------------------------------\n`)

  await connectOrDeploy(PROFILE, Profile__factory, gbc.address, owner, police.address)

  console.log(`------------------------------------------------------------------------------\n`)

  await connectOrDeploy(CLOSET, Closet__factory, gbc.address, lab.address)


  for (const sale of saleDescriptionList) {
    if (!process.env.NFT_STORAGE) {
      throw new Error('nft.storage api key is required')
    }

    let storeIpfsQuery: any
    const noContractDeployed = sale.mintRuleList.every(rule => rule.contractAddress === '')


    if (noContractDeployed && network.config.chainId === CHAIN.ARBITRUM) {
      const client = new NFTStorage({ token: process.env.NFT_STORAGE })
      const svg = labItemSvg(sale.id)

      const resvg = new Resvg(svg)
      const pngData = resvg.render()
      const pngBuffer = pngData.asPng()

      console.info('Original SVG Size:', `${resvg.width} x ${resvg.height}`)
      console.info('Output PNG Size  :', `${pngData.width} x ${pngData.height}`)

      const image = new File([pngBuffer], `lab-${sale.id}.png`, { type: 'image/png' })

      const index = getLabItemTupleIndex(sale.id)

      const attributes = [
        {
          trait_type: attributeIndexToLabel[index],
          value: sale.name
        },
        {
          trait_type: "Slot",
          value: index === 0 ? "Background" : index === 8 ? 'Special' : 'Wear'
        },
      ]


      storeIpfsQuery = client.store({ name: sale.name, description: sale.description, image, attributes })
    }


    for (const rule of sale.mintRuleList) {

      console.log(`------------------------------------------------------------------------------\n`)

      if (rule.contractAddress) {
        break
      }

      let saleContractQuery: Promise<Mintable>

      if (rule.type === SaleType.Public) {
        saleContractQuery = connectOrDeploy(rule.contractAddress, Public__factory, sale.id, 0, owner, lab.address, rule)
      } else if (rule.type === SaleType.holder) {
        const { cost, start, finish, supply, accountLimit } = rule
        saleContractQuery = connectOrDeploy(rule.contractAddress, Holder__factory, sale.id, 0, owner, lab.address, { cost, start, finish, supply, accountLimit }, gbc.address)
      } else {
        const { cost, start, supply, finish, accountLimit } = rule

        const res = getMerkleProofs(rule.addressList, sale, rule)
        console.log(res.proofs)
        console.log('root: ', res.merkleRoot)

        saleContractQuery = connectOrDeploy(rule.contractAddress, Whitelist__factory, sale.id, 0, owner, lab.address, { accountLimit, cost, finish, start, supply }, res.merkleRoot)
      }


      const saleContract = await saleContractQuery

      if (owner == creator.address) {
        console.log(`🎩 Set roles from LAB to ${rule.type} ${saleContract.address} SALE`)
        await police.setUserRole(saleContract.address, ROLES.MINTER, true)
        console.log(`  - MINTER role setted !`)
      }


      console.log()
      console.log(`------------------------------------------------------------------------------\n`)
    }

    if (storeIpfsQuery) {
      const { url, data } = await storeIpfsQuery
      console.log(data, url)
    }
    
  }
  

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })