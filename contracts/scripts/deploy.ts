import { PROJECT } from '@gambitdao/gbc-middleware'
import { GBC__factory } from 'contracts'
import { ethers, run } from "hardhat"

const main = async () => {
  const [signer] = (await ethers.getSigners())

  console.log('Deployer address:', signer.address)

  const contractFactory = new GBC__factory(signer)
  
  const gbcContract = await contractFactory.deploy(PROJECT.NAME, PROJECT.SYMBOL, PROJECT.BASE_URI)
  await gbcContract.deployed()
  console.log(`✅ contract is deployed to ${gbcContract.address}`)

  await run("verify:verify", {
    address: gbcContract.address,
    constructorArguments: [ PROJECT.NAME, PROJECT.SYMBOL, PROJECT.BASE_URI ],
  })

  console.log(`✅ Contract ${gbcContract.address} has been verified`)
  console.log(`🚀 All done!`)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
