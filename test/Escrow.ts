import { expect } from "chai";
import hrdht from "hardhat";
const { ethers } = hrdht;

// Senior Tip: ethers v6 uses native BigInt.
// This helper converts a number string to Wei.
const tokens = (n: number | string): bigint => {
  return ethers.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  let deployer: any, buyer: any, seller: any, inspector: any, lender: any;
  let realEstate: any, escrow: any;
  const nftId = 0;
  const price = ethers.parseEther("10");
  const escrowAmount = ethers.parseEther("5");
  const listingFee = ethers.parseEther("0");
  const lendingAmount = ethers.parseEther("5");

  beforeEach(async () => {
    //setup accounts
    [deployer, buyer, seller, inspector, lender] = await ethers.getSigners();
    const deployerAddr = await deployer.getAddress();
    const sellerAddr = await seller.getAddress();
    const inspectorAddr = await inspector.getAddress();
    const lenderAddr = await lender.getAddress();

    // deploy contract
    const RealEstateFactory = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstateFactory.deploy();
    await realEstate.waitForDeployment();

    // mint
    let transaction = await realEstate.mintProperty(
      "https://images.bayut.com/thumbnails/810064744-800x600.webp",
    );
    await transaction.wait();

    transaction = await realEstate.transferFrom(
      deployerAddr,
      sellerAddr,
      nftId,
    );
    await transaction.wait();

    // scrow deployment
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    escrow = await EscrowFactory.deploy(
      await realEstate.getAddress(),
      sellerAddr,
      lenderAddr,
      inspectorAddr,
    );
    await escrow.waitForDeployment();

    const escrowAddr = await escrow.getAddress();
    // The Seller must "Approve" the Escrow contract to take the NFT
    transaction = await realEstate.connect(seller).approve(escrowAddr, nftId);
    await transaction.wait();

    // Now the list function can successfully "transferFrom"
    const propertyInfo = {
      id: nftId,
      buyer: await buyer.getAddress(),
      price,
      escrowAmount,
      isListed: false,
      inspectionPassed: false,
    };

    transaction = await escrow
      .connect(seller)
      .list(propertyInfo, { value: listingFee });
    await transaction.wait();
  });

  describe("deployment", () => {
    it("Returns NFT address", async () => {
      const result = await escrow.nftAddress();
      expect(result).to.be.equal(await realEstate.getAddress());
    });

    it("Returns seller", async () => {
      const result = await escrow.seller();
      expect(result).to.be.equal(await seller.getAddress());
    });

    it("Returns inspector", async () => {
      const result = await escrow.inspector();
      expect(result).to.be.equal(await inspector.getAddress());
    });

    it("Returns lender", async () => {
      const result = await escrow.lender();
      expect(result).to.be.equal(await lender.getAddress());
    });
  });

  describe("listing", () => {
    it("Updates Ownership", async () => {
      const ownerOf = await realEstate.ownerOf(nftId);
      expect(ownerOf).to.be.equal(await escrow.getAddress());
    });

    it("Property info is valid", async () => {
      const {
        id: _id,
        price: _price,
        escrowAmount: _escrowAmount,
        buyer: _buyer,
        isListed: _isListed,
      } = await escrow.propertyInfo(nftId);

      expect(_id).to.be.equal(nftId);
      expect(_price).to.be.equal(price);
      expect(_escrowAmount).to.be.equal(escrowAmount);
      expect(_buyer).to.be.equal(await buyer.getAddress());
      expect(_isListed).to.be.true;
    });

    it("Checks the balance on Escrow after listing", async () => {
      // const balance = await ethers.provider.getBalance(
      //   await escrow.getAddress(),
      // );
      const balance = await escrow.getBalance();
      expect(balance).to.equal(listingFee);
    });

    it("Fails if someone other than the seller tries to list", async () => {
      const propertyInfo = {
        id: nftId,
        buyer: await buyer.getAddress(),
        price,
        seller: await seller.getAddress(),
        escrowAmount,
        isListed: false,
        inspectionPassed: false,
      };

      await expect(
        escrow.connect(buyer).list(propertyInfo, { value: listingFee }),
      ).to.be.rejectedWith("Only seller can call this method");
    });
  });

  describe("Desposits", () => {
    it("Should validate Earnest", async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositEarnest(nftId, { value: escrowAmount });
      await transaction.wait();

      const balance = await escrow.getBalance();
      expect(balance).to.greaterThanOrEqual(escrowAmount);
    });
  });

  describe("Inspection", () => {
    it("Updates inspection", async () => {
      let transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(nftId, true);

      await transaction.wait();

      const { inspectionPassed } = await escrow.propertyInfo(nftId);
      expect(inspectionPassed).to.be.true;
    });
  });

  describe("Approve", () => {
    it("Lender Approves", async () => {
      let transaction = await escrow.connect(lender).approveSale(nftId);
      await transaction.wait();

      const lenderAddr = await lender.getAddress();
      const isApproved = await escrow.approvals(nftId, lenderAddr);
      expect(isApproved).to.be.true;
    });

    it("Buyer Approves", async () => {
      let transaction = await escrow.connect(buyer).approveSale(nftId);
      await transaction.wait();

      const buyerAddr = await buyer.getAddress();
      const isApproved = await escrow.approvals(nftId, buyerAddr);
      expect(isApproved).to.be.true;
    });

    it("Seller Approves", async () => {
      let transaction = await escrow.connect(seller).approveSale(nftId);
      await transaction.wait();

      const sellerAddr = await seller.getAddress();
      const isApproved = await escrow.approvals(nftId, sellerAddr);
      expect(isApproved).to.be.true;
    });
  });

  describe("Sale", () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositEarnest(nftId, { value: escrowAmount });
      await transaction.wait();

      transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(nftId, true);
      await transaction.wait();

      transaction = await escrow.connect(buyer).approveSale(nftId);
      await transaction.wait();

      transaction = await escrow.connect(seller).approveSale(nftId);
      await transaction.wait();

      transaction = await escrow.connect(lender).approveSale(nftId);
      await transaction.wait();

      await lender.sendTransaction({
        to: escrow.address,
        value: lendingAmount,
      });

      transaction = await escrow.connect(seller).finalizeSale(nftId);
      await transaction.wait();
    });

    it("Updates ownership", async () => {
      expect(await realEstate.ownerOf(nftId)).to.be.equal(buyer.address);
    });

    it("Updates balance", async () => {
      expect(await escrow.getBalance()).to.be.equal(0);
    });
  });
});
