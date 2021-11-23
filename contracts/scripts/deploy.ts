import { GBC__factory } from 'contracts'
import { ethers } from "hardhat"


// .env file (should be ignored from .gitignore)
import dotEnv from 'dotenv'
dotEnv.config()

const main = async () => {
  const [signer] = (await ethers.getSigners())

  console.log('Your wallet address:', signer.address)

  const contractFactory = new GBC__factory(signer)

  const gbcContract = await contractFactory.deploy('GMX Blueberry Club', 'GBC', 'ipfs://hash/')
  await gbcContract.deployed()
  console.log(`🚀 contract is deployed to ${gbcContract.address} 🚀`)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
