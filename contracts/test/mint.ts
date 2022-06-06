/**
 * import { expect } from "chai"
import { ethers } from "hardhat"
import { Police, GBC, PermissionedWhitelist__factory, GBCLab, GBCLab__factory, GBC__factory, Police__factory, SaleBasic__factory } from "../typechain-types"
import { MerkleTree } from 'merkletreejs'
import { keccak256, parseEther } from "ethers/lib/utils"
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

  describe.only("Mint different Sales", () => {

    it('public sale', async () => {

      const saleFactory = new SaleBasic__factory(owner)
      const sale = await saleFactory.deploy(lab.address, owner.address, 12, parseEther("0.3"), 100, 20, 0)
      await sale.deployed()
      await police.setUserRole(sale.address, ROLES.MINTER, true)

      const user1connect = sale.connect(user1)

      const cost = parseEther("0.3")


      expect(await user1connect.publicMint(1, { value: cost })).ok
      expect(await lab.balanceOf(user1.address, 12)).eq(1)
      await expect(user1connect.publicMint(1, { value: cost.mul(2) })).revertedWith("Error_Cost")
      await expect(user1connect.publicMint(2, { value: cost })).revertedWith("Error_Cost")

      expect(await sale.cancel()).ok

      await expect(user1connect.publicMint(1, { value: cost })).revertedWith('Error_Canceled')
    })

    it('allow only whitelisted accounts to mint', async () => {
      const accounts = await ethers.getSigners()
      const whitelisted = accounts.slice(0, 5)
      const notWhitelisted = accounts.slice(5, 10)

      const leaves = whitelisted.map(account => keccak256(account.address))
      const tree = new MerkleTree(leaves, keccak256, { sort: true })
      const merkleRoot = tree.getHexRoot()

      const wlFactory = new PermissionedWhitelist__factory(owner)
      const sale = await wlFactory.deploy(lab.address, owner.address, 12, parseEther("0.3"), 100, 20, 0, merkleRoot)
      await police.setUserRole(sale.address, ROLES.MINTER, true)

      const wlUser1Connect = sale.connect(whitelisted[0])
      const nonWlUser1Connect = sale.connect(notWhitelisted[0])

      const merkleProof = tree.getHexProof(keccak256(whitelisted[0].address))
      const invalidMerkleProof = tree.getHexProof(keccak256(notWhitelisted[0].address))

      expect(await wlUser1Connect.whitelistMint(merkleProof)).ok
      await expect(wlUser1Connect.whitelistMint(merkleProof)).revertedWith('Error_Claimed')
      await expect(nonWlUser1Connect.whitelistMint(invalidMerkleProof)).revertedWith('Error_InvalidProof')
      expect(await wlUser1Connect.publicMint(1, { value: parseEther("0.3") })).ok
      expect(await nonWlUser1Connect.publicMint(1, { value: parseEther("0.3") })).ok

    })

  })


})


 */
