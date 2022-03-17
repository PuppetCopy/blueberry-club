import { GBC_DESCRIPTION } from '@gambitdao/gbc-middleware'
import { GBC__factory } from "../typechain-types"
import { ethers, run } from "hardhat"

const main = async () => {
  const [signer] = (await ethers.getSigners())

  console.log('Deployer address:', signer.address)

  const contractFactory = new GBC__factory(signer)
  
  const gbcContract = await contractFactory.deploy(GBC_DESCRIPTION.NAME, GBC_DESCRIPTION.SYMBOL, GBC_DESCRIPTION.BASE_URI)
  await gbcContract.deployed()
  console.log(`✅ contract is deployed to ${gbcContract.address}`)

  await run("verify:verify", {
    address: gbcContract.address,
    constructorArguments: [ GBC_DESCRIPTION.NAME, GBC_DESCRIPTION.SYMBOL, GBC_DESCRIPTION.BASE_URI ],
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
