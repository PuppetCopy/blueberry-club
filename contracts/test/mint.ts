import { expect } from "chai"
import { ethers } from "hardhat"
import { GBC__factory } from 'contracts'

describe("Token contract", function () {
  it("Deployment should assign the total supply of tokens to the owner", async function () {
    const [signer] = (await ethers.getSigners())

    const contractFactory = new GBC__factory(signer)

    const hardhatToken = await contractFactory.deploy('GMX Blueberry Club', 'GBC', 'ipfs://hash/')
    const ownerBalance = await hardhatToken.balanceOf(signer.address)
      
    expect(await hardhatToken.totalSupply()).to.equal(ownerBalance)
  })
})