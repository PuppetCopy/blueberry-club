import { ethers } from "hardhat"
import { GBCLab__factory, GBCLab } from "../../../typechain-types"

export const ROLES = {
  MINTER: 0,
  BURNER: 1,
  CREATOR: 2
}


export default async function(owner: string, authority: string): Promise<GBCLab> {
  const [signer] = await ethers.getSigners()

  const factory = new GBCLab__factory(signer)

  const instance = await factory.deploy(owner, authority)

  await instance.deployed()

  return instance
}

