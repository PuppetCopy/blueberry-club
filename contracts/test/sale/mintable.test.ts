import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber } from "ethers"
import { parseEther } from "ethers/lib/utils"
import { ethers, network } from "hardhat"
import {
  GBC,
  GBC__factory,
  GBCLab__factory,
  GBCLab,
  Police,
  Police__factory,
  Public__factory,
} from "../../typechain-types"
import { MintRuleStruct } from "../../typechain-types/contracts/lab/mint/template/Public"
import { now } from "../utils"

export enum ROLES {
  MINTER,
  BURNER,
  DESIGNER,
}

const MINTED_TOKEN = 100

async function createSale(owner: SignerWithAddress, lab: GBCLab, police: Police, rule: Partial<MintRuleStruct>) {
  const saleFactory = new Public__factory(owner)
  const finish = (await now()) + 3600
  const sale = await saleFactory.deploy(
    MINTED_TOKEN,
    0,
    owner.address,
    lab.address,
    {
      accountLimit: 10,
      cost: parseEther('0.02'),
      start: 0,
      finish,
      supply: 50,
      ...rule,
    }
  )


  await police.setUserRole(sale.address, ROLES.MINTER, true)

  return sale
}


describe("Mintable.sol", function () {
  let owner: SignerWithAddress
  let bob: SignerWithAddress
  let alice: SignerWithAddress

  let gbc: GBC
  let lab: GBCLab
  let police: Police
  const ITEM_PRICE = ethers.utils.parseEther("0.02")


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

    const setRoleTx = await police.setRoleCapability(
      ROLES.MINTER,
      lab.address,
      lab.interface.getSighash(lab.interface.functions["mint(address,uint256,uint256,bytes)"]),
      true
    )

    await setRoleTx.wait()

  })

  it("Should be possible to mint items", async () => {
    const sale = await createSale(owner, lab, police, { cost: 0 })
    expect(await sale.totalMinted()).to.be.equal(BigNumber.from(0))
    await sale.mint(1)
    expect(await sale.totalMinted()).to.be.equal(BigNumber.from(1))
    expect(await lab.balanceOf(owner.address, MINTED_TOKEN)).to.be.equal(
      BigNumber.from(1)
    )
  })

  it("revert negative test rules", async () => {
    const sale = await createSale(owner, lab, police, { accountLimit: 10, supply: 20 })


    await expect(sale.mint(1, { value: ITEM_PRICE.mul(2) })).be.revertedWith('InvalidPaidAmount')
    await expect(sale.mint(1, { value: 0 })).be.revertedWith('InvalidPaidAmount')

    await expect(sale.mint(11, { value: ITEM_PRICE })).be.revertedWith('MaxWalletReached')

    const bobWallet = sale.connect(bob)
    const aliceWallet = sale.connect(alice)

    await sale.mint(10, { value: ITEM_PRICE.mul(10) })
    await bobWallet.mint(10, { value: ITEM_PRICE.mul(10) })
    await expect(aliceWallet.mint(5, { value: ITEM_PRICE.mul(5) })).be.revertedWith('MaxSupplyReached')

  })

  it("prevent minting when sale is canceled", async () => {
    const sale = await createSale(owner, lab, police, { accountLimit: 10, supply: 20 })
            ; (await sale.cancel()).wait()

    await expect(sale.mint(5, { value: ITEM_PRICE.mul(5) })).be.revertedWith('SaleCanceled')

  })

  it("Should not be possible before it begins or after it ends", async () => {

    const start = await now() + 5
    const finish = start + 3600

    const sale = await createSale(owner, lab, police, { finish, start })


    await expect(sale.mint(1, { value: ITEM_PRICE })).be.revertedWith('MintNotStarted')

    await network.provider.send("evm_setNextBlockTimestamp", [finish + 1])
    await network.provider.send("evm_mine")

    await expect(sale.mint(1, { value: ITEM_PRICE })).be.revertedWith('MintEnded')

  })


})