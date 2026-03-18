// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Escrow {
    address public nftAddress;
    address payable public seller;
    address public lender;
    address public inspector;

    constructor(
        address _nftAddress,
        address payable _seller,
        address _lender,
        address _inspector
    ) {
        nftAddress = _nftAddress;
        seller = _seller;
        lender = _lender;
        inspector = _inspector;
    }
}
