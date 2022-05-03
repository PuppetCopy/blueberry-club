import { ethers } from "hardhat"
import { Profile__factory, Profile } from "../../../typechain-types"

export default async function(GBC: string, owner: string, authority: string): Promise<Profile> {
  const [signer] = await ethers.getSigners()

  const factory = new Profile__factory(signer)

  const instance = await factory.deploy(GBC, owner, authority)

  await instance.deployed()

  return instance
}

