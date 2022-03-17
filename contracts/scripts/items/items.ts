import { labItemDescriptionList, getLabItemTupleIndex } from "@gambitdao/gbc-middleware"
import { ethers } from "hardhat"
import { GBCLab__factory, Public, Public__factory, Profile__factory } from "../../typechain-types"
import { deploy } from "../../utils/common"



export default async function(gbcAddress: string) {
  const [owner] = await ethers.getSigners()

  const itemsFactory = new GBCLab__factory(owner)

  const lab = await deploy(itemsFactory)

  const MINTER = await lab.MINTER()
  const DESIGNER = await lab.DESIGNER()
  await (await lab.grantRole(DESIGNER, owner.address)).wait()

  const saleFactory = new Public__factory(owner)

  const items: Public[] = []

  for (const itemDescription of labItemDescriptionList) {
    console.log(`🏁 Creating Lab Item: ${itemDescription.name}`)

    const sale = await deploy(saleFactory, lab.address, gbcAddress, itemDescription.maxSupply, itemDescription.id)
    await (await lab.grantRole(MINTER, sale.address)).wait()
    const itemType = getLabItemTupleIndex(itemDescription.id)
    await (await lab.addItem(itemType + 1, itemDescription.id)).wait()

    items.push(sale)
  }

  const profileFactory = new Profile__factory(owner)
  const profile = await deploy(profileFactory, gbcAddress)


  return { lab, items, profile }
}

