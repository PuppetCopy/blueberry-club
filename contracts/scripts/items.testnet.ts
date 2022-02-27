import { ethers, run } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners()

  const GBC = await ethers.getContractFactory("GBCTestnet");
  const gbc = await GBC.deploy("Blueberry Club", "GBC", "");

  await gbc.deployed();

  console.log("Gbc deployed to:", gbc.address);

  try {
    await run("verify:verify", {
      address: gbc.address,
      constructorArguments: ["Blueberry Club", "GBC", ""]
    })
  } catch (error) {
    console.log(`Verfication failed`)
    console.error(error)
  }

  const tx = await gbc.adminMint(10, owner.address)
  await tx.wait()

  const Items = await ethers.getContractFactory("GBCLabsItems");
  const items = await Items.deploy();

  await items.deployed();

  console.log("Items deployed to:", items.address);

  try {
    await run("verify:verify", {
      address: items.address,
      constructorArguments: []
    })
  } catch (error) {
    console.log(`Verfication failed`)
    console.error(error)
  }

  const Profile = await ethers.getContractFactory("GBCProfileSetter");
  const profile = await Profile.deploy(gbc.address);

  await profile.deployed();

  console.log("Profile deployed to:", profile.address);

  try {
    await run("verify:verify", {
      address: profile.address,
      constructorArguments: [gbc.address]
    })
  } catch (error) {
    console.log(`Verfication failed`)
    console.error(error)
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
