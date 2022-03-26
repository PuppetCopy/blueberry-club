import { GBC_ADDRESS, GBC_DESCRIPTION } from "@gambitdao/gbc-middleware"
import { ethers } from "hardhat"
import { GBC__factory } from "../typechain-types"
import { deploy } from "../utils/common"

import deployLab from "./lab/items"
import deployManager from "./lab/manager"

(async () => {
  const [owner] = await ethers.getSigners()

  const gbcFactory = new GBC__factory(owner)
  
  const gbc = await deploy(gbcFactory, GBC_DESCRIPTION.NAME, GBC_DESCRIPTION.SYMBOL, GBC_DESCRIPTION.BASE_URI)
  // const gbc = GBC__factory.connect(GBC_ADDRESS.GBC, owner)

  await (await gbc.startPublicSale()).wait()
  await gbc.adminMint(1, owner.address)

  const { items, lab } = await deployLab(gbc.address)
  const { manager } = await deployManager(gbc.address, lab.address)

  console.log('Sales', ...items.map(({ address }) => address))
})().catch(err => console.error(err))

// 