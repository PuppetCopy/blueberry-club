// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IMint } from "./interface/Mint.sol";


contract Whitelist is Ownable {

    uint public TOKEN_ID;
    uint256 public MAX;
    
    uint256 public maxMintPerTx = 20;
    uint public minted = 0;

    uint256 public cost = 0.01 ether;

    bool public whitelistStarted = false;
    bool public saleStarted = false;

    mapping(address => bool) blacklist;

    IMint public ITEMS;
    IERC721 public GBC;

    constructor(address _items, address _gbc, uint _max, uint _id) {
        ITEMS = IMint(_items);
        GBC = IERC721(_gbc);
        MAX = _max;
        TOKEN_ID = _id;
    }

    // function whitelistMint(uint256[] _gbcList) external payable {
    //     require(whitelistStarted == true, "Sale is not available");

    //     for (uint256 i = 1; i <= _gbcList; i++) {
    //         uint256 memory tokenId = _gbcList[i];

    //         blacklist[tokenId] = true;
            
    //         require(GBC.balanceOf(msg.sender) > 0, "You don't own GBC");
            
    //         ITEMS.mint(msg.sender, TOKEN_ID, 1);
    //     }
    // }

    function mint(uint256 _mintAmount) external payable {
        require(saleStarted == true, "Sale is not available");
        require(_mintAmount <= maxMintPerTx, "Exceeds max amount per transaction allowed");
        if(minted + _mintAmount <= 1000) {
        } else {
            require(minted + _mintAmount <= MAX, "Transaction exceeds max mint amount");
        }
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

    function startWhitelist() external onlyOwner {
        whitelistStarted = true;
    }

    function stopWhitelist() external onlyOwner {
        whitelistStarted = false;
    }

    function startSale() external onlyOwner {
        saleStarted = true;
    }

    function stopSale() external onlyOwner {
        saleStarted = false;
    }

}