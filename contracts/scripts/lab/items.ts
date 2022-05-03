import { saleDescriptionList, getLabItemTupleIndex, hasWhitelistSale, GBC_ADDRESS } from "@gambitdao/gbc-middleware"
import { ethers } from "hardhat"
import { GBCLab__factory, SaleExample } from "../../typechain-types"
import { Sale__factory } from "../../typechain-types/factories/contracts/mint"
import { deploy } from "../../utils/common"

const MINTER = "0x 4d 49 4e 54 45 52 00 00".replaceAll(' ', '') // MINTER string to bytes8

export default async function(gbcAddress: string) {
  const [owner] = await ethers.getSigners()

  const itemsFactory = new GBCLab__factory(owner)

  const lab = await deploy(itemsFactory)
  // const lab = GBCLab__factory.connect(GBC_ADDRESS.LAB, owner)

  const MINTER = await lab.MINTER()
  const BURNER = await lab.BURNER()

  const saleFactory = new Sale__factory(owner)

  const items: SaleExample[] = []

  for (const saleDescription of saleDescriptionList) {
    console.log(`🏁 Creating Lab Item: ${saleDescription.name}`)

    const isWhitelist = hasWhitelistSale(saleDescription)

    const sale = isWhitelist
      ? await deploy(saleFactory,
        GBC_ADDRESS.TREASURY_ARBITRUM,
        saleDescription.id, saleDescription.maxSupply, saleDescription.maxPerTx,
        saleDescription.publicCost, saleDescription.publicStartDate,
        saleDescription.whitelistStartDate, saleDescription.whitelistCost, saleDescription.whitelistMax,
        gbcAddress, lab.address
      )
      : await deploy(saleFactory,
        GBC_ADDRESS.TREASURY_ARBITRUM,
        saleDescription.id, saleDescription.maxSupply, saleDescription.maxPerTx,
        saleDescription.publicCost, saleDescription.publicStartDate,
        0, 0, 0,
        gbcAddress, lab.address
      )


    await (await lab.grantRole(MINTER, sale.address)).wait()
    await (await lab.grantRole(BURNER, sale.address)).wait()
    const itemType = getLabItemTupleIndex(saleDescription.id)
    await (await lab.create(itemType + 1, saleDescription.id)).wait()

    items.push(sale)
  }


  return { lab, items }
}

