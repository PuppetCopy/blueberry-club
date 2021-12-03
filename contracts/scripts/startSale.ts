import { GBC__factory } from 'contracts'
import { ethers } from "hardhat"

const DEPLOYED_CONTRACT = process.env.DEPLOYED_CONTRACT

if (DEPLOYED_CONTRACT === undefined) {
  throw new Error('.env file is missing DEPLOYED_CONTRACT adress')
}


// .env file (should be ignored from .gitignore)
import dotEnv from 'dotenv'
dotEnv.config()

const main = async () => {
  const [signer] = (await ethers.getSigners())

  console.log('Your wallet address:', signer.address)

  const contract = GBC__factory.connect(DEPLOYED_CONTRACT, signer)
  
  await contract.deployed()
  const publicSaleQuery = contract.startPublicSale()
  const wlMintQuery = contract.startWLMint()

  await publicSaleQuery
  console.log(`✅ public sale started`)
  await wlMintQuery
  console.log(`✅ whitelist sale started`)

  console.log(`🚀 Sale started 🚀`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })