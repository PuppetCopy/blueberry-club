import { ethers } from "hardhat"
import { Closet__factory, Closet } from "../../../typechain-types"

export default async function(GBC: string, LAB: string): Promise<Closet> {
  const [owner] = await ethers.getSigners()

  const factory = new Closet__factory(owner)

  const instance = await factory.deploy(GBC, LAB)

  await instance.deployed()

  return instance
}

