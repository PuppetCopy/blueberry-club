import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber, BigNumberish } from "ethers"
import { ethers } from "hardhat"
import { MerkleTree } from "merkletreejs"
import {
  GBC,
  GBC__factory,
  GBCLab__factory,
  GBCLab,
  Police,
  Police__factory,
  SaleMerkleTest,
  SaleMerkleTest__factory,
} from "../../typechain-types"
import { MerkleMintRuleStruct } from "../../typechain-types/contracts/lab/sales/extensions/mint/whitelist/Merkle.sol/PrivateMerkle"
import { now } from "../utils"
import keccak256 from "keccak256"

const getHash = (
  to: string,
  cost: BigNumberish,
  start: BigNumberish,
  transaction: BigNumberish,
  amount: BigNumberish,
  nonce: BigNumberish
) => {
  return ethers.utils.solidityKeccak256(
    ["address", "uint208", "uint64", "uint120", "uint120", "uint96"],
    [to, cost, start, transaction, amount, nonce]
  )
}

export enum ROLES {
  MINTER,
  BURNER,
  DESIGNER,
}

const MINTED_TOKEN = 100

describe("Merkle.sol", function () {
  let owner: SignerWithAddress
  let bob: SignerWithAddress
  let alice: SignerWithAddress

  let gbc: GBC
  let lab: GBCLab
  let police: Police
  let sale: SaleMerkleTest

  let end: number
  let root: string
  let leaves: string[]
  let rules: MerkleMintRuleStruct[]
  let tree: MerkleTree

  this.beforeAll(async () => {
    const [owner_, user1_, user2_] = await ethers.getSigners()
    owner = owner_
    bob = user1_
    alice = user2_
    const gbcFactory = new GBC__factory(owner)

    rules = [
      {
        to: owner.address,
        cost: ethers.utils.parseEther("0.02"),
        start: 0,
        transaction: 10,
        amount: 100,
        nonce: 0,
      },
      {
        to: owner.address,
        cost: ethers.utils.parseEther("0.02"),
        start: 0,
        transaction: 10,
        amount: 100,
        nonce: 1,
      },
      {
        to: owner.address,
        cost: 0,
        start: 0,
        transaction: 1,
        amount: 1,
        nonce: 2,
      },
      {
        to: alice.address,
        cost: 0,
        start: 0,
        transaction: 1,
        amount: 1,
        nonce: 0,
      },
      {
        to: bob.address,
        cost: 0,
        start: 0,
        transaction: 1,
        amount: 1,
        nonce: 0,
      },
    ]

    leaves = rules.map((rule) => {
      return getHash(
        rule.to,
        BigNumber.from(rule.cost),
        rule.start,
        rule.transaction,
        rule.amount,
        rule.nonce
      )
    })

    tree = new MerkleTree(leaves, keccak256)

    root = tree.getHexRoot()

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

    const saleFactory = new SaleMerkleTest__factory(owner)
    sale = await saleFactory.deploy(
      MINTED_TOKEN,
      lab.address,
      {
        max: 1000,
        minted: 0,
        paused: 1,
      },
      owner.address,
      end,
      root
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
    const hashes_ = await Promise.all(
      rules.map((rule) => {
        return sale.getMerkleHash(rule)
      })
    )
    hashes_.forEach((hash) => {
      expect(leaves.includes(hash)).to.be.true
    })
    expect(await sale.totalMinted()).to.be.equal(BigNumber.from(0))

    await sale.merkleMint(rules[2], tree.getHexProof(leaves[2]), 1)
    expect(await sale.totalMinted()).to.be.equal(BigNumber.from(1))
    expect(await lab.balanceOf(owner.address, MINTED_TOKEN)).to.be.equal(
      BigNumber.from(1)
    )
  })

  it("Should not be possible to use 2 times the same leaf", async () => {
    expect(
      sale.merkleMint(rules[2], tree.getHexProof(leaves[2]), 1)
    ).to.be.revertedWith("")
  })
})
