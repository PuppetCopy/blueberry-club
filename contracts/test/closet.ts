/**
 * import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber } from "ethers"
import { ethers } from "hardhat"
import {
  Closet__factory,
  Closet,
  GBC,
  GBC__factory,
  GBCLab__factory,
  GBCLab,
  Police,
  Police__factory,
} from "../typechain-types"

export enum ROLES {
  MINTER,
  BURNER,
  DESIGNER,
}

describe("Closet test", function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let user3: SignerWithAddress

  let gbc: GBC
  let lab: GBCLab
  let police: Police
  let closet: Closet

  this.beforeAll(async () => {
    const [owner_, user1_, user2_, user3_] = await ethers.getSigners()
    owner = owner_
    user1 = user1_
    user2 = user2_
    user3 = user3_
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

    const closetFactory = new Closet__factory(owner)
    closet = await closetFactory.deploy(gbc.address, lab.address)

    await closet.deployed()

    const setRoleTx = await police.setRoleCapability(
      ROLES.MINTER,
      lab.address,
      lab.interface.getSighash(
        lab.interface.functions["mint(address,uint256,uint256,bytes)"]
      ),
      true
    )
    setRoleTx.wait()

    await police.setUserRole(owner.address, ROLES.MINTER, true)
  })

  it("Should be possible to deposit item to an NFT", async () => {
    await lab.connect(owner).mint(user1.address, 1, 1, "0x00")
    await lab.connect(owner).mint(user1.address, 2, 1, "0x00")
    await lab.connect(owner).mint(user1.address, 3, 1, "0x00")
    await lab.connect(user1).setApprovalForAll(closet.address, true)
    await closet.connect(user1).set(1, [1, 2, 3], [])
    const result = await closet.get(1, 0, 10)
    expect(result[0]).to.be.equal(BigNumber.from(1))
    expect(result[1]).to.be.equal(BigNumber.from(2))
    expect(result[2]).to.be.equal(BigNumber.from(3))
  })

  it("Should be possible to withdraw item to an NFT", async () => {
    await lab.connect(user1).setApprovalForAll(closet.address, true)
    await closet.connect(user1).set(1, [], [2, 1])
    const result = await closet.get(1, 0, 10)
    expect(result[0]).to.be.equal(BigNumber.from(3))
  })

  it("Should be possible to deposit and withdraw item to an NFT in 1 transaction", async () => {
    await lab.connect(user1).setApprovalForAll(closet.address, true)
    await closet.connect(user1).set(1, [2], [3])
    const result = await closet.get(1, 0, 10)
    expect(result[0]).to.be.equal(BigNumber.from(2))
  })
})

 */
