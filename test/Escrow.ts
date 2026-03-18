import { expect } from "chai";
import hrdht from "hardhat";
const { ethers } = hrdht;

// Senior Tip: ethers v6 uses native BigInt.
// This helper converts a number string to Wei.
const tokens = (n: number | string): bigint => {
  return ethers.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  it("saves the addresses", async () => {
    // 1. Get the Contract Factory
    // NOTE: Match the string exactly to your .sol filename or contract name
    const RealEstateFactory = await ethers.getContractFactory("RealEstate");

    // 2. Deploy the contract
    const realEstate = await RealEstateFactory.deploy();

    // 3. In ethers v6, use getAddress() instead of .address
    const address = await realEstate.getAddress();

    console.log(`Deployed RealEstate to: ${address}`);

    // 4. Assertion
    expect(address).to.be.properAddress;
  });
});
