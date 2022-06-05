import {
  Profile__factory, GBCLab__factory,
  Police__factory, Closet__factory, GBC__factory, MerkleTpl__factory, PublicTpl__factory, HolderWhitelistTpl__factory, Sale,
} from "../typechain-types"
import { AddressZero } from "@gambitdao/gmx-middleware"

import { ethers } from "hardhat"

import getAddress, { ZERO_ADDRESS } from "../utils/getAddress"
import { connectOrDeploy } from "../utils/deploy"
import { GBC_ADDRESS, saleConfig, saleDescriptionList, saleLastDate, saleMaxSupply, SaleType } from "@gambitdao/gbc-middleware"
import { createWhitelistProofs } from "../utils/whitelist"

export enum ROLES {
  MINTER,
  BURNER,
  DESIGNER
}



/**
 *  DEPLOYER WIZARD 🧙‍♂️
 *
 *  How it works ?
 *  Each contract has is own variable if you set an address it will skip deployement of this
 *  specifique contract and just use the address given instead. Be carefull there is no verification
 *  of the address you gived !
 */

// This contract/address can be used on other contracts
const TREASURY = "" // Multisig or you personal address (if you leave it blank it will be the owner address)
const GBC = GBC_ADDRESS.GBC // The GBC ERC721 (NFT) contract
// const POLICE = "" // Police contract
const POLICE = "0x6082Ba2c841c50a01267306927150da9DA798D21" // Police contract
// const LAB = "" // The Lab items ERC1155 contract
const LAB = "0x3eaBD423D21DC2CE90aA982fB7D1939EA2Ec16ED" // The Lab items ERC1155 contract

// This contract can be redeployed safely they are not required
// on others contract (for now)
const PROFILE = "0x13F82f192cB2A8746Aede30e23479B6Ff8FbcE2b"
const CLOSET = "0x227995578643a9c4E5EceF49AbA461EF74df1085"


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
  const police = await connectOrDeploy(POLICE, Police__factory, owner)
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

  const closet = await connectOrDeploy(CLOSET, Closet__factory, gbc.address, lab.address)

  if (getAddress(CLOSET) == AddressZero) {
    console.log(`🎩 Set LAB isApprovedForAll to CLOSET`)
    console.log(`✋ Adding roles for CLOSET`)
    await police.setRoleCapability(ROLES.DESIGNER, closet.address, closet.interface.getSighash(closet.interface.functions["get(uint256,uint256,uint256)"]), true)

    try {
      console.log(`🎩 Set roles from LAB to CLOSET`)
      await police.setUserRole(closet.address, ROLES.MINTER, true)
      console.log(`  - MINTER role setted !`)
    } catch (error) {
      console.log(`❌ Actual deployer is not owner of previous police contract`)
    }
  }


  for (const config of saleDescriptionList) {
    console.log(`------------------------------------------------------------------------------\n`)

    let sale: Sale

    const fstMintRule = config.mintRuleList[0]
    const lastDateRule = saleLastDate(config)
    const max = saleMaxSupply(config)
    const finish = lastDateRule.start + saleConfig.saleDuration
    const { maxMintable } = saleConfig
    const saleState = { paused: 1, minted: 0, max }
    const mintState = { finish, maxMintable }

    if (fstMintRule.type === SaleType.Public) {
      const { amount, cost, start, transaction } = fstMintRule

      sale = await connectOrDeploy(config.contractAddress, PublicTpl__factory, config.id, owner, lab.address, saleState, mintState, { amount, cost, start, transaction })
    } else if (fstMintRule.type === SaleType.holderWhitelist) {
      const { amount, cost, start, transaction, walletMintable } = fstMintRule
      sale = await connectOrDeploy(config.contractAddress, HolderWhitelistTpl__factory, config.id, owner, gbc.address, lab.address, saleState, mintState, { totalMintable: amount, cost, start, transaction, walletMintable })
    } else {
      const res = createWhitelistProofs(fstMintRule.addressList)
      console.log(res.whitelist)
      console.log('root: ', res.merkleRoot)
      const { amount, cost, start, transaction } = fstMintRule

      sale = await connectOrDeploy(config.contractAddress, MerkleTpl__factory, config.id, owner, gbc.address, lab.address, saleState, mintState, { amount, cost, start, transaction }, res.merkleRoot)
    }


    console.log(`🎩 Set roles from LAB to ${config.name} SALE`)

    if (getAddress(config.contractAddress) === AddressZero) {
      try {
        await police.setUserRole(sale.address, ROLES.MINTER, true)
        console.log(`  - MINTER role setted !`)
      } catch (error) {
        console.log(error)
        console.log(`❌ Actual deployer is not owner of previous police contract`)
      }
    }

    console.log()
    console.log(`------------------------------------------------------------------------------\n`)
  }

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
