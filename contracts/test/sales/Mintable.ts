import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber } from "ethers"
import { ethers, network } from "hardhat"
import {
  GBC,
  GBC__factory,
  GBCLab__factory,
  GBCLab,
  Police,
  Police__factory,
  SaleMintableTest,
  SaleMintableTest__factory,
} from "../../typechain-types"
import { now } from "../utils"

export enum ROLES {
  MINTER,
  BURNER,
  DESIGNER,
}

const MINTED_TOKEN = 100

describe.skip("Mintable.sol", function () {
  let owner: SignerWithAddress
  let bob: SignerWithAddress
  let alice: SignerWithAddress

  let gbc: GBC
  let lab: GBCLab
  let police: Police
  let sale: SaleMintableTest

  let end: number

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

    end = (await now()) + 3600

    const saleFactory = new SaleMintableTest__factory(owner)
    sale = await saleFactory.deploy(
      MINTED_TOKEN,
      lab.address,
      {
        max: 1000,
        minted: 0,
        paused: 1,
      },
      owner.address,
      end
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
    await sale.mint(owner.address, 1, {
      cost: 0,
      start: 0,
      transaction: 1,
      amount: 1,
    })
    expect(await sale.totalMinted()).to.be.equal(BigNumber.from(1))
    expect(await lab.balanceOf(owner.address, MINTED_TOKEN)).to.be.equal(
      BigNumber.from(1)
    )
  })

  it("Should not be possible to mint if cost > paid", async () => {
    await expect(
      sale.mint(
        owner.address,
        1,
        {
          cost: ethers.utils.parseEther("0.02"),
          start: 0,
          transaction: 1,
          amount: 1,
        },
        { value: ethers.utils.parseEther("0.01") }
      )
    ).to.be.revertedWith("")
  })

  it("Should not be possible to mint if start > now", async () => {
    await expect(
      sale.mint(
        owner.address,
        1,
        {
          cost: ethers.utils.parseEther("0.02"),
          start: (await now()) + 1000,
          transaction: 1,
          amount: 1,
        },
        { value: ethers.utils.parseEther("0.02") }
      )
    ).to.be.revertedWith("")
  })

  it("Should not be possible to mint if minted > transaction", async () => {
    await expect(
      sale.mint(
        owner.address,
        2,
        {
          cost: ethers.utils.parseEther("0.02"),
          start: await now(),
          transaction: 1,
          amount: 1,
        },
        { value: ethers.utils.parseEther("0.02") }
      )
    ).to.be.revertedWith("")
  })

  it("Should not be possible to mint if minted > amount", async () => {
    await expect(
      sale.mint(
        owner.address,
        2,
        {
          cost: ethers.utils.parseEther("0.02"),
          start: await now(),
          transaction: 10,
          amount: 1,
        },
        { value: ethers.utils.parseEther("0.02").mul(2) }
      )
    ).to.be.revertedWith("")
  })

  it("Should not be possible to mint after end", async () => {
    await network.provider.send("evm_setNextBlockTimestamp", [end])
    await network.provider.send("evm_mine")

    await expect(
      sale.mint(
        owner.address,
        2,
        {
          cost: ethers.utils.parseEther("0.02"),
          start: await now(),
          transaction: 10,
          amount: 10,
        },
        { value: ethers.utils.parseEther("0.02").mul(2) }
      )
    ).to.be.revertedWith("")
  })
})
