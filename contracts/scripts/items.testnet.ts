import { GBC_DESCRIPTION } from "@gambitdao/gbc-middleware"
import { ethers } from "hardhat"
import { GBC__factory } from "../typechain-types"
import { deploy } from "../utils/common"

import items from "./items/items"

(async () => {
  const [owner] = await ethers.getSigners()

  const gbcFactory = new GBC__factory(owner)
  
  const gbc = await deploy(gbcFactory, GBC_DESCRIPTION.NAME, GBC_DESCRIPTION.SYMBOL, GBC_DESCRIPTION.BASE_URI)
  await gbc.adminMint(1, owner.address)

  await items(gbc.address)
})().catch(err => console.error(err))

