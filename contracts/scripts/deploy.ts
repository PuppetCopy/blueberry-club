import { Profile__factory, GBCLab__factory, Police__factory, Closet__factory, GBC__factory, SaleExample__factory } from "../typechain-types"
import { ethers } from "hardhat"

import getAddress, { ZERO_ADDRESS } from "../utils/getAddress"
import { connectOrDeploy } from "../utils/deploy"
import { GBC_ADDRESS, hasWhitelistSale, saleDescriptionList } from "@gambitdao/gbc-middleware"
import { AddressZero } from "@gambitdao/gmx-middleware"

export enum ROLES {
  MINTER,
  BURNER,
  CREATOR
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
const POLICE = "" // Police contract
const LAB = "" // The Lab items ERC1155 contract

// This contract can be redeployed safely they are not required
// on others contract (for now)
const PROFILE = ""
const CLOSET = ""

const saleConfigList = saleDescriptionList

const main = async () => {
  const [owner] = (await ethers.getSigners())
  console.clear()

  console.log(`DEPLOYER WIZARD 🧙‍♂️ (by IrvingDev)`)

  console.log(`------------------------------------------------------------------------------\n`)
  console.log(`🔑 Deployer: ${owner.address}`)

  const treasury = getAddress(TREASURY) == ZERO_ADDRESS ? owner.address : getAddress(TREASURY)

  console.log(`💰 Treasury address: ${treasury}\n`)
  console.log(`------------------------------------------------------------------------------\n`)

  const gbc = await connectOrDeploy(GBC, GBC__factory, "Blueberry Club", "GBC", "")


  console.log(`------------------------------------------------------------------------------\n`)
  const police = await connectOrDeploy(POLICE, Police__factory)
  console.log(`------------------------------------------------------------------------------\n`)

  const lab = await connectOrDeploy(LAB, GBCLab__factory, owner.address, police.address)

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

  await connectOrDeploy(PROFILE, Profile__factory, gbc.address, owner.address, police.address)

  console.log(`------------------------------------------------------------------------------\n`)

  const closet = await connectOrDeploy(CLOSET, Closet__factory, gbc.address, lab.address)

  if (getAddress(CLOSET) == AddressZero) {
    console.log(`🎩 Set roles from LAB to CLOSET`)
    try {
      await police.setUserRole(closet.address, ROLES.MINTER, true)
      console.log(`  - MINTER role setted !`)
      await police.setUserRole(closet.address, ROLES.BURNER, true)
      console.log(`  - BURNER role setted !`)
    } catch (error) {
      console.log(`❌ Actual deployer is not owner of previous police contract`)
    }
  }


  for (const config of saleConfigList) {
    console.log(`------------------------------------------------------------------------------\n`)

    const sale = hasWhitelistSale(config)
      ? await connectOrDeploy(TREASURY, SaleExample__factory, config.contractAddress, config.id, config.maxSupply, config.maxPerTx, config.publicCost, config.publicStartDate, config.whitelistStartDate, config.whitelistCost, config.whitelistMax, GBC, LAB)
      : await connectOrDeploy(TREASURY, SaleExample__factory, config.contractAddress, config.id, config.maxSupply, config.maxPerTx, config.publicCost, config.publicStartDate, 0, 0, 0, GBC, LAB)

    console.log(`🎩 Set roles from LAB to ${config.name} SALE`)
    try {
      await police.setUserRole(sale.address, ROLES.MINTER, true)
      console.log(`  - MINTER role setted !`)
    } catch (error) {
      console.log(error)
      console.log(`❌ Actual deployer is not owner of previous police contract`)
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
