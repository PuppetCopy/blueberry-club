import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { ethers } from "hardhat"
import {
  GBCLab__factory,
  GBCLab,
  Police,
  Police__factory,
  PublicPayToken__factory,
  FakeToken__factory,
  FakeToken
} from "../../typechain-types"
import { MintRuleStruct } from "../../typechain-types/contracts/lab/mint/template/Holder"
import { now } from "../utils"

export enum ROLES {
  MINTER,
  BURNER,
  DESIGNER,
}

const MINTED_TOKEN = 100

export async function createSale(owner: SignerWithAddress, treasury: SignerWithAddress, lab: GBCLab, police: Police, token: FakeToken, rule: Partial<MintRuleStruct>) {
  const saleFactory = new PublicPayToken__factory(owner)
  const finish = (await now()) + 3600
  const sale = await saleFactory.deploy(
    MINTED_TOKEN,
    0,
    owner.address,
    treasury.address,
    lab.address,
    token.address,
    {
      supply: 1000,
      accountLimit: 10,
      cost: 1,
      start: 0,
      finish,
      ...rule,
    }
  )


  await police.setUserRole(sale.address, ROLES.MINTER, true)

  return sale
}


describe("Token.sol", function () {
  let owner: SignerWithAddress
  let bob: SignerWithAddress
  let alice: SignerWithAddress
  const tokenMax = 100

  let lab: GBCLab
  let police: Police
  let token: FakeToken

  this.beforeAll(async () => {
    const [owner_, user1_, user2_] = await ethers.getSigners()
    owner = owner_
    bob = user1_
    alice = user2_


    const policeFactory = new Police__factory(owner)
    police = await policeFactory.deploy(owner.address)
    await police.deployed()

    const itemsFactory = new GBCLab__factory(owner)
    lab = await itemsFactory.deploy(owner.address, police.address)
    await lab.deployed()

    const tokenFactory = new FakeToken__factory(owner)
    token = await tokenFactory.deploy()
    await token.deployed()


    await token.mint(owner.address, 100)


    const setRoleTx = await police.setRoleCapability(
      ROLES.MINTER,
      lab.address,
      lab.interface.getSighash(
        lab.interface.functions["mint(address,uint256,uint256,bytes)"]
      ),
      true
    )
    setRoleTx.wait()

  })

  it("Should take money from user token balance", async () => {
    const sale = await createSale(owner, bob, lab, police, token, {})

    await token.approve(sale.address, tokenMax)

    await sale.mint(1)

    expect(await token.balanceOf(owner.address)).to.be.equal(tokenMax - 1)
  })

  it("Should not be possible to mint if not enough money", async () => {
    const sale = await createSale(owner, bob, lab, police, token, {})

    await expect(sale.connect(bob).mint(1)).revertedWith("TRANSFER_FROM_FAILED")
  })


  // it("Should take money from user token balance", async () => {
  //   const sale = await createSale(owner, bob, lab, police, token, {})

  //   let etherBalanceBefore = await ethers.provider.getBalance(alice.address)
  //   await sale.mintByValue(owner.address, 1, {
  //     value: ethers.utils.parseEther("1"),
  //   })
  //   let etherBalanceAfter = await ethers.provider.getBalance(alice.address)
  //   expect(etherBalanceAfter.sub(etherBalanceBefore)).to.be.equal(
  //     ethers.utils.parseEther("1")
  //   )

  //   etherBalanceBefore = await ethers.provider.getBalance(alice.address)
  //   await sale.mintByAmount(owner.address, 1, ethers.utils.parseEther("1"), {
  //     value: ethers.utils.parseEther("1"),
  //   })
  //   etherBalanceAfter = await ethers.provider.getBalance(alice.address)
  //   expect(etherBalanceAfter.sub(etherBalanceBefore)).to.be.equal(
  //     ethers.utils.parseEther("1")
  //   )
  // })

  // it("Should not be possible to mint if not enough money", async () => {
  //   await expect(
  //     sale.mintByAmount(owner.address, 1, ethers.utils.parseEther("1"), {
  //       value: ethers.utils.parseEther("0.9"),
  //     })
  //   ).to.be.revertedWith("")
  // })

})