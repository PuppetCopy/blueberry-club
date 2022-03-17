import { ContractFactory } from "@ethersproject/contracts"
import { getAccountExplorerUrl } from "@gambitdao/gmx-middleware"
import { run, network } from "hardhat"


export async function deploy<T extends ContractFactory>(contractFactory: T, ...constructorArguments: Parameters<T['deploy']>): Promise<ReturnType<T['deploy']>> {
  const contract = await contractFactory.deploy(...constructorArguments)
  const address = contract.address

  await contract.deployed()
  console.log(`✅ Deplyed ${contractFactory.constructor.name}: ${address}`)
    
  await run("verify:verify", { address, constructorArguments, }).catch(err => console.log('Etherscan verification failed, the contract may have been verified'))

  const explorerUrl = getAccountExplorerUrl(network.config.chainId!, address)
  console.log(`🏁 ${network.name} Verified: ${explorerUrl}`)

  return contract
}