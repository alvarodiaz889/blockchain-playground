import hrdht from "hardhat";
const { ethers } = hrdht;

async function main() {
  const [deployer, buyer, seller, inspector, lender] =
    await ethers.getSigners();

  const deployerAddr = await deployer.getAddress();
  const sellerAddr = await seller.getAddress();

  console.log("Deploying Real State contract...");
  // deploy contract real
  const RealEstateFactory = await ethers.getContractFactory("RealEstate");
  const realEstate = await RealEstateFactory.deploy();
  await realEstate.waitForDeployment();

  const realEstateAddr = await realEstate.getAddress();
  console.log(`✅ RealEstate deployed to: ${realEstateAddr}`);

  // scrow deployment
  const EscrowFactory = await ethers.getContractFactory("Escrow");
  const escrow = await EscrowFactory.deploy(await realEstate.getAddress());
  await escrow.waitForDeployment();

  const escrowAddr = await escrow.getAddress();
  console.log(`✅ Escrow deployed to: ${escrowAddr}`);

  // mint properties
  for (let nftId = 0; nftId < 10; nftId++) {
    let transaction = await realEstate.mintProperty(
      `https://alvarodiaz889.github.io/blockchain-playground/metadata/${nftId + 1}.json`,
    );
    await transaction.wait();

    // transfer all tokens to seller so he can list them later
    transaction = await realEstate.transferFrom(
      deployerAddr,
      sellerAddr,
      nftId,
    );
    await transaction.wait();

    // The Seller must "Approve" the Escrow contract to take the NFT
    transaction = await realEstate.connect(seller).approve(escrowAddr, nftId);
    await transaction.wait();
  }

  console.log(`✅ Deployment Done!`);
}

// Standard pattern for running async functions in TS
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
