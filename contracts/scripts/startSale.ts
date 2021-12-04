import { GBC__factory } from 'contracts'
import { ethers } from "hardhat"
import { ADDRESS_ZERO, DEPLOYED_CONTRACT } from "@gambitdao/gbc-middleware"

 
// .env file (should be ignored from .gitignore)
import dotEnv from 'dotenv'
import { parseEther } from 'ethers/lib/utils'
dotEnv.config()

const main = async () => {
  const [signer] = (await ethers.getSigners())

  console.log('Deployer address:', signer.address)
  console.log('Contract address:', DEPLOYED_CONTRACT)

  const contract = GBC__factory.connect(DEPLOYED_CONTRACT, signer)
  
  await contract.deployed()
  console.log(`✅ contract is deployed`)


  // await (await contract.withdraw(ADDRESS_ZERO, 0n, {})).wait()
  // await (await contract.startWLMint()).wait()
  // console.log(`✅ whitelist sale started`)

  await (await contract.startPublicSale()).wait()
  console.log(`✅ public sale started`)
  // await wlMintQuery

  console.log(`🚀 Sale started 🚀`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
