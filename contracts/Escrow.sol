// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC721 {
    function transferFrom(address _from, address _to, uint256 _id) external;
}

contract Escrow {
    struct PropertyInfo {
        uint256 id;
        uint256 propertyPrice;
        uint256 downPayment;
        uint256 accountBalance;
        address buyer;
        address seller;
        address lender;
        address inspector;
        bool isListed;
        bool inspectionPassed;
    }

    address public nftAddress;
    mapping(uint256 => PropertyInfo) public propertyInfo;
    mapping(uint256 => mapping(address => bool)) public approvals;

    modifier onlySeller(address _seller) {
        require(msg.sender == _seller, "Only seller can call this method");
        _;
    }

    modifier onlyBuyer(address _buyer) {
        require(msg.sender == _buyer, "Only buyer can call this method");
        _;
    }

    modifier onlyInspector(address _inspector) {
        require(
            msg.sender == _inspector,
            "Only inspector can call this method"
        );
        _;
    }

    modifier onlyLender(address _lender) {
        require(msg.sender == _lender, "Only lender can call this method");
        _;
    }

    constructor(address _nftAddress) {
        nftAddress = _nftAddress;
    }

    function list(
        PropertyInfo memory _info
    ) public payable onlySeller(_info.seller) {
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _info.id);
        propertyInfo[_info.id] = _info;
        propertyInfo[_info.id].isListed = true;
    }

    function depositDownPayment(
        uint256 _nftId
    ) public payable onlyBuyer(propertyInfo[_nftId].buyer) {
        require(msg.value >= propertyInfo[_nftId].downPayment);
        propertyInfo[_nftId].accountBalance = msg.value;
    }

    function updateInspectionStatus(
        uint256 _nftId,
        bool _passed
    ) public onlyInspector(propertyInfo[_nftId].inspector) {
        propertyInfo[_nftId].inspectionPassed = _passed;
    }

    function depositLendingAmount(
        uint256 _nftId
    ) public payable onlyLender(propertyInfo[_nftId].lender) {
        require(
            msg.value + propertyInfo[_nftId].accountBalance >=
                propertyInfo[_nftId].propertyPrice,
            "Not enough money"
        );
        propertyInfo[_nftId].accountBalance += msg.value;
    }

    function approveSale(uint256 _nftId) public {
        approvals[_nftId][msg.sender] = true;
    }

    function finalizeSale(uint256 _nftId) public payable {
        // 1. CHECKS
        require(propertyInfo[_nftId].inspectionPassed, "Inspection must pass");
        require(
            approvals[_nftId][propertyInfo[_nftId].buyer],
            "Buyer must approve"
        );
        require(
            approvals[_nftId][propertyInfo[_nftId].seller],
            "Seller must approve"
        );
        require(
            approvals[_nftId][propertyInfo[_nftId].lender],
            "Lender must approve"
        );

        // Check that we specifically have enough for THIS sale
        // (Assuming you've tracked the balance for this ID specifically)
        require(
            address(this).balance >= propertyInfo[_nftId].propertyPrice,
            "Insufficient contract balance"
        );
        require(
            propertyInfo[_nftId].accountBalance >=
                propertyInfo[_nftId].propertyPrice,
            "Insufficient account balance"
        );

        // 2. EFFECTS (Update state BEFORE sending money)
        propertyInfo[_nftId].isListed = false;

        // 3. INTERACTIONS
        // Send only the propertyPrice of the property, not the whole contract balance
        uint256 amount = propertyInfo[_nftId].propertyPrice;
        (bool success, ) = payable(propertyInfo[_nftId].seller).call{
            value: amount
        }("");
        require(success, "Payment to seller failed");

        // Transfer the NFT to the buyer
        IERC721(nftAddress).transferFrom(
            address(this),
            propertyInfo[_nftId].buyer,
            _nftId
        );
    }

    receive() external payable {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
