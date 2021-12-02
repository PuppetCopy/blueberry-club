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
  console.log(`✅ contract is deployed to ${gbcContract.address}`)

  await run("verify:verify", {
    address: gbcContract.address,
    constructorArguments: [ name, symbol, ipfs, ],
  })
    .catch(err => console.error(err))
  console.log(`✅ Contract ${gbcContract.address} has been verified`)


  await gbcContract.setWLSigner('0xe660664CF2Ee9f6fEBc80Dc0b03c2757f420d539')
  console.log(`✅ set Signer`)
  await gbcContract.adminMint(50, '0x04d52e150E49c1bbc9Ddde258060A3bF28D9fD70')
  await gbcContract.adminMint(50, '0x04d52e150E49c1bbc9Ddde258060A3bF28D9fD70')
  console.log(`✅ admin mint`)

  console.log(`🚀 All done!`)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
