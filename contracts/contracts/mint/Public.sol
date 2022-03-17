// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IMint } from "./interface/Mint.sol";


contract Public is Ownable {

    uint public TOKEN_ID;
    uint256 public MAX;

    uint256 public maxMintPerTx = 20;
    uint public minted = 0;

    uint256 public cost = 0.01 ether;

    bool public saleStarted = false;

    IMint public ITEMS;
    IERC721 public GBC;

    constructor(address _items, address _gbc, uint _max, uint _id) {
        ITEMS = IMint(_items);
        GBC = IERC721(_gbc);
        MAX = _max;
        TOKEN_ID = _id;
    }

    function mint(uint256 _mintAmount) external payable {
        require(saleStarted == true, "Sale is not available");
        require(_mintAmount <= maxMintPerTx, "Exceeds max amount per transaction allowed");
        require(minted + _mintAmount <= MAX, "Transaction exceeds max mint amount");

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

    function startSale() external onlyOwner {
        saleStarted = true;
    }

    function stopSale() external onlyOwner {
        saleStarted = false;
    }

}