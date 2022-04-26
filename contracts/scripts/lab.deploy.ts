import { GBC_ADDRESS, GBC_DESCRIPTION } from "@gambitdao/gbc-middleware"
import { ethers } from "hardhat"
import { GBC__factory, Profile__factory } from "../typechain-types"
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
  // const { manager } = await deployManager(GBC_ADDRESS.GBC, GBC_ADDRESS.LAB)

  const profileFactory = new Profile__factory(owner)
  const profile = await deploy(profileFactory, gbc.address)

  console.log('gbc', gbc.address)
  console.log('lab', lab.address)
  console.log('manager', manager.address)
  console.log('profile', profile.address)
  console.log('Sales', ...items.map(({ address }) => address))

})().catch(err => console.error(err))

