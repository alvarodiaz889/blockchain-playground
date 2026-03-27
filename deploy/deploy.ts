import hrdht from "hardhat";
const { ethers } = hrdht;

interface Property {
  id: number;
  propertyPrice: string;
  downPayment: string;
  accountBalance: string;
  buyer: string;
  seller: string;
  lender: string;
  inspector: string;
  isListed: boolean;
  inspectionPassed: boolean;
}

async function main() {
  const [deployer, buyer, seller, inspector, lender] =
    await ethers.getSigners();

  const listingFee = ethers.parseEther("0.0001");
  const precentage = 0.2;

  const getRandomPrice = (): number => {
    const minValue = 50;
    const maxValue = 100;

    return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
  };

  const deployerAddr = await deployer.getAddress();
  const buyerAddr = await buyer.getAddress();
  const sellerAddr = await seller.getAddress();
  const inspectorAddr = await inspector.getAddress();
  const lenderAddr = await lender.getAddress();

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

    // Now the list function can successfully "transferFrom"
    const price = getRandomPrice();
    const feeEth = price * precentage;
    const downPayment = ethers.parseEther(feeEth.toFixed(18));

    const property: Property = {
      id: nftId,
      accountBalance: "0",
      downPayment,
      propertyPrice: ethers.parseEther(price.toFixed(18)),
      buyer: buyerAddr,
      seller: sellerAddr,
      inspector: inspectorAddr,
      lender: lenderAddr,
      isListed: false,
      inspectionPassed: false,
    };

    transaction = await escrow
      .connect(seller)
      .list(property, { value: listingFee });
    await transaction.wait();

    console.log(`✅ Property Deployed`, property);
  }

  console.log(`✅ Deployment Done!`);
}

// Standard pattern for running async functions in TS
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
