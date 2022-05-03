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

  console.log(`DEPLOYER WIZARD 🧙‍♂️ (by IrvingDev)`)
  console.log(`The deployer and owner by default of the contracts will be ${owner.address}`)

  const treasury = getAddress(TREASURY) == ZERO_ADDRESS ? owner.address : getAddress(TREASURY)

  console.log(`Treasury address: ${treasury}`)

  let gbc_address = getAddress(GBC)

  if (gbc_address == ZERO_ADDRESS) {
    console.log(`\nDeploying GBC contract...`)
    const gbc = await deploy_gbc()
    console.log(`GBC contract deployed !`)
    console.log(`Address: ${gbc.address}`)
    gbc_address = gbc.address
  }

  let police_address = getAddress(POLICE)
  let police: Police

  if (police_address == ZERO_ADDRESS) {
    console.log(`\nDeploying POLICE contract...`)
    police = await deploy_police()
    console.log(`POLICE contract deployed !`)
    console.log(`Address: ${police.address}`)
    police_address = police.address
  } else {
    police = await ethers.getContractAt("Police", police_address)
  }

  let lab_address = getAddress(LAB)
  let lab: GBCLab

  if (lab_address == ZERO_ADDRESS) {
    console.log(`\nDeploying LAB contract...`)
    lab = await deploy_lab(owner.address, police_address)
    console.log(`LAB contract deployed !`)
    console.log(`Address: ${lab.address}`)
    lab_address = lab.address

    console.log(`\nCreating roles for LAB`)
    await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["mint(address,uint256,uint256,bytes)"]), true)
    await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["batchMint(address,uint256[],uint256[],bytes)"]), true)
    console.log(`MINTER role created !`)
    await police.setRoleCapability(ROLES.BURNER, lab.address, lab.interface.getSighash(lab.interface.functions["burn(address,uint256,uint256)"]), true)
    await police.setRoleCapability(ROLES.BURNER, lab.address, lab.interface.getSighash(lab.interface.functions["batchBurn(address,uint256[],uint256[])"]), true)
    console.log(`CREATOR role created !`)
  } else {
    if (getAddress(POLICE) == ZERO_ADDRESS) {
      return console.log(`We cannot set a new POLICE with old LAB`)
    }
    console.log(`\nGet LAB contract`)
    lab = await ethers.getContractAt("GBCLab", lab_address)
    console.log(`\nCreating/Overwrite roles for LAB`)
    await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["mint(address,uint256,uint256,bytes)"]), true)
    await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["batchMint(address,uint256[],uint256[],bytes)"]), true)
    console.log(`MINTER role created !`)
    await police.setRoleCapability(ROLES.BURNER, lab.address, lab.interface.getSighash(lab.interface.functions["burn(address,uint256,uint256)"]), true)
    await police.setRoleCapability(ROLES.BURNER, lab.address, lab.interface.getSighash(lab.interface.functions["batchBurn(address,uint256[],uint256[])"]), true)
  }

  if (getAddress(PROFILE) == ZERO_ADDRESS) {
    console.log(`\nDeploying PROFILE contract...`)
    const profile = await deploy_profile(gbc_address, owner.address, police_address)
    console.log(`PROFILE contract deployed !`)
    console.log(`Address: ${profile.address}`)
  }

  if (getAddress(CLOSET) == ZERO_ADDRESS) {
    console.log(`\nDeploying CLOSET contract...`)
    const closet = await deploy_closet(gbc_address, lab_address)
    console.log(`CLOSET contract deployed !`)
    console.log(`Address: ${closet.address}`)

    console.log(`\nSet the MINTER and BURNER ROLE`)
    await police.setUserRole(closet.address, ROLES.MINTER, true)
    console.log(`MINTER setted !`)
    await police.setUserRole(closet.address, ROLES.BURNER, true)
    console.log(`BURNER setted !`)
  } else {
    console.log(`\nGet CLOSET contract`)
    const closet = await ethers.getContractAt("Closet", getAddress(CLOSET))
    console.log(`\nSet the MINTER and BURNER ROLE`)
    await police.setUserRole(closet.address, ROLES.MINTER, true)
    console.log(`MINTER setted !`)
    await police.setUserRole(closet.address, ROLES.BURNER, true)
    console.log(`BURNER setted !`)
  }

  sales.forEach(async (sale, index) => {
    console.log(`\nDeploying sale ${index} contract...`)
    const instance = await deploy_sale(sale, gbc_address, lab_address, treasury)
    console.log(`sale ${index} contract deployed !`)
    console.log(`Address: ${instance.address}`)

    console.log(`\nSet the MINTER role`)
    await police.setUserRole(instance.address, ROLES.MINTER, true)
    console.log(`MINTER setted !`)
  })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
