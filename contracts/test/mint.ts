
import { expect } from "chai"
import { ethers } from "hardhat"
import { Police, GBC, GBCLab, GBCLab__factory, GBC__factory, Police__factory } from "../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

// TODO: (aling to custom errors) https://github.com/dethcrypto/TypeChain/pull/682

export enum ROLES {
  MINTER,
  BURNER,
  DESIGNER
}

describe("Minting through contracts", function () {

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

  it("Deployment should assign the total supply of tokens to the owner", async function () {
    const [signer] = (await ethers.getSigners())

    const contractFactory = new GBC__factory(signer)

    const hardhatToken = await contractFactory.deploy('GMX Blueberry Club', 'GBC', 'ipfs://hash/')
    const ownerBalance = await hardhatToken.balanceOf(signer.address)

    expect(await hardhatToken.totalSupply()).to.equal(ownerBalance)
  })


})

