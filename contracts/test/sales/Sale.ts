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
  SaleTest,
  SaleTest__factory,
} from "../../typechain-types"

export enum ROLES {
  MINTER,
  BURNER,
  DESIGNER,
}

const MINTED_TOKEN = 100

describe("Sale.sol", function () {
  let owner: SignerWithAddress
  let bob: SignerWithAddress
  let alice: SignerWithAddress

  let gbc: GBC
  let lab: GBCLab
  let police: Police
  let sale: SaleTest

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

    const saleFactory = new SaleTest__factory(owner)
    sale = await saleFactory.deploy(
      MINTED_TOKEN,
      lab.address,
      {
        max: 1000,
        minted: 0,
        paused: 1,
      },
      owner.address
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

  it("Should be possible to mint items", async () => {
    expect(await sale.totalMinted()).to.be.equal(BigNumber.from(0))
    await sale.mint(owner.address, 1)
    expect(await sale.totalMinted()).to.be.equal(BigNumber.from(1))
    expect(await lab.balanceOf(owner.address, MINTED_TOKEN)).to.be.equal(
      BigNumber.from(1)
    )
  })

  it("Should be possible to pause the contract", async () => {
    await sale.setPaused(true)

    await expect(sale.mint(owner.address, 1)).to.be.revertedWith("")
  })

  it("Should not be possible to mint hover the max supply", async () => {
    await sale.setPaused(false)
    const maxSupply = await sale.maxSupply()

    await expect(sale.mint(owner.address, maxSupply)).to.be.revertedWith("")
    await sale.mint(owner.address, maxSupply.sub(1))
    expect(await sale.totalMinted()).to.be.equal(maxSupply)
    expect(await lab.balanceOf(owner.address, MINTED_TOKEN)).to.be.equal(
      maxSupply
    )
  })
})
