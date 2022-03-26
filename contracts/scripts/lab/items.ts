import { saleDescriptionList, getLabItemTupleIndex, hasWhitelistSale } from "@gambitdao/gbc-middleware"
import { ethers } from "hardhat"
import { GBCLab__factory, Sale, Sale__factory, Profile__factory } from "../../typechain-types"
import { deploy } from "../../utils/common"



export default async function(gbcAddress: string) {
  const [owner] = await ethers.getSigners()

  const itemsFactory = new GBCLab__factory(owner)

  const lab = await deploy(itemsFactory)
  // const lab = GBCLab__factory.connect(GBC_ADDRESS.LAB, owner)

  const MINTER = await lab.MINTER()
  const DESIGNER = await lab.DESIGNER()
  await (await lab.grantRole(DESIGNER, owner.address)).wait()

  const saleFactory = new Sale__factory(owner)

  const items: Sale[] = []

  for (const saleDescription of saleDescriptionList) {
    console.log(`🏁 Creating Lab Item: ${saleDescription.name}`)

    const isWhitelist = hasWhitelistSale(saleDescription)

    const sale = isWhitelist
      ? await deploy(saleFactory,
        saleDescription.id, saleDescription.maxSupply, saleDescription.maxPerTx,
        saleDescription.publicCost, saleDescription.publicStartDate,
        saleDescription.whitelistStartDate, saleDescription.whitelistCost, saleDescription.whitelistMax,
        gbcAddress, lab.address
      )
      : await deploy(saleFactory,
        saleDescription.id, saleDescription.maxSupply, saleDescription.maxPerTx,
        saleDescription.publicCost, saleDescription.publicStartDate,
        0, 0, 0,
        gbcAddress, lab.address
      )
      

    await (await lab.grantRole(MINTER, sale.address)).wait()
    const itemType = getLabItemTupleIndex(saleDescription.id)
    await (await lab.addItem(itemType + 1, saleDescription.id)).wait()

    items.push(sale)
  }

  const profileFactory = new Profile__factory(owner)
  const profile = await deploy(profileFactory, gbcAddress)


  return { lab, items, profile }
}

