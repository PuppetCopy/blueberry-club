import { ethers, run } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();

  const GBC = await ethers.getContractFactory("GBCTestnet");
  const gbc = await GBC.deploy(
    "Blueberry Club",
    "GBC",
    "ipfs://QmZfVGMtQPeSfre5yHDzDdw4ocZ1WEakGtbYqvtvhhD4zQ/"
  );

  await gbc.deployed();

  console.log("Gbc deployed to:", gbc.address);

  try {
    await run("verify:verify", {
      address: gbc.address,
      constructorArguments: ["Blueberry Club", "GBC", ""],
    });
  } catch (error) {
    console.log(`Verfication failed`);
    console.error(error);
  }

  const tx = await gbc.adminMint(10, owner.address);
  await tx.wait();

  const Items = await ethers.getContractFactory("GBCLabsItems");
  const items = await Items.deploy();

  await items.deployed();

  console.log("Items deployed to:", items.address);

  const Sell = await ethers.getContractFactory("GBCLabsSaleExemple");
  const sell1 = await Sell.deploy(items.address, gbc.address, 700);

  await sell1.deployed();

  console.log("Sell deployed to:", sell1.address);

  const MINTER = await items.MINTER();
  const DESIGNER = await items.DESIGNER();
  await items.grantRole(DESIGNER, owner.address);
  await items.grantRole(MINTER, sell1.address);
  await items.addItem(6, 700);

  try {
    await run("verify:verify", {
      address: sell1.address,
      constructorArguments: [items.address, gbc.address, 700],
    });
  } catch (error) {
    console.log(`Verfication failed`);
    console.error(error);
  }

  const sell2 = await Sell.deploy(items.address, gbc.address, 701);

  await sell2.deployed();

  console.log("Sell deployed to:", sell2.address);

  await items.grantRole(MINTER, sell2.address);
  await items.addItem(2, 701);

  try {
    await run("verify:verify", {
      address: sell2.address,
      constructorArguments: [items.address, gbc.address, 701],
    });
  } catch (error) {
    console.log(`Verfication failed`);
    console.error(error);
  }

  try {
    await run("verify:verify", {
      address: items.address,
      constructorArguments: [],
    });
  } catch (error) {
    console.log(`Verfication failed`);
    console.error(error);
  }

  const Profile = await ethers.getContractFactory("GBCProfileSetter");
  const profile = await Profile.deploy(gbc.address);

  await profile.deployed();

  console.log("Profile deployed to:", profile.address);

  try {
    await run("verify:verify", {
      address: profile.address,
      constructorArguments: [gbc.address],
    });
  } catch (error) {
    console.log(`Verfication failed`);
    console.error(error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
