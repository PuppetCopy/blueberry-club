import { Police, GBCLab } from "../typechain-types"
import { ethers, run } from "hardhat"

import getAddress, { ZERO_ADDRESS } from "./utils/getAddress"

import deploy_gbc from "./deploy/gbc"
import deploy_police, { ROLES } from "./deploy/police"
import deploy_lab from "./deploy/lab/lab"
import deploy_profile from "./deploy/lab/profile"
import deploy_closet from "./deploy/lab/closet"
import deploy_sale, { SaleData } from "./deploy/lab/sales/example"

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
const POLICE = "" // Police contract
const GBC = "" // The GBC ERC721 (NFT) contract
const LAB = "" // The Lab items ERC1155 contract

// This contract can be redeployed safely they are not required
// on others contract (for now)
const PROFILE = ""
const CLOSET = ""

const sales: Array<SaleData> = []

const main = async () => {
  const [owner] = (await ethers.getSigners())
  console.clear()

  console.log(`DEPLOYER WIZARD 🧙‍♂️ (by IrvingDev)`)

  console.log(`------------------------------------------------------------------------------\n`)
  console.log(`🔑 Deployer: ${owner.address}`)

  const treasury = getAddress(TREASURY) == ZERO_ADDRESS ? owner.address : getAddress(TREASURY)

  console.log(`💰 Treasury address: ${treasury}\n`)
  console.log(`------------------------------------------------------------------------------\n`)

  let gbc_address = getAddress(GBC)

  if (gbc_address == ZERO_ADDRESS) {
    const gbc = await deploy_gbc()
    gbc_address = gbc.address
  }
  console.log(`------------------------------------------------------------------------------\n`)
  let police_address = getAddress(POLICE)
  let police: Police

  if (police_address == ZERO_ADDRESS) {
    police = await deploy_police()
    police_address = police.address
  } else {
    console.log(`🔍 Get police contract at: ${police_address}`)
    police = await ethers.getContractAt("Police", police_address)
  }
  console.log(`------------------------------------------------------------------------------\n`)

  let lab_address = getAddress(LAB)
  let lab: GBCLab

  if (lab_address == ZERO_ADDRESS) {
    lab = await deploy_lab(owner.address, police_address)
    lab_address = lab.address

    console.log(`✋ Adding roles for LAB`)
    await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["mint(address,uint256,uint256,bytes)"]), true)
    await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["batchMint(address,uint256[],uint256[],bytes)"]), true)
    console.log(`  - MINTER role created !`)
    await police.setRoleCapability(ROLES.BURNER, lab.address, lab.interface.getSighash(lab.interface.functions["burn(address,uint256,uint256)"]), true)
    await police.setRoleCapability(ROLES.BURNER, lab.address, lab.interface.getSighash(lab.interface.functions["batchBurn(address,uint256[],uint256[])"]), true)
    console.log(`  - BURNER role created !`)
    console.log()
  } else {
    if (getAddress(POLICE) == ZERO_ADDRESS) {
      console.log(`❌ LAB already deployed with police we can't set roles`)
    } else {
      console.log(`🔍 Get LAB contract at: ${lab_address}`)
      lab = await ethers.getContractAt("GBCLab", lab_address)
      console.log(`✋ Adding roles for LAB`)
      try {
        await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["mint(address,uint256,uint256,bytes)"]), true)
        await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["batchMint(address,uint256[],uint256[],bytes)"]), true)
        console.log(`  - MINTER role created !`)
        await police.setRoleCapability(ROLES.BURNER, lab.address, lab.interface.getSighash(lab.interface.functions["burn(address,uint256,uint256)"]), true)
        await police.setRoleCapability(ROLES.BURNER, lab.address, lab.interface.getSighash(lab.interface.functions["batchBurn(address,uint256[],uint256[])"]), true)
        console.log(`  - BURNER role created !`)
      } catch (error) {
        console.log(`❌ Actual deployer is not owner of previous police contract`)
      }
      console.log()
    }
  }
  console.log(`------------------------------------------------------------------------------\n`)

  if (getAddress(PROFILE) == ZERO_ADDRESS) {
    await deploy_profile(gbc_address, owner.address, police_address)
  }

  console.log(`------------------------------------------------------------------------------\n`)
  if (getAddress(CLOSET) == ZERO_ADDRESS) {
    const closet = await deploy_closet(gbc_address, lab_address)

    console.log(`🎩 Set roles from LAB to CLOSET`)
    await police.setUserRole(closet.address, ROLES.MINTER, true)
    console.log(`  - MINTER role setted !`)
    await police.setUserRole(closet.address, ROLES.BURNER, true)
    console.log(`  - BURNER role setted !`)
    console.log()
  } else {
    if (getAddress(POLICE) == ZERO_ADDRESS) {
      console.log(`❌ CLOSET already deployed with police we can't set roles`)
    } else {
      console.log(`🔍 Get closet contract at: ${getAddress(CLOSET)}`)
      const closet = await ethers.getContractAt("Closet", getAddress(CLOSET))
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
    console.log()
  }
  console.log(`------------------------------------------------------------------------------\n`)

  sales.forEach(async (sale, index) => {
    const instance = await deploy_sale(sale, gbc_address, lab_address, treasury)

    console.log(`🎩 Set roles from LAB to SALE #${index}`)
    try {
      await police.setUserRole(instance.address, ROLES.MINTER, true)
      console.log(`  - MINTER role setted !`)
    } catch (error) {
      console.log(`❌ Actual deployer is not owner of previous police contract`)
    }
    console.log()
    console.log(`------------------------------------------------------------------------------\n`)
  })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
