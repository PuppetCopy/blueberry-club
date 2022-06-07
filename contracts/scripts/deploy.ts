import {
  Profile__factory, GBCLab__factory,
  Police__factory, Closet__factory, GBC__factory, MerkleTpl__factory, PublicTpl__factory, HolderWhitelistTpl__factory, Sale,
} from "../typechain-types"
import { AddressZero } from "@gambitdao/gmx-middleware"

import { ethers } from "hardhat"

import getAddress, { ZERO_ADDRESS } from "../utils/getAddress"
import { connectOrDeploy } from "../utils/deploy"
import { GBC_ADDRESS, saleConfig, saleDescriptionList, saleLastDate, saleMaxSupply, SaleType } from "@gambitdao/gbc-middleware"
import { getMerkleProofs } from "../utils/whitelist"

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
const TREASURY = GBC_ADDRESS.TREASURY_ARBITRUM // Multisig or you personal address (if you leave it blank it will be the owner address)
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

    const createMode = getAddress(config.contractAddress) === AddressZero

    if (fstMintRule.type === SaleType.Public) {
      const { amount, cost, start, transaction } = fstMintRule

      sale = await connectOrDeploy(config.contractAddress, PublicTpl__factory, config.id, owner, TREASURY, lab.address, saleState, mintState, { amount, cost, start, transaction })
    } else if (fstMintRule.type === SaleType.holder) {
      const { amount, cost, start, transaction, walletMintable } = fstMintRule
      sale = await connectOrDeploy(config.contractAddress, HolderWhitelistTpl__factory, config.id, owner, TREASURY, gbc.address, lab.address, saleState, mintState, { totalMintable: amount, cost, start, transaction, walletMintable })
    } else {
      if (createMode) {
        const res = getMerkleProofs(fstMintRule.addressList, fstMintRule)
        console.log(res.proofs)
        console.log('root: ', res.merkleRoot)

        sale = await connectOrDeploy(config.contractAddress, MerkleTpl__factory, config.id, owner, TREASURY, lab.address, saleState, mintState, res.merkleRoot)
      } else {
        sale = MerkleTpl__factory.connect(config.contractAddress, creator)
      }
    }

    console.log(`🎩 Set roles from LAB to ${config.name} SALE`)

    if (createMode) {
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
