import { GBC__factory } from 'contracts'
import { ethers, run } from "hardhat"

const main = async () => {
  const [signer] = (await ethers.getSigners())

  console.log('Your wallet address:', signer.address)

  const contractFactory = new GBC__factory(signer)
  const name = 'GMX Blueberry Club'
  const symbol = 'GBC'
  const ipfs = 'ipfs://hash/'
  const gbcContract = await contractFactory.deploy(name, symbol, ipfs)
  await gbcContract.deployed()
  console.log(`🚀 contract is deployed to ${gbcContract.address} 🚀`)

  const verifyTask = await run("verify:verify", {
    address: gbcContract.address,
    constructorArguments: [ name, symbol, ipfs, ],
  })

  console.log(`🚀 Contract ${gbcContract.address} has been verified 🚀`)
  console.log(verifyTask)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
