import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber } from "ethers"
import { ethers } from "hardhat"
import {
  GBCLab__factory,
  GBCLab,
  Police,
  Police__factory,
  MerkleSale as IMerkleSale,
  MerkleSale__factory as IMerkleSale__factory,
  MerkleFactory,
  MerkleFactory__factory,
} from "../../typechain-types"
import { ZERO_ADDRESS } from "../../utils/getAddress"
import { now } from "../utils"

import { MerkleSale } from "../../utils/merkle"

export enum ROLES {
  MINTER,
  BURNER,
  DESIGNER,
}

const MINTED_TOKEN = 100

const granter = (police: Police) => async (address: string) => {
  await police.setUserRole(address, ROLES.MINTER, true)
}

describe("MerkleSale.sol", function () {
  let owner: SignerWithAddress
  let alice: SignerWithAddress

  let lab: GBCLab
  let police: Police
  let implementation: IMerkleSale
  let factory: MerkleFactory
  let sale: IMerkleSale

  let merkle: MerkleSale

  let grant: (address: string) => Promise<void>

  this.beforeAll(async () => {
    const [owner_, user1_] = await ethers.getSigners()
    owner = owner_
    alice = user1_

    merkle = new MerkleSale([
      { to: owner.address, amount: 10 },
      { to: alice.address, amount: 4, cost: 0 },
    ])

    const policeFactory = new Police__factory(owner)
    police = await policeFactory.deploy(owner.address)
    await police.deployed()

    const itemsFactory = new GBCLab__factory(owner)
    lab = await itemsFactory.deploy(owner.address, police.address)
    await lab.deployed()

    const implementationFactory = new IMerkleSale__factory(owner)
    implementation = await implementationFactory.deploy()
    await implementation.deployed()

    const holderFactory = new MerkleFactory__factory(owner)
    factory = await holderFactory.deploy(implementation.address, owner.address)
    await factory.deployed()

    const setRoleTx = await police.setRoleCapability(
      ROLES.MINTER,
      lab.address,
      lab.interface.getSighash(
        lab.interface.functions["mint(address,uint256,uint256,bytes)"]
      ),
      true
    )
    setRoleTx.wait()

    grant = granter(police)
  })

  it("Should be possible to deploy sale from factory", async () => {
    const tx = await factory.deploy(
      lab.address,
      owner.address,
      ZERO_ADDRESS,
      0,
      0,
      10000,
      ethers.utils.parseEther("0.02"),
      MINTED_TOKEN,
      merkle.root,
      owner.address
    )
    const receipt = await tx.wait()
    let sale_ = ""
    receipt.logs.forEach((log) => {
      if (
        log.topics[0] ==
        "0x1365c884440d696b1f7aace8423543f2a5bc6939db2ba2ecc419c95c84cd9a2e"
      ) {
        const result = factory.interface.decodeEventLog(
          factory.interface.events["CreateSale(address)"],
          log.data,
          log.topics
        )
        sale_ = result.sale
      }
    })

    // @ts-ignore
    sale = await ethers.getContractAt("MerkleSale", sale_)

    expect(await sale.lab()).to.be.equal(lab.address)
    expect(await sale.receiver()).to.be.equal(owner.address)
    expect(await sale.token()).to.be.equal(ZERO_ADDRESS)
    expect(await sale.finish()).to.be.equal(BigNumber.from(0))
    expect(await sale.start()).to.be.equal(BigNumber.from(0))
    expect(await sale.supply()).to.be.equal(BigNumber.from(10000))
    expect(await sale.cost()).to.be.equal(ethers.utils.parseEther("0.02"))
    expect(await sale.item()).to.be.equal(BigNumber.from(MINTED_TOKEN))
    expect(await sale.root()).to.be.equal(merkle.root)

    await grant(sale.address)
  })

  it("Should be possible to mint tokens", async () => {
    let balance = await lab.balanceOf(alice.address, MINTED_TOKEN)
    expect(balance).to.be.equal(BigNumber.from(0))

    await sale.connect(alice).mint(merkle.rule(1), merkle.proof(1))

    balance = await lab.balanceOf(alice.address, MINTED_TOKEN)
    expect(balance).to.be.equal(BigNumber.from(4))
  })
})
