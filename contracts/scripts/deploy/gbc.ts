import { ethers } from "hardhat"
import { GBC__factory, GBC } from "../../typechain-types"

export const ROLES = {
  MINTER: 0
}

export default async function(): Promise<GBC> {
  const [owner] = await ethers.getSigners()

  const factory = new GBC__factory(owner)

  const instance = await factory.deploy("Blueberry Club", "GBC", "")

  await instance.deployed()

  return instance
}

