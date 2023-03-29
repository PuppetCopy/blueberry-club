import {

  Whitelist__factory
} from "../typechain-types"
import { ethers } from "hardhat"
import { connectOrDeploy, verify } from "../utils/deploy"
import { GBC_ADDRESS } from "@gambitdao/gbc-middleware"


const toTime = (...params: Parameters<typeof Date.UTC>) => Math.floor(Date.UTC(...params) / 1000)


const main = async () => {

  const [creator] = await ethers.getSigners()

  console.clear()

  const { cost, start, supply, finish, accountLimit } = {
    supply: 167,
    cost: 0n,
    start: toTime(2023, 1, 24, 18),
    finish: toTime(2024, 0, 1, 18),
    accountLimit: 1,
  }


  await verify('0x2dbCEC2a8975eEd3f6d11322d97e0A4fA815c5a2', 227, 0, GBC_ADDRESS.TREASURY_ARBITRUM, GBC_ADDRESS.LAB, { accountLimit, cost, finish, start, supply }, '0xf84a996accdfc963f01163cf840a4bcb437aefd9004338484d9697415ca3b43c')



}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })