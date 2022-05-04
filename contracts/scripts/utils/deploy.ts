import { ContractFactory } from "@ethersproject/contracts"
import { getAccountExplorerUrl } from "@gambitdao/gmx-middleware"
import { run, network, ethers } from "hardhat"


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

  await run("verify:verify", { address, constructorArguments, }).catch(err => console.log('⚠️ Etherscan verification failed, the contract may have been verified'))

  const explorerUrl = getAccountExplorerUrl(network.config.chainId, address)
  console.log(`🏁 ${network.name} Verified: ${explorerUrl}\n`)

  return contract
}
