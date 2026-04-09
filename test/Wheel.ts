import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { MultiWheelEscrow, MockToken } from "../typechain-types"; // Assumes you're using Typechain

describe("MultiWheelEscrow", function () {
  let escrow: MultiWheelEscrow;
  let token: MockToken;
  let owner: HardhatEthersSigner;
  let writer: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let callBuyer: HardhatEthersSigner;

  const QUANTITY = 100n;
  const STRIKE_PRICE = ethers.parseEther("1");
  const PREMIUM = ethers.parseEther("0.1");

  beforeEach(async function () {
    [owner, writer, buyer, callBuyer] = await ethers.getSigners();

    // Deploy Mock Token
    const TokenFactory = await ethers.getContractFactory("MockToken");
    token = (await TokenFactory.deploy(
      "Tesla",
      "TSLA",
      ethers.parseEther("1000"),
    )) as MockToken;

    // Deploy Escrow
    const EscrowFactory = await ethers.getContractFactory("MultiWheelEscrow");
    escrow = (await EscrowFactory.deploy(
      await token.getAddress(),
    )) as MultiWheelEscrow;

    // Funding the buyer
    await token.transfer(buyer.address, QUANTITY);
  });

  it("Should execute the full Wheel cycle in TypeScript", async function () {
    const collateral = STRIKE_PRICE * QUANTITY;

    // STAGE 1: writePut
    await expect(
      escrow
        .connect(writer)
        .writePut(STRIKE_PRICE, QUANTITY, { value: collateral }),
    )
      .to.emit(escrow, "PutCreated")
      .withArgs(0, writer.address, STRIKE_PRICE, QUANTITY);

    // STAGE 1.5: buyPut
    const initialWriterBal = await ethers.provider.getBalance(writer.address);
    await expect(escrow.connect(buyer).buyPut(0, { value: PREMIUM })).to.emit(
      escrow,
      "PutPurchased",
    );

    // STAGE 2: settlePut
    await token.connect(buyer).approve(await escrow.getAddress(), QUANTITY);
    const marketPriceDrop = ethers.parseEther("0.8");

    await expect(escrow.settlePut(0, marketPriceDrop)).to.emit(
      escrow,
      "Assigned",
    );

    // STAGE 3: writeCall
    const callStrike = ethers.parseEther("1.2");
    await expect(escrow.connect(writer).writeCall(0, callStrike)).to.emit(
      escrow,
      "CallWritten",
    );

    // STAGE 4: settleCall
    const marketPriceRise = ethers.parseEther("1.5");
    const callPurchaseValue = callStrike * QUANTITY;

    await expect(
      escrow
        .connect(callBuyer)
        .settleCall(0, marketPriceRise, { value: callPurchaseValue }),
    ).to.emit(escrow, "CalledAway");

    // Final Validation
    const option = await escrow.puts(0);
    expect(option.stage).to.equal(0); // Stage.SellingPut
  });
});
