import { expect } from "chai"
import hre from "hardhat"
import { time } from "@nomicfoundation/hardhat-network-helpers"
import { ethers } from "hardhat"
import {
  Lottery,
  MockRandomizer__factory,
  Police__factory,
  Lottery__factory,
  GBCLab__factory
} from "../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { solidityKeccak256 } from "ethers/lib/utils"

const gbcLabsAddr = "0xF4f935F4272e6FD9C779cF0036589A63b48d77A7"
const gbcAddr = "0x17f4BAa9D35Ee54fFbCb2608e20786473c7aa49f"

describe("Main pathway", function () {
  async function deployFixture() {
    const [admin, user1] = await ethers.getSigners()

    const Police = new Police__factory(admin)
    const police = await Police.deploy(admin.address)

    const Lab = new GBCLab__factory(admin)
    const lab = Lab.deploy(admin.address, police.address)

    const randomizer = await new MockRandomizer__factory(admin).deploy()
    const LotteryFactory = new Lottery__factory(admin)
    const lottery = await LotteryFactory.deploy(police.address, randomizer.address)

    return { lottery, admin, lab, police }
  }

  // async function setPermissionsFixture() {
  //   const { lottery, deployer, lab, police } = await deployFixture()


  //   // lab.address, lab.interface.getSighash(lab.interface.functions["mint(address,uint256,uint256,bytes)"]), true
  //   await police.setRoleCapability(
  //     ROLES.MINTER,
  //     gbcLabsAddr,
  //     "0x731133e9", // msg.sig of mint()
  //     true
  //   )

  //   // Make lotteryAddr a minter
  //   await police.setUserRole(lottery.address, ROLES.MINTER, true)

  //   // ---------- //

  //   // -- LOTTERY_ADMIN -- //
  //   const fragList = [
  //     lottery.interface.functions['createSale(address,address,uint256,uint256,uint256,uint256)'],
  //     lottery.interface.functions['withdrawRandomizer(uint256)'],
  //     lottery.interface.functions['modifyRandomizerCallbackGas(uint256)'],
  //   ]

  //   for (const frag of fragList) {
  //     await police.setRoleCapability(
  //       LOTTERY_ADMIN_ROLE_NUMBER,
  //       lottery.address,
  //       lottery.interface.getSighash(frag),
  //       true
  //     )
  //   }

  //   await police.setUserRole(deployer.address, LOTTERY_ADMIN_ROLE_NUMBER, true)

  //   return { lottery, admin }
  // }

  async function createSale(signer: SignerWithAddress, lottery: Lottery) {
    const latestBlock = await ethers.provider.getBlock('latest')
    // get the saleId from the event

    const saleArgs = [
      gbcAddr,
      gbcLabsAddr,
      420,
      2,
      ethers.utils.parseEther("0.1"),
      latestBlock.timestamp + 60 * 60 * 24 * 7 // 1 week from now
    ] as const

    const eventId = solidityKeccak256(
      ['address', 'address', "uint256", "uint256", "uint256", "uint256"],
      saleArgs
    )

    const tx = await lottery.connect(signer).createEvent(...saleArgs)

    // const event = receipt?.events?.[0]
    // const args = event?.args

    // if (!args) {
    //   throw new Error('could not get an emitted event')
    // }

    return { eventId, saleArgs }
  }

  async function getHoldersToParticipate(lottery: Lottery, eventId: string) {
    const [holder1, holder2, holder3, holder4, nonHolder] = await ethers.getSigners()

    const price = (await lottery.events(eventId)).price.toBigInt()


    // reverts because wrong deposit amount
    expect(lottery.connect(holder1).participate(eventId, 6750)).to.be
      .reverted
    expect(
      lottery.connect(holder1).participate(eventId, 6750, { value: price + 1n })
    ).reverted

    expect(
      lottery.connect(holder1).participate(eventId, 6750, { value: price })
    )

    // holder already participated
    await expect(
      lottery.connect(holder1).participate(eventId, 6734, { value: price })
    ).reverted

    // // non holder can't
    await expect(
      lottery.connect(nonHolder).participate(eventId, 1, { value: price })
    ).reverted

    await expect(
      lottery.connect(holder2).participate(eventId, 1515, { value: price })
    ).not.reverted
    await expect(
      lottery.connect(holder3).participate(eventId, 1102, { value: price })
    ).not.reverted

    // sale is ended, can't participate anymore
    const endTime = (await lottery.events(eventId)).endTime
    await time.increaseTo(endTime)

    await expect(
      lottery.connect(holder4).participate(eventId, 602, { value: price })
    ).reverted
  }

  it("Should set the right owner", async function () {
    const { lottery, admin } = await deployFixture()
    expect(await lottery.owner()).to.equal(admin.address)
  })

  // it("Sets permissions correctly", async function () {
  //   const { lottery, admin } = await setPermissionsFixture()
  // })

  it("only account with correct permission should be able to create a sale", async function () {
    const { lottery, admin } = await deployFixture()

    const { eventId } = await createSale(admin, lottery)


    expect((await lottery.events(eventId)).supply).to.gt(0)

    const [_, anotherPerson] = await ethers.getSigners()
    await expect(createSale(anotherPerson, lottery)).revertedWith("UNAUTHORIZED")
  })

  it.only("GBC holders can participate within bounds", async function () {
    const { lottery, admin } = await deployFixture()
    const { eventId } = await createSale(admin, lottery)
    await getHoldersToParticipate(lottery, eventId)
  })

  it("Should disburse rewards and refunds properly", async function () {
    const { lottery, admin } = await deployFixture()
    const { eventId } = await createSale(admin, lottery)
    await getHoldersToParticipate(lottery, eventId)

    // calling randomGen won't work because no fund in randomizer
    // await expect(lottery.getRandomNumber(saleId)).to.be.reverted;

    // fund the randomizer
    await lottery.fundRandomizer({
      value: ethers.utils.parseEther("1"),
    })

    await lottery.getRandomNumber(eventId)

    // mock a random number return
    const randomizerBot = await hre.ethers.getImpersonatedSigner(
      await lottery.randomizer()
    )
    await lottery
      .connect(randomizerBot)
      .randomizerCallback(429, ethers.utils.formatBytes32String("Hello World"))

    const winners = await lottery.getWinners(eventId)
    const supply = (await lottery.events(eventId)).supply.toNumber()

    expect(winners).to.have.lengthOf(supply)

    await lottery.executeAirdropForWinnersAndRefundForLosers(eventId)

    // TODO: check that the winners got their rewards

    // TODO: check that the losers got their refunds

    // TODO: check that fundReceiver got the funds
  })
})
