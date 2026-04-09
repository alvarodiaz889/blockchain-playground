import { expect } from "chai";
import { ethers } from "hardhat";

// Senior Tip: ethers v6 uses native BigInt.
// This helper converts a number string to Wei.
const tokens = (n: number | string): bigint => {
  return ethers.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  let deployer: any, buyer: any, seller: any, inspector: any, lender: any;
  let realEstate: any, escrow: any;
  let deployerAddr: any,
    sellerAddr: any,
    buyerAddr: any,
    lenderAddr: any,
    inspectorAddr: any;

  const nftId = 0;
  const propertyPrice = ethers.parseEther("10");
  const downPayment = ethers.parseEther("5");
  const listingFee = ethers.parseEther("0");
  const lendingAmount = ethers.parseEther("5");
  const defaultProperty = {
    id: nftId,
    propertyPrice,
    downPayment,
    accountBalance: 0,
    buyer: ethers.ZeroAddress,
    seller: ethers.ZeroAddress,
    lender: ethers.ZeroAddress,
    inspector: ethers.ZeroAddress,
    isListed: false,
    inspectionPassed: false,
  };

  beforeEach(async () => {
    //setup accounts
    [deployer, buyer, seller, inspector, lender] = await ethers.getSigners();
    deployerAddr = await deployer.getAddress();
    sellerAddr = await seller.getAddress();
    buyerAddr = await buyer.getAddress();
    lenderAddr = await lender.getAddress();
    inspectorAddr = await inspector.getAddress();

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
    escrow = await EscrowFactory.deploy(await realEstate.getAddress());
    await escrow.waitForDeployment();

    // The Seller must "Approve" the Escrow contract to take the NFT
    const escrowAddr = await escrow.getAddress();
    transaction = await realEstate.connect(seller).approve(escrowAddr, nftId);
    await transaction.wait();

    // Now the list function can successfully "transferFrom"
    const propertyInfo = {
      ...defaultProperty,
      buyer: buyerAddr,
      seller: sellerAddr,
      inspector: inspectorAddr,
      lender: lenderAddr,
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
  });

  describe("listing", () => {
    it("Updates Ownership", async () => {
      const ownerOf = await realEstate.ownerOf(nftId);
      expect(ownerOf).to.be.equal(await escrow.getAddress());
    });

    it("Property info is valid", async () => {
      const {
        id: _id,
        propertyPrice: _propertyPrice,
        downPayment: _downPayment,
        buyer: _buyer,
        seller: _seller,
        lender: _lender,
        inspector: _inspector,
        isListed: _isListed,
      } = await escrow.propertyInfo(nftId);

      expect(_id).to.be.equal(nftId);
      expect(_propertyPrice).to.be.equal(propertyPrice);
      expect(_downPayment).to.be.equal(downPayment);
      expect(_buyer).to.be.equal(buyerAddr);
      expect(_seller).to.be.equal(sellerAddr);
      expect(_lender).to.be.equal(lenderAddr);
      expect(_inspector).to.be.equal(inspectorAddr);
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
        ...defaultProperty,
        buyer: buyerAddr,
        seller: sellerAddr,
        inspector: inspectorAddr,
        lender: lenderAddr,
      };

      await expect(
        escrow.connect(buyer).list(propertyInfo, { value: listingFee }),
      ).to.be.rejectedWith("Only seller can call this method");
    });
  });

  describe("Desposits", () => {
    it("Should validate Down payment", async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositDownPayment(nftId, { value: downPayment });
      await transaction.wait();

      const balance = await escrow.getBalance();
      expect(balance).to.greaterThanOrEqual(downPayment);
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

  describe("Lending", () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositDownPayment(nftId, { value: downPayment });
      await transaction.wait();

      transaction = await escrow
        .connect(lender)
        .depositLendingAmount(nftId, { value: lendingAmount });
      await transaction.wait();
    });

    it("Lender add funds to contract", async () => {
      const contractBalance = await escrow.getBalance();
      expect(contractBalance).to.be.greaterThanOrEqual(propertyPrice);
    });

    it("Updates property balance", async () => {
      const { accountBalance: _accountBalance } =
        await escrow.propertyInfo(nftId);
      expect(_accountBalance).to.be.equal(propertyPrice);
    });
  });

  describe("Sale", () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositDownPayment(nftId, { value: downPayment });
      await transaction.wait();

      transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(nftId, true);
      await transaction.wait();

      transaction = await escrow.connect(buyer).approveSale(nftId);
      await transaction.wait();

      transaction = await escrow.connect(seller).approveSale(nftId);
      await transaction.wait();

      transaction = await escrow
        .connect(lender)
        .depositLendingAmount(nftId, { value: lendingAmount });
      await transaction.wait();

      transaction = await escrow.connect(lender).approveSale(nftId);
      await transaction.wait();

      transaction = await escrow.connect(seller).finalizeSale(nftId);
      await transaction.wait();
    });

    it("Updates ownership to buyer", async () => {
      expect(await realEstate.ownerOf(nftId)).to.be.equal(buyer.address);
    });

    it("Updates balance of selelr", async () => {
      const balance = await ethers.provider.getBalance(sellerAddr);
      expect(balance).to.be.greaterThanOrEqual(propertyPrice);
    });
  });
});
