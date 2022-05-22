import { ContractFactory } from "ethers"
import { AddressZero, getAccountExplorerUrl } from "@gambitdao/gmx-middleware"
import { run, network, ethers } from "hardhat"
import getAddress from "./getAddress"


export async function deploy<T extends ContractFactory>(contractFactory: T, ...constructorArguments: Parameters<T['deploy']>): Promise<ReturnType<T['deploy']>> {
  const contract = await contractFactory.deploy(...constructorArguments)
  const address = contract.address
  console.log(`⛽️ Estimated cost: ${ethers.utils.formatEther(contract.deployTransaction.gasLimit.mul(contract.deployTransaction.gasPrice!))} ETH`)
  console.log(`🏷  Hash: ${contract.deployTransaction.hash}`)
  await contract.deployed()
  console.log(`✅ Deployed ${(contractFactory.constructor.name as string).replace(`__factory`, ``)}: ${address}`)
  const tx = await ethers.provider.getTransactionReceipt(contract.deployTransaction.hash)
  console.log(`💸 Cost: ${ethers.utils.formatEther(tx.gasUsed.mul(tx.effectiveGasPrice))} ETH`)

  if (network.config.chainId == 31337 || network.config.chainId == undefined) {
    console.log(`⏩ Skipping verification on local network\n`)
    return contract
  }

  const explorerUrl = getAccountExplorerUrl(network.config.chainId, address)

  await run("verify:verify", { address, constructorArguments, })
    .then(() => {
      console.log(`🏁 ${network.name} Verified: ${explorerUrl}\n`)
    })
    .catch(err => {
      if (err.message.indexOf('Already Verified')) {
        console.warn(`🏁 ${network.name} Already Verified: ${explorerUrl}\n`)
      } else {
        console.error(err)
      }
    })
  
  await contract.deployed()

  return contract
}


export async function connectOrDeploy<T extends typeof ContractFactory, RT extends InstanceType<T>>(givenAddress: any, ctor: T, ...constructorArguments: Parameters<RT['deploy']>): Promise<ReturnType<RT['deploy']>> {
  const contractAddress = getAddress(givenAddress)
  const [signer] = await ethers.getSigners()

  if (contractAddress == AddressZero) {
    // @ts-ignore
    const factory = new ctor(signer)

    return deploy(factory, ...constructorArguments)
  }

  console.log(`🔍 Get existing ${ctor.name} contract at: ${contractAddress}`)

  // @ts-ignore
  return ctor.connect(contractAddress, signer)
}
