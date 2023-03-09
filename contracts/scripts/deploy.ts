import {
  Profile__factory, GBCLab__factory, Police__factory, Closet__factory, GBC__factory, Public__factory, Holder__factory,
  Mintable, Whitelist__factory, DaoGovernor__factory
} from "../typechain-types"
import { AddressZero } from "@gambitdao/gmx-middleware"
import { ethers, network } from "hardhat"
import getAddress, { ZERO_ADDRESS } from "../utils/getAddress"
import { connectOrDeploy } from "../utils/deploy"
import { GBC_ADDRESS, mintLabelMap, saleDescriptionList, SaleType } from "@gambitdao/gbc-middleware"
import { getMerkleProofs } from "../utils/whitelist"
import { storeLabImageOnIpfs } from "./image"
import { CHAIN } from "@gambitdao/const"



enum ROLES {
  MINTER,
  BURNER,
  DESIGNER
}
export default ROLES



const main = async () => {

  const [creator] = await ethers.getSigners()

  console.clear()

  console.log(`DEPLOYER WIZARD 🧙‍♂️ (by IrvingDev)`)


  console.log(`------------------------------------------------------------------------------\n`)
  console.log(`🔑 Deployer: ${creator.address}`)

  const owner = getAddress(GBC_ADDRESS.TREASURY_ARBITRUM) == ZERO_ADDRESS ? creator.address : getAddress(GBC_ADDRESS.TREASURY_ARBITRUM)

  console.log(`💰 Treasury address: ${owner}\n`)
  console.log(`------------------------------------------------------------------------------\n`)

  const gbc = await connectOrDeploy(GBC_ADDRESS.GBC, GBC__factory, "Blueberry Club", "GBC", "")


  console.log(`------------------------------------------------------------------------------\n`)
  const police = await connectOrDeploy(GBC_ADDRESS.POLICE, Police__factory, creator.address)
  console.log(`------------------------------------------------------------------------------\n`)

  const lab = await connectOrDeploy(GBC_ADDRESS.LAB, GBCLab__factory, owner, police.address)

  if (getAddress(GBC_ADDRESS.LAB) == AddressZero) {
    try {
      console.log(`✋ Adding roles for LAB`)

      console.log(`  - MINTER role created !`)
      await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["mint(address,uint256,uint256,bytes)"]), true)
      await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["batchMint(address,uint256[],uint256[],bytes)"]), true)
      console.log(`  - BURNER role created !`)
    } catch (error) {
      console.log(`❌ Actual deployer is not owner of previous police contract`)
    }
  }

  console.log(`------------------------------------------------------------------------------\n`)

  await connectOrDeploy(GBC_ADDRESS.PROFILE, Profile__factory, gbc.address, owner, police.address)

  console.log(`------------------------------------------------------------------------------\n`)

  await connectOrDeploy(GBC_ADDRESS.CLOSET, Closet__factory, gbc.address, lab.address)

  await connectOrDeploy(GBC_ADDRESS.GOVERNOR, DaoGovernor__factory, gbc.address)


  for (const sale of saleDescriptionList) {
    let storeIpfsQuery: any
    const noContractDeployed = sale.mintRuleList.every(rule => rule.contractAddress === '')


    if (noContractDeployed && network.config.chainId === CHAIN.ARBITRUM) {
      storeIpfsQuery = storeLabImageOnIpfs(sale)
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

      // if (owner == creator.address) {
      console.log(`🎩 Set roles from LAB to name: ${sale.name} sale: ${mintLabelMap[rule.type]} SALE`)
      await police.setUserRole(saleContract.address, ROLES.MINTER, true)
      console.log(`  - MINTER role set !`)
      // }


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