import { ethers } from "hardhat"
import { Closet__factory, Closet } from "../../../typechain-types"
import { deploy } from "../../utils/deploy"

export default async function(GBC: string, LAB: string): Promise<Closet> {
  const [owner] = await ethers.getSigners()

  const factory = new Closet__factory(owner)

  const instance = await deploy(factory, GBC, LAB)

  await instance.deployed()

  return instance
}

