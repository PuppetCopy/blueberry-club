import { ethers } from "hardhat"

export const now = async () => {
  const blockNumber = await ethers.provider.getBlockNumber()
  const block = await ethers.provider.getBlock(blockNumber)
  return block.timestamp
}

