import { GBC__factory } from "../typechain-types"
import { ethers } from "hardhat"
import { GBC_ADDRESS } from "@gambitdao/gbc-middleware"

 
// .env file (should be ignored from .gitignore)
import dotEnv from 'dotenv'
dotEnv.config()

const main = async () => {
  const [signer] = await ethers.getSigners()

  console.log('Deployer address:', signer.address)
  console.log('Contract address:', GBC_ADDRESS.GBC)

  const contract = GBC__factory.connect(GBC_ADDRESS.GBC, signer)
  
  await contract.deployed()
  console.log(`✅ contract is deployed`)

  // .1 pre-mint 200 treasury/team nfts
  // await contract.setWLSigner('0xe660664CF2Ee9f6fEBc80Dc0b03c2757f420d539'.toLocaleLowerCase())
  // console.log(`✅ set Signer`)

  // .2 pre-mint 30 send to team, 170 treasury nfts
  // await (await contract.adminMint(25, '0xaa93840C66058F61814192742Dbc4f3f8346c16b')).wait()
  // await (await contract.adminMint(145, '0xDe2DBb7f1C893Cc5E2f51CbFd2A73C8a016183a0')).wait()
  // console.log(`✅ admin mint`)

  // .3 Allow whitelist free claim for 48hrs
  // await (await contract.startWLMint()).wait()
  // console.log(`🚀 whitelist sale started`)

  // .4 Allow whitelist free claim for 48hrs
  // await (await contract.transferOwnership('0xDe2DBb7f1C893Cc5E2f51CbFd2A73C8a016183a0')).wait()
  // console.log(`✅ Tranfer ownership`)

  // .5 Start Public Sale
  // await (await contract.startPublicSale()).wait()
  // console.log(`🚀 public sale started`)

  // .6 Send public mint funds into treasury
  // await (await contract.withdraw(ADDRESS_ZERO, 1000000000000000000n)).wait()


  // .~ Change metadata
  // await (await contract.setBaseTokenURI('ipfs://Qmdk3qxoJAfd8MreTbx1GiZLztueogjFQRh7WYAdguSaBm/')).wait()
  // console.log(`✅ Tranfer ownership`)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
