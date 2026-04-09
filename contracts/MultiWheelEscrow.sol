// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MultiWheelEscrow is ReentrancyGuard {
    enum Stage { SellingPut, HoldingTokens, Closed }
    
    struct PutOption {
        address writer;
        address buyer;
        uint256 strikePrice;
        uint256 quantity;
        Stage stage;
        bool isActive;
    }

    IERC20 public token;
    uint256 public putCounter;
    mapping(uint256 => PutOption) public puts;

    event PutCreated(uint256 indexed putId, address indexed writer, uint256 strike, uint256 quantity);
    event PutPurchased(uint256 indexed putId, address indexed buyer, uint256 premium);
    event Assigned(uint256 indexed putId, uint256 ethSpent, uint256 tokensReceived);
    event CallWritten(uint256 indexed putId, uint256 strike);
    event CalledAway(uint256 indexed putId, uint256 ethReceived);

    constructor(address _token) {
        token = IERC20(_token);
    }

    // --- STAGE 1: Writer creates a Put (N Sellers) ---
    function writePut(uint256 _strike, uint256 _quantity) external payable returns (uint256) {
        uint256 requiredCollateral = _strike * _quantity;
        require(msg.value >= requiredCollateral, "Insufficient collateral for strike");

        uint256 putId = putCounter++;
        
        puts[putId] = PutOption({
            writer: msg.sender,
            buyer: address(0), // No buyer yet
            strikePrice: _strike,
            quantity: _quantity,
            stage: Stage.SellingPut,
            isActive: true
        });

        emit PutCreated(putId, msg.sender, _strike, _quantity);
        return putId;
    }

    // --- Optional: A Buyer purchases the specific Put (N Buyers) ---
    function buyPut(uint256 _putId) external payable {
        PutOption storage option = puts[_putId];
        require(option.isActive, "Put not active");
        require(option.buyer == address(0), "Already purchased");

        option.buyer = msg.sender;
        
        // Forward premium directly to the writer
        (bool success, ) = payable(option.writer).call{value: msg.value}("");
        require(success, "Premium transfer failed");

        emit PutPurchased(_putId, msg.sender, msg.value);
    }

    // --- STAGE 2: Assignment ---
    function settlePut(uint256 _putId, uint256 currentMarketPrice) external nonReentrant {
        PutOption storage option = puts[_putId];
        require(option.isActive && option.stage == Stage.SellingPut, "Invalid state");
        require(currentMarketPrice < option.strikePrice, "Strike not hit");
        require(option.buyer != address(0), "No buyer to settle with");

        uint256 totalEth = option.strikePrice * option.quantity;
        
        // State change first (CEI Pattern)
        option.stage = Stage.HoldingTokens;

        // SWAP: Tokens from Buyer to Contract, ETH from Contract to Buyer
        token.transferFrom(option.buyer, address(this), option.quantity);
        
        (bool success, ) = payable(option.buyer).call{value: totalEth}("");
        require(success, "ETH Transfer failed");
        
        emit Assigned(_putId, totalEth, option.quantity);
    }

    // --- STAGE 3: Writer sells Call against specific tokens ---
    function writeCall(uint256 _putId, uint256 _newStrike) external {
        PutOption storage option = puts[_putId];
        require(msg.sender == option.writer, "Only writer can write call");
        require(option.stage == Stage.HoldingTokens, "Not holding tokens");

        option.strikePrice = _newStrike;
        emit CallWritten(_putId, _newStrike);
    }

    // --- STAGE 4: Called Away ---
    function settleCall(uint256 _putId, uint256 currentMarketPrice) external payable nonReentrant {
        PutOption storage option = puts[_putId];
        require(currentMarketPrice >= option.strikePrice, "Below strike");

        uint256 totalEth = option.strikePrice * option.quantity;
        require(msg.value >= totalEth, "Insufficient ETH sent");

        address callBuyer = msg.sender;

        // Reset stage for the next loop or close it
        option.stage = Stage.SellingPut; 

        // SWAP: Tokens to Buyer, ETH to the original Writer
        token.transfer(callBuyer, option.quantity);
        
        (bool success, ) = payable(option.writer).call{value: totalEth}("");
        require(success, "ETH Transfer failed");
        
        emit CalledAway(_putId, totalEth);
    }
}