// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {GBCLab} from "../token/GBCLab.sol";

contract Sale is Ownable {
    uint public immutable ITEM_ID;
    uint public immutable START_PUBLIC_SALE;
    uint public immutable START_WHITELIST_SALE;
    uint public immutable MAX;
    uint public immutable MAX_WHITELIST;
    uint public immutable MAX_TX;
    uint public immutable COST;
    uint public immutable WHITELIST_COST;
    IERC721 public immutable GBC;
    GBCLab public immutable ITEMS;

    uint public minted;
    uint public whitelistMinted;

    bool public isCanceled;

    mapping(uint => bool) public isAlreadyUsed;

    constructor(uint _itemId, uint _privateSale ,uint _publicStart, uint _maxSupply, uint _maxWhitelist, uint _maxPerTransaction, uint _whitelistCost, uint _cost, address _gbc, address _items) {
        ITEM_ID = _itemId;
        START_WHITELIST_SALE = _privateSale;
        START_PUBLIC_SALE = _publicStart;
        MAX = _maxSupply;
        MAX_WHITELIST = _maxWhitelist;
        MAX_TX = _maxPerTransaction;
        WHITELIST_COST = _whitelistCost;
        COST = _cost;
        GBC = IERC721(_gbc);
        ITEMS = GBCLab(_items);
    }

    function mintWhitelist(uint[] memory gbcs) external payable {
        require(!isCanceled, "Sale: sale canceled");
        require(START_WHITELIST_SALE <= block.timestamp, "Sale: whitelist sale didn't started");
        require(gbcs.length <= MAX_TX, "Sale: max mint amount reached");
        minted += gbcs.length;
        require(minted <= MAX, "Sale: max reached");
        whitelistMinted += gbcs.length;
        require(whitelistMinted <= MAX_WHITELIST, "Sale: whitelist max reached");
        require(msg.value >= WHITELIST_COST * gbcs.length, "Sale: underpayed");
        for (uint256 i = 0; i < gbcs.length; i++) {
            uint gbc = gbcs[i];
            require(GBC.ownerOf(gbc) == msg.sender, "Sale: not owner");
            require(!isAlreadyUsed[gbc], "Sale: gbc already used");
            isAlreadyUsed[gbc] = true;
        }
        ITEMS.mint(msg.sender, ITEM_ID, gbcs.length);
    }

    function mint(uint amount) external payable {
        require(!isCanceled, "Sale: sale canceled");
        require(START_PUBLIC_SALE <= block.timestamp, "Sale: public sale didn't started");
        require(amount <= MAX_TX, "Sale: max mint amount reached");
        minted += amount;
        require(minted <= MAX, "Sale: max reached");
        require(msg.value >= COST * amount, "Sale: underpayed");
        ITEMS.mint(msg.sender, ITEM_ID, amount);
    }


    function cancel() external onlyOwner {
        isCanceled = true;
    }

}
