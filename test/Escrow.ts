import { expect } from "chai";
import hrdht from "hardhat";
const { ethers } = hrdht;

// Senior Tip: ethers v6 uses native BigInt.
// This helper converts a number string to Wei.
const tokens = (n: number | string): bigint => {
  return ethers.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  let buyer, seller, inspector, lender;
  let realEstate, escrow;
  it("saves the addresses", async () => {
    //setup accounts
    [buyer, seller, inspector, lender] = await ethers.getSigners();

    // deploy contract
    const RealEstateFactory = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstateFactory.deploy();

    // printing contract address. In ethers v6, use getAddress() instead of .address
    const realEstateAddr = await realEstate.getAddress();
    console.log(`Deployed RealEstate to: ${realEstateAddr}`);

    // mint
    let transaction = await realEstate.mintProperty(
      "https://images.bayut.com/thumbnails/810064744-800x600.webp",
    );
    await transaction.wait();

    // scrow
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    escrow = await EscrowFactory.deploy(
      realEstateAddr,
      await seller.getAddress(),
      await lender.getAddress(),
      await inspector.getAddress(),
    );

    // assertion
    const scrowAddr = await escrow.nftAddress();
    expect(scrowAddr).to.be.equal(realEstateAddr); //33:54
  });
});
