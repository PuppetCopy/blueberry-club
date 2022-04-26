import { ethers, network } from "hardhat"
import { expect } from "chai"

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { GBC, GBC__factory, Distributor__factory, Distributor, WETH9__factory, WETH9, Router__factory, Router, BasicCollector, BasicCollector__factory } from "../typechain-types"

describe("GBC Distribution", function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let user3: SignerWithAddress

  let gbc: GBC
  let weth: WETH9
  let distributor: Distributor
  let router: Router
  let collector: BasicCollector

  this.beforeAll(async () => {
    [owner, user1, user2, user3] = await ethers.getSigners()
    const gbcFactory = new GBC__factory(owner)

    gbc = await gbcFactory.deploy("Blueberry Club", "GBC", "")
    await gbc.deployed()

    await gbc.startPublicSale()

    await gbc.connect(user1).mint(20, {
      value: ethers.utils.parseEther("0.6"),
    })

    await gbc.connect(user2).mint(20, {
      value: ethers.utils.parseEther("0.6"),
    })

    await gbc.connect(user3).mint(1, {
      value: ethers.utils.parseEther("0.03"),
    })

    const wethFactory = new WETH9__factory(owner)
    weth = await wethFactory.deploy()

    const distributorFactory = new Distributor__factory(owner)
    distributor = await distributorFactory.deploy(weth.address, gbc.address)

    const routerFactory = new Router__factory(owner)
    router = await routerFactory.deploy(gbc.address, distributor.address)

    await distributor.setRewardDistributor(router.address, true)
    await distributor.setRewardDistributor(owner.address, true)

    const collectorFactory = new BasicCollector__factory(owner)
    collector = await collectorFactory.deploy(weth.address, router.address)
  })

  it("Should be possible to stake tokens", async () => {
    await gbc.connect(user1).setApprovalForAll(distributor.address, true)

    await router.connect(user1).stake([1, 2, 3, 4, 5, 6])

    expect(await distributor.balanceOf(user1.address)).to.be.equal(ethers.BigNumber.from(6))

    await gbc.connect(user2).setApprovalForAll(distributor.address, true)

    await router.connect(user2).stake([21, 22, 23, 24, 25])

    expect(await distributor.balanceOf(user2.address)).to.be.equal(ethers.BigNumber.from(5))

    await gbc.connect(user3).setApprovalForAll(distributor.address, true)

    await expect(
      router.connect(user3).stake([27])
    ).to.be.revertedWith("ERC721: transfer from incorrect owner")

    await expect(
      router.connect(user3).stake([67])
    ).to.be.revertedWith("ERC721: operator query for nonexistent token")
  })

  it("Should be possible to withdraw tokens", async () => {
    await gbc.connect(user1).setApprovalForAll(distributor.address, true)

    await router.connect(user1).withdraw([6])

    expect(await distributor.balanceOf(user1.address)).to.be.equal(ethers.BigNumber.from(5))
  })

  it("Should be possible to distribute ETH", async () => {
    await weth.depositTo(distributor.address, { value: ethers.utils.parseEther("20") })

    await distributor.notifyRewardAmount(ethers.utils.parseEther("20"), 60 * 60 * 24 * 31) // 1 Month in seconds

    expect(await distributor.rewardRate()).to.be.equal(ethers.utils.parseEther("20").div(60 * 60 * 24 * 31))
  })

  it("User get reward by keeping tokens on contract", async () => {
    const blockNumber = await ethers.provider.getBlockNumber()
    const block = await ethers.provider.getBlock(blockNumber)

    await network.provider.send("evm_setNextBlockTimestamp", [block.timestamp + 60 * 60 * 24 * 31])
    await network.provider.send("evm_mine")

    const user1reward = await distributor.earned(user1.address)
    const user2reward = await distributor.earned(user2.address)

    expect(user2reward).to.be.equal(user1reward)
    expect(user1reward.gte(ethers.utils.parseEther("9.999999"))).to.be.true // Can't be 10 ETH due to precision
  })

  it("User can have this GBC disabled", async () => {
    const user1rewardBefore = await distributor.earned(user1.address)

    await distributor.disableForAccount(user1.address, owner.address, [1, 2, 3, 4, 5], user1rewardBefore)

    await distributor.notifyRewardAmount(ethers.utils.parseEther("20"), 60 * 60 * 24 * 31) // Adding 1 month more rewards

    const blockNumber = await ethers.provider.getBlockNumber()
    const block = await ethers.provider.getBlock(blockNumber)

    await network.provider.send("evm_setNextBlockTimestamp", [block.timestamp + 60 * 60 * 24 * 15])
    await network.provider.send("evm_mine")

    const user1rewardAfter = await distributor.earned(user1.address)
    const user2reward = await distributor.earned(user2.address)

    expect(user2reward.gt(user1rewardAfter)).to.be.true
    expect(user1rewardBefore).to.be.equal(user1rewardAfter)
  })

  it("User withdraw without enable", async () => {

    await router.connect(user1).withdraw([1, 2])

    expect(await distributor.disabledOf(user1.address)).to.be.equal(ethers.BigNumber.from(3))
  })

  it("User can re enable this disable GBC", async () => {
    await router.connect(user1).enable([3, 4, 5])

    expect(await distributor.disabledOf(user1.address)).to.be.equal(ethers.BigNumber.from(0))
    expect(await distributor.enabledOf(user1.address)).to.be.equal(ethers.BigNumber.from(3))
  })
})
