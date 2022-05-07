import { BigNumberish } from "ethers"
import { ethers } from "hardhat"
import { SaleExample__factory, SaleExample } from "../../../../typechain-types"
import { deploy } from "../../../utils/deploy"

export type SaleData = {
  item: BigNumberish,
  max_per_tx: BigNumberish
  supply: BigNumberish,
  cost: BigNumberish,
  start: BigNumberish
  whitelist_cost: BigNumberish,
  whitelist_start: BigNumberish,
  whitelist_max_mint: BigNumberish,
}

export default async function(data: SaleData, GBC: string, LAB: string, TREASURY: string): Promise<SaleExample> {
  const [owner] = await ethers.getSigners()

  const factory = new SaleExample__factory(owner)

  const instance = await deploy(factory, TREASURY, data.item, data.supply, data.max_per_tx, data.cost, data.start, data.whitelist_start, data.cost, data.whitelist_max_mint, GBC, LAB)

  await instance.deployed()

  return instance
}

