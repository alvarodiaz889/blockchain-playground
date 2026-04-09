// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 1. IMPORT the full implementation, not just the interface (IERC20)
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    // 2. Add a constructor to name your "Stock"
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        // 3. Mint the initial supply to the deployer (you) 
        // Note: initialSupply should be in "wei" (e.g., 1000 * 10**18)
        _mint(msg.sender, initialSupply);
    }

    // Optional: Add a function so you can mint more tokens during testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}