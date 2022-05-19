
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber } from "ethers"
import { ethers } from "hardhat"
import { Police, GBC, GBCLab, GBCLab__factory, GBC__factory, Police__factory } from "../typechain-types"


export enum ROLES {
  MINTER,
  BURNER,
  DESIGNER
}


describe("GBC Labs Items", function () {
  let owner: SignerWithAddress
  let minter: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let user3: SignerWithAddress
  let market: SignerWithAddress

  let gbc: GBC
  let lab: GBCLab
  let police: Police


  this.beforeAll(async () => {
    [owner, minter, user1, user2, user3, market] = await ethers.getSigners()
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

    const policeFactory = new Police__factory(owner)
    police = await policeFactory.deploy(owner.address)

    const itemsFactory = new GBCLab__factory(owner)
    lab = await itemsFactory.deploy(owner.address, police.address)

    await police.deployed()
    await lab.deployed()

    const setRoleTx = await police.setRoleCapability(ROLES.MINTER, lab.address, lab.interface.getSighash(lab.interface.functions["mint(address,uint256,uint256,bytes)"]), true)
    setRoleTx.wait()

  })

  it("Check initial values", async () => {
    expect(await gbc.balanceOf(user1.address)).to.be.equal(
      BigNumber.from(20)
    )
    expect(await gbc.balanceOf(user2.address)).to.be.equal(
      BigNumber.from(20)
    )
    expect(await gbc.balanceOf(user3.address)).to.be.equal(
      BigNumber.from(1)
    )
  })

  describe("Adding Hats [COWBOY]", async () => {
    describe("Add 10 Hats on the market", async () => {
      it("Should revert when user is not a MINTER", async () => {
        await expect(
          lab.connect(minter).mint(minter.address, 1, 10, "0x00")
        ).to.be.revertedWith(
          "UNAUTHORIZED"
        )
      })

      it("Should add owner MINTER role", async () => {
        const tx = await police.setUserRole(minter.address, ROLES.MINTER, true)
        await tx.wait()
        expect(
          await police.doesUserHaveRole(minter.address, ROLES.MINTER)
        ).to.be.equal(true)
      })

      it("Mint 10 tokens", async () => {
        const tx = await lab.connect(minter).mint(
          owner.address,
          1,
          10,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(owner.address, 1)).to.be.equal(
          BigNumber.from(10)
        )
      })

      it(`"Sell" the 10 tokens`, async () => {
        const tx = await lab.safeTransferFrom(
          owner.address,
          market.address,
          1,
          10,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(market.address, 1)).to.be.equal(
          BigNumber.from(10)
        )
      })
    })
  })

  describe("Adding glasses [THUG]", async () => {
    describe("Add 2 glasses on the market", async () => {
      it("Mint 2 tokens", async () => {
        const tx = await lab.connect(minter).mint(
          owner.address,
          2,
          2,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(owner.address, 2)).to.be.equal(
          BigNumber.from(2)
        )
      })

      it(`"Sell" the 2 tokens`, async () => {
        const tx = await lab.safeTransferFrom(
          owner.address,
          market.address,
          2,
          2,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(market.address, 2)).to.be.equal(
          BigNumber.from(2)
        )
      })
    })
  })

  describe("Adding 20 new hats [MISTER] !", async () => {
    describe("Add 20 new Hats on the market", async () => {
      it("Mint 2 tokens", async () => {
        const tx = await lab.connect(minter).mint(
          owner.address,
          3,
          20,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(owner.address, 3)).to.be.equal(
          BigNumber.from(20)
        )
      })

      it(`"Sell" the 2 tokens`, async () => {
        const tx = await lab.safeTransferFrom(
          owner.address,
          market.address,
          3,
          20,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(market.address, 3)).to.be.equal(
          BigNumber.from(20)
        )
      })
    })
  })

  describe("Adding 1000 new background [CLOUD] !", async () => {
    describe("Add 1000 new Background on the market", async () => {
      it("Mint 2 tokens", async () => {
        const tx = await lab.connect(minter).mint(
          owner.address,
          4,
          1000,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(owner.address, 4)).to.be.equal(
          BigNumber.from(1000)
        )
      })

      it(`"Sell" the 1000 tokens`, async () => {
        const tx = await lab.safeTransferFrom(
          owner.address,
          market.address,
          4,
          1000,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(market.address, 4)).to.be.equal(
          BigNumber.from(1000)
        )
      })
    })
  })

  describe("Adding 1000 new background [LAVA] !", async () => {
    describe("Add 1000 new Background on the market", async () => {
      it("Mint 2 tokens", async () => {
        const tx = await lab.connect(minter).mint(
          owner.address,
          5,
          1000,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(owner.address, 5)).to.be.equal(
          BigNumber.from(1000)
        )
      })

      it(`"Sell" the 1000 tokens`, async () => {
        const tx = await lab.safeTransferFrom(
          owner.address,
          market.address,
          5,
          1000,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(market.address, 5)).to.be.equal(
          BigNumber.from(1000)
        )
      })
    })
  })

  describe("Pimp my blueberry", () => {
    describe("Buy some SFT", () => {
      it(`"Buy" 2 Hats [COWBOY]`, async () => {
        const tx = await lab.connect(market).safeTransferFrom(
          market.address,
          user1.address,
          1,
          2,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(user1.address, 1)).to.be.equal(
          BigNumber.from(2)
        )
      })

      it(`"Buy" 1 glasse [THUG]`, async () => {
        const tx = await lab.connect(market).safeTransferFrom(
          market.address,
          user1.address,
          2,
          1,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(user1.address, 2)).to.be.equal(
          BigNumber.from(1)
        )
      })

      it(`"Buy" 1 glasse [MISTER]`, async () => {
        const tx = await lab.connect(market).safeTransferFrom(
          market.address,
          user1.address,
          3,
          1,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(user1.address, 3)).to.be.equal(
          BigNumber.from(1)
        )
      })

      it(`"Buy" 3 background [CLOUD]`, async () => {
        const tx = await lab.connect(market).safeTransferFrom(
          market.address,
          user1.address,
          4,
          3,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(user1.address, 4)).to.be.equal(
          BigNumber.from(3)
        )
      })

      it(`"Buy" 1 background [LAVA]`, async () => {
        const tx = await lab.connect(market).safeTransferFrom(
          market.address,
          user1.address,
          5,
          1,
          "0x00"
        )
        await tx.wait()
        expect(await lab.balanceOf(user1.address, 5)).to.be.equal(
          BigNumber.from(1)
        )
      })
    })
  })

})
