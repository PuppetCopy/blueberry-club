import { ethers, run } from "hardhat";

const GBC = "0x"

async function main() {
  const Items = await ethers.getContractFactory("GBCLabsItems");
  const items = await Items.deploy();

  await items.deployed();

  console.log("Items deployed to:", items.address);

  await run("verify:verify", {
    address: items.address,
    constructorArguments: []
  })
  const Profile = await ethers.getContractFactory("GBCProfileSetter");
  const profile = await Profile.deploy(GBC);

  await profile.deployed();

  console.log("Profile deployed to:", profile.address);

  await run("verify:verify", {
    address: profile.address,
    constructorArguments: [GBC]
  })
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
