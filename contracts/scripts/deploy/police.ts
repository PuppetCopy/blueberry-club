import { ethers } from "hardhat"
import { Police__factory, Police } from "../../typechain-types"

export const ROLES = {
  MINTER: 0,
  BURNER: 1
}

export default async function(): Promise<Police> {
  const [owner] = await ethers.getSigners()

  const factory = new Police__factory(owner)

  const instance = await factory.deploy()

  await instance.deployed()

  return instance
}

