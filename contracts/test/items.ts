import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { GBC, GBCLabsItems } from "../typechain-types";

describe("GBC Labs Items", function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let user3: SignerWithAddress
  let user4: SignerWithAddress
  let user5: SignerWithAddress
  let market: SignerWithAddress

  let GBC_CONTRACT: GBC
  let ITEMS_CONTRACT: GBCLabsItems

  this.beforeAll(async () => {
    [owner, user1, user2, user3, user4, user5, market] = await ethers.getSigners()
    const GBC = await ethers.getContractFactory("GBC");
    const gbc = await GBC.deploy("Blueberry Club", "GBC", "");
    GBC_CONTRACT = await gbc.deployed()

    let tx = await GBC_CONTRACT.connect(owner).startPublicSale()
    await tx.wait()

    tx = await GBC_CONTRACT.connect(user1).mint(20,{value: ethers.utils.parseEther('0.6')})
    await tx.wait()

    tx = await GBC_CONTRACT.connect(user2).mint(20,{value: ethers.utils.parseEther('0.6')})
    await tx.wait()

    tx = await GBC_CONTRACT.connect(user3).mint(1,{value: ethers.utils.parseEther('0.03')})
    await tx.wait()

    const Items = await ethers.getContractFactory("GBCLabsItems");
    const items = await Items.deploy();
    ITEMS_CONTRACT = await items.deployed()

    tx = await ITEMS_CONTRACT.connect(owner).grantRole('0xaf290d8680820aad922855f39b306097b20e28774d6c1ad35a20325630c3a02c', owner.address)
    await tx.wait()
  })

  it("Check initial values", async () => {
    expect(await GBC_CONTRACT.balanceOf(user1.address)).to.be.equal(BigNumber.from(20))
    expect(await GBC_CONTRACT.balanceOf(user2.address)).to.be.equal(BigNumber.from(20))
    expect(await GBC_CONTRACT.balanceOf(user3.address)).to.be.equal(BigNumber.from(1))
  })

  describe("Adding Hats [COWBOY]", async () => {
    describe("Create new item with the new type", async () => {
      it("Should revert when user don't have DESIGNER role", async () => {
        await expect(ITEMS_CONTRACT.connect(owner).addItem(1, 1)).to.be.revertedWith("AccessControl: account 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 is missing role 0x90b2805f180e032c7264ccc730b08b69796f06e8c50ab1ad71a632183810bac9");
      })

      it("Should add owner DESIGNER role", async () => {
        let tx = await ITEMS_CONTRACT.connect(owner).grantRole("0x90b2805f180e032c7264ccc730b08b69796f06e8c50ab1ad71a632183810bac9", owner.address)
        await tx.wait()
        expect(await ITEMS_CONTRACT.hasRole(await ITEMS_CONTRACT.DEFAULT_ADMIN_ROLE(),owner.address)).to.be.equal(true);
      })

      it("Should revert when type ID is 0", async () => {
        await expect(ITEMS_CONTRACT.connect(owner).addItem(0, 1)).to.be.revertedWith("Items: Item cannot have type 0");
      })

      it("Create a new item of type ID 2", async () => {
        const tx = await ITEMS_CONTRACT.connect(owner).addItem(2, 1)
        await tx.wait()
        expect(await ITEMS_CONTRACT.totalTokens()).to.be.equal(BigNumber.from(1));
      })
    })
    describe("Add 10 Hats on the market", async () => {
      it("Should revert when user is not a MINTER", async () => {
        await expect(ITEMS_CONTRACT.connect(owner).mint(owner.address, 1, 10)).to.be.revertedWith("AccessControl: account 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 is missing role 0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9");
      })

      it("Should add owner MINTER role", async () => {
        let tx = await ITEMS_CONTRACT.connect(owner).grantRole("0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9", owner.address)
        await tx.wait()
        expect(await ITEMS_CONTRACT.hasRole(await ITEMS_CONTRACT.DEFAULT_ADMIN_ROLE(),owner.address)).to.be.equal(true);
      })

      it("Mint 10 tokens", async () => {
        const tx = await ITEMS_CONTRACT.connect(owner).mint(owner.address, 1, 10)
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(owner.address, 1)).to.be.equal(BigNumber.from(10));
      })


      it(`"Sell" the 10 tokens`, async () => {
        const tx = await ITEMS_CONTRACT.connect(owner).safeTransferFrom(owner.address, market.address, 1, 10, "0x00")
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(market.address, 1)).to.be.equal(BigNumber.from(10));
      })
    })
  })

  describe("Adding glasses [THUG]", async () => {
    it("Create a new item of type ID 3", async () => {
      const tx = await ITEMS_CONTRACT.connect(owner).addItem(3, 2)
      await tx.wait()
      expect(await ITEMS_CONTRACT.totalTokens()).to.be.equal(BigNumber.from(2));
    })
    describe("Add 2 glasses on the market", async () => {
      it("Mint 2 tokens", async () => {
        const tx = await ITEMS_CONTRACT.connect(owner).mint(owner.address, 2, 2)
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(owner.address, 2)).to.be.equal(BigNumber.from(2));
      })


      it(`"Sell" the 2 tokens`, async () => {
        const tx = await ITEMS_CONTRACT.connect(owner).safeTransferFrom(owner.address, market.address, 2, 2, "0x00")
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(market.address, 2)).to.be.equal(BigNumber.from(2));
      })
    })
  })

  describe("Adding 20 new hats [MISTER] !", async () => {
    it("Create a new item of type ID 2", async () => {
      const tx = await ITEMS_CONTRACT.connect(owner).addItem(2, 3)
      await tx.wait()
      expect(await ITEMS_CONTRACT.totalTokens()).to.be.equal(BigNumber.from(3));
    })
    describe("Add 20 new Hats on the market", async () => {
      it("Mint 2 tokens", async () => {
        const tx = await ITEMS_CONTRACT.connect(owner).mint(owner.address, 3, 20)
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(owner.address, 3)).to.be.equal(BigNumber.from(20));
      })


      it(`"Sell" the 2 tokens`, async () => {
        const tx = await ITEMS_CONTRACT.connect(owner).safeTransferFrom(owner.address, market.address, 3, 20, "0x00")
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(market.address, 3)).to.be.equal(BigNumber.from(20));
      })
    })
  })

  describe("Adding 1000 new background [CLOUD] !", async () => {
    it("Create a new item of type ID 1", async () => {
      const tx = await ITEMS_CONTRACT.connect(owner).addItem(1, 4)
      await tx.wait()
      expect(await ITEMS_CONTRACT.totalTokens()).to.be.equal(BigNumber.from(4));
    })
    describe("Add 1000 new Background on the market", async () => {
      it("Mint 2 tokens", async () => {
        const tx = await ITEMS_CONTRACT.connect(owner).mint(owner.address, 4, 1000)
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(owner.address, 4)).to.be.equal(BigNumber.from(1000));
      })


      it(`"Sell" the 1000 tokens`, async () => {
        const tx = await ITEMS_CONTRACT.connect(owner).safeTransferFrom(owner.address, market.address, 4, 1000, "0x00")
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(market.address, 4)).to.be.equal(BigNumber.from(1000));
      })
    })
  })

  describe("Adding 1000 new background [LAVA] !", async () => {
    it("Create a new item of type ID 1", async () => {
      const tx = await ITEMS_CONTRACT.connect(owner).addItem(1, 5)
      await tx.wait()
      expect(await ITEMS_CONTRACT.totalTokens()).to.be.equal(BigNumber.from(5));
    })
    describe("Add 1000 new Background on the market", async () => {
      it("Mint 2 tokens", async () => {
        const tx = await ITEMS_CONTRACT.connect(owner).mint(owner.address, 5, 1000)
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(owner.address, 5)).to.be.equal(BigNumber.from(1000));
      })


      it(`"Sell" the 1000 tokens`, async () => {
        const tx = await ITEMS_CONTRACT.connect(owner).safeTransferFrom(owner.address, market.address, 5, 1000, "0x00")
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(market.address, 5)).to.be.equal(BigNumber.from(1000));
      })
    })
  })

  describe("Pimp my blueberry", () => {
    describe("Buy some SFT", () => {
      it(`"Buy" 2 Hats [COWBOY]`, async () => {
        const tx = await ITEMS_CONTRACT.connect(market).safeTransferFrom(market.address, user1.address, 1, 2, "0x00")
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(user1.address, 1)).to.be.equal(BigNumber.from(2));
      })

      it(`"Buy" 1 glasse [THUG]`, async () => {
        const tx = await ITEMS_CONTRACT.connect(market).safeTransferFrom(market.address, user1.address, 2, 1, "0x00")
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(user1.address, 2)).to.be.equal(BigNumber.from(1));
      })

      it(`"Buy" 1 glasse [MISTER]`, async () => {
        const tx = await ITEMS_CONTRACT.connect(market).safeTransferFrom(market.address, user1.address, 3, 1, "0x00")
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(user1.address, 3)).to.be.equal(BigNumber.from(1));
      })

      it(`"Buy" 3 background [CLOUD]`, async () => {
        const tx = await ITEMS_CONTRACT.connect(market).safeTransferFrom(market.address, user1.address, 4, 3, "0x00")
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(user1.address, 4)).to.be.equal(BigNumber.from(3));
      })

      it(`"Buy" 1 background [LAVA]`, async () => {
        const tx = await ITEMS_CONTRACT.connect(market).safeTransferFrom(market.address, user1.address, 5, 1, "0x00")
        await tx.wait()
        expect(await ITEMS_CONTRACT.balanceOf(user1.address, 5)).to.be.equal(BigNumber.from(1));
      })
    })
  })
});
