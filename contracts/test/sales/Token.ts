import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber } from "ethers"
import { ethers } from "hardhat"
import {
  GBC,
  GBC__factory,
  GBCLab__factory,
  GBCLab,
  Police,
  Police__factory,
  SaleTakeMoneyTokenTest,
  SaleTakeMoneyTokenTest__factory,
  FakeToken__factory,
  FakeToken,
  SaleTakeMoneyNativeTest,
  SaleTakeMoneyNativeTest__factory,
} from "../../typechain-types"

export enum ROLES {
  MINTER,
  BURNER,
  DESIGNER,
}

const MINTED_TOKEN = 100

describe("Token.sol", function () {
  let owner: SignerWithAddress
  let bob: SignerWithAddress
  let alice: SignerWithAddress

  let gbc: GBC
  let lab: GBCLab
  let police: Police
  let token: FakeToken
  let sale: SaleTakeMoneyTokenTest

  this.beforeAll(async () => {
    const [owner_, user1_, user2_] = await ethers.getSigners()
    owner = owner_
    bob = user1_
    alice = user2_
    const gbcFactory = new GBC__factory(owner)

    gbc = await gbcFactory.deploy("Blueberry Club", "GBC", "")
    await gbc.deployed()

    await gbc.startPublicSale()

    await gbc.connect(bob).mint(20, {
      value: ethers.utils.parseEther("0.6"),
    })

    await gbc.connect(alice).mint(20, {
      value: ethers.utils.parseEther("0.6"),
    })

    await gbc.connect(owner).mint(20, {
      value: ethers.utils.parseEther("0.6"),
    })

    const policeFactory = new Police__factory(owner)
    police = await policeFactory.deploy(owner.address)
    await police.deployed()

    const itemsFactory = new GBCLab__factory(owner)
    lab = await itemsFactory.deploy(owner.address, police.address)
    await lab.deployed()

    const tokenFactory = new FakeToken__factory(owner)
    token = await tokenFactory.deploy()
    await token.deployed()

    await token.mint(owner.address, ethers.utils.parseEther("1000"))

    const saleFactory = new SaleTakeMoneyTokenTest__factory(owner)
    sale = await saleFactory.deploy(
      MINTED_TOKEN,
      lab.address,
      {
        max: 1000,
        minted: 0,
        paused: 1,
      },
      alice.address,
      token.address
    )
    await sale.deployed()

    const setRoleTx = await police.setRoleCapability(
      ROLES.MINTER,
      lab.address,
      lab.interface.getSighash(
        lab.interface.functions["mint(address,uint256,uint256,bytes)"]
      ),
      true
    )
    setRoleTx.wait()

    await police.setUserRole(sale.address, ROLES.MINTER, true)
  })

  it("Should take money from user token balance", async () => {
    await token.approve(sale.address, ethers.utils.parseEther("1"))
    await sale.mintByAmount(owner.address, 1, ethers.utils.parseEther("1"))
    expect(await token.balanceOf(owner.address)).to.be.equal(
      ethers.utils.parseEther("1000").sub(ethers.utils.parseEther("1"))
    )
  })

  it("Should not be possible to mint if not enough money", async () => {
    await expect(
      sale.mintByAmount(owner.address, 1, ethers.utils.parseEther("1"))
    ).to.be.revertedWith("")
  })
})

describe("Native.sol", function () {
  let owner: SignerWithAddress
  let bob: SignerWithAddress
  let alice: SignerWithAddress

  let gbc: GBC
  let lab: GBCLab
  let police: Police
  let sale: SaleTakeMoneyNativeTest

  this.beforeAll(async () => {
    const [owner_, user1_, user2_] = await ethers.getSigners()
    owner = owner_
    bob = user1_
    alice = user2_
    const gbcFactory = new GBC__factory(owner)

    gbc = await gbcFactory.deploy("Blueberry Club", "GBC", "")
    await gbc.deployed()

    await gbc.startPublicSale()

    await gbc.connect(bob).mint(20, {
      value: ethers.utils.parseEther("0.6"),
    })

    await gbc.connect(alice).mint(20, {
      value: ethers.utils.parseEther("0.6"),
    })

    await gbc.connect(owner).mint(20, {
      value: ethers.utils.parseEther("0.6"),
    })

    const policeFactory = new Police__factory(owner)
    police = await policeFactory.deploy(owner.address)
    await police.deployed()

    const itemsFactory = new GBCLab__factory(owner)
    lab = await itemsFactory.deploy(owner.address, police.address)
    await lab.deployed()

    const saleFactory = new SaleTakeMoneyNativeTest__factory(owner)
    sale = await saleFactory.deploy(
      MINTED_TOKEN,
      lab.address,
      {
        max: 1000,
        minted: 0,
        paused: 1,
      },
      alice.address
    )
    await sale.deployed()

    const setRoleTx = await police.setRoleCapability(
      ROLES.MINTER,
      lab.address,
      lab.interface.getSighash(
        lab.interface.functions["mint(address,uint256,uint256,bytes)"]
      ),
      true
    )
    setRoleTx.wait()

    await police.setUserRole(sale.address, ROLES.MINTER, true)
  })

  it("Should take money from user token balance", async () => {
    let etherBalanceBefore = await ethers.provider.getBalance(alice.address)
    await sale.mintByValue(owner.address, 1, {
      value: ethers.utils.parseEther("1"),
    })
    let etherBalanceAfter = await ethers.provider.getBalance(alice.address)
    expect(etherBalanceAfter.sub(etherBalanceBefore)).to.be.equal(
      ethers.utils.parseEther("1")
    )

    etherBalanceBefore = await ethers.provider.getBalance(alice.address)
    await sale.mintByAmount(owner.address, 1, ethers.utils.parseEther("1"), {
      value: ethers.utils.parseEther("1"),
    })
    etherBalanceAfter = await ethers.provider.getBalance(alice.address)
    expect(etherBalanceAfter.sub(etherBalanceBefore)).to.be.equal(
      ethers.utils.parseEther("1")
    )
  })

  it("Should not be possible to mint if not enough money", async () => {
    await expect(
      sale.mintByAmount(owner.address, 1, ethers.utils.parseEther("1"), {
        value: ethers.utils.parseEther("0.9"),
      })
    ).to.be.revertedWith("")
  })
})
