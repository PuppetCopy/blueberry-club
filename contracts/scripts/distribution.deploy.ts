import { GBC_ADDRESS } from "@gambitdao/gbc-middleware"
import { ethers } from "hardhat"
import { Distributor__factory } from "../typechain-types"
import { deploy } from "../utils/common"


(async () => {
  const [owner] = await ethers.getSigners()

  const gbcFactory = new Distributor__factory(owner)

  await deploy(gbcFactory, GBC_ADDRESS.WETH, GBC_ADDRESS.GBC)

})().catch(err => console.error(err))

