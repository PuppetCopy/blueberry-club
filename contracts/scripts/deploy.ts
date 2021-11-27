import { GBC__factory } from 'contracts'
import { ethers, run, network } from "hardhat"
// import { NETWORK_METADATA, CHAIN } from "@gambitdao/wallet-link"


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

  if (network.name !== 'localhost') {
    // const [explorer] = NETWORK_METADATA[network.config.chainId as CHAIN].blockExplorerUrls || []
    // console.log(`Verifying contract on etherscan ${explorer}/address/${gbcContract.address}`)

    const verificion = await run("verify:verify", {
      address: gbcContract.address,
      constructorArguments: [ 'GMX Blueberry Club', 'GBC', 'ipfs://hash/', ],
    })
    console.log(verificion)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
