// @ts-nocheck


import { ethers } from "hardhat"
import { GBCLab__factory, Manager__factory, } from "../../typechain-types"
import { deploy } from "../../utils/common"



export default async function(gbcAddress: string, labAddress: string) {
  const [owner] = await ethers.getSigners()

  const managerFactory = new Manager__factory(owner)

  const manager = await deploy(managerFactory, gbcAddress, labAddress)
  const lab = GBCLab__factory.connect(labAddress, owner)

  const MINTER = await lab.MINTER()
  const BURNER = await lab.BURNER()
  await (await lab.grantRole(MINTER, manager.address)).wait()
  await (await lab.grantRole(BURNER, manager.address)).wait()


  return { manager }
}

