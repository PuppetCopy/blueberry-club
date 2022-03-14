// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGBCLabsItems {
    function mint(address to, uint id, uint amount) external;
}

contract GBCLabsSaleExemple is Ownable {

    uint TOKEN_ID;

    uint256 public max = 10000;
    uint256 public maxMintPerTx = 20;
    uint public minted = 0;

    uint256 public cost = 0.03 ether;

    IGBCLabsItems public ITEMS;
    IERC721 public GBC;

    constructor(address _items, address _gbc ,uint id) {
        ITEMS = IGBCLabsItems(_items);
        GBC = IERC721(_gbc);
        TOKEN_ID = id;
    }

    function mint(uint256 _mintAmount) external payable {
        require(_mintAmount <= maxMintPerTx, "Exceeds max amount per transaction allowed");
        if(minted + _mintAmount <= 1000) {
            require(GBC.balanceOf(msg.sender) > 0, "You don't own GBC");
        } else {
            require(msg.value >= cost * _mintAmount, "Not enough ether provided");
        }
        require(minted + _mintAmount <= max, "Transaction exceeds max mint amount");
        ITEMS.mint(msg.sender, TOKEN_ID, _mintAmount);
        minted += _mintAmount;
    }

    function withdraw(address token, uint256 amount) external onlyOwner {
        if(token == address(0)) { 
            payable(_msgSender()).transfer(amount);
        } else {
            IERC20(token).transfer(_msgSender(), amount);
        }
    }
}