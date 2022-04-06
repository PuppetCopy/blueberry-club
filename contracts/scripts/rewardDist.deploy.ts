import { GBC_ADDRESS, REWARD_DISTRIBUTOR } from "@gambitdao/gbc-middleware"
import { ethers } from "hardhat"
import { RewardDistributor__factory } from "../typechain-types"
import { deploy } from "../utils/common"


(async () => {
  const [owner] = await ethers.getSigners()

  const gbcFactory = new RewardDistributor__factory(owner)

  const dist = await deploy(gbcFactory, GBC_ADDRESS.WETH, GBC_ADDRESS.GBC, REWARD_DISTRIBUTOR.distributionPeriod, REWARD_DISTRIBUTOR.activityPeriod)

  await (await dist.initialize('0x9E7f78EafAEBaf1094202FFA0835157fC5C3ADe0')).wait()

})().catch(err => console.error(err))

