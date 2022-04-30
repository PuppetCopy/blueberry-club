// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {GBCLab} from "../GBCLab.sol";

/**
 * @title SaleExample
 * @author IrvingDevPro
 * @notice Just a simple sale to show how to use the power of GBCLab
 */
contract SaleExample is Ownable {

    address public immutable TREASURY;

    uint public immutable ITEM_ID;
    uint public immutable MAX_SUPPLY;
    uint public immutable MAX_PER_TX;

    uint public immutable PUBLIC_COST;
    uint public immutable PUBLIC_START_DATE;

    uint public immutable WHITELIST_START_DATE;
    uint public immutable WHITELIST_COST;
    uint public immutable WHITELIST_MAX;

    IERC721 public immutable GBC;
    GBCLab public immutable ITEMS;

    uint public minted;
    uint public whitelistMinted;

    bool public isCanceled;

    mapping(uint => bool) public isAlreadyUsed;

    constructor(address _TREASURY, uint _ITEM_ID, uint _MAX_SUPPLY, uint _MAX_PER_TX, uint _PUBLIC_COST, uint _PUBLIC_START_DATE, uint _WHITELIST_START_DATE, uint _WHITELIST_COST, uint _WHITELIST_MAX, address _gbc, address _items) {
        TREASURY = _TREASURY;
        ITEM_ID = _ITEM_ID;
        MAX_SUPPLY = _MAX_SUPPLY;
        MAX_PER_TX = _MAX_PER_TX;

        PUBLIC_COST = _PUBLIC_COST;
        PUBLIC_START_DATE = _PUBLIC_START_DATE;

        WHITELIST_START_DATE = _WHITELIST_START_DATE;
        WHITELIST_COST = _WHITELIST_COST;
        WHITELIST_MAX = _WHITELIST_MAX;

        GBC = IERC721(_gbc);
        ITEMS = GBCLab(_items);
    }

    function mintWhitelist(uint[] memory gbcs) external payable {
        require(!isCanceled, "sale canceled");
        require(WHITELIST_START_DATE <= block.timestamp, "whitelist sale didn't started");
        require(gbcs.length <= MAX_PER_TX, "max mint amount reached");
        minted += gbcs.length;
        require(minted <= MAX_SUPPLY, "max reached");
        whitelistMinted += gbcs.length;
        require(whitelistMinted <= WHITELIST_MAX, "whitelist max reached");
        require(msg.value == WHITELIST_COST * gbcs.length, "ETH amount must match the exact cost");
        for (uint256 i = 0; i < gbcs.length; i++) {
            uint gbc = gbcs[i];
            require(GBC.ownerOf(gbc) == msg.sender, "not owner");
            require(!isAlreadyUsed[gbc], string(abi.encodePacked("gbc ", Strings.toString(gbc), " already used")));
            isAlreadyUsed[gbc] = true;
        }
        ITEMS.mint(msg.sender, ITEM_ID, gbcs.length, "");
    }

    function mint(uint amount) external payable {
        require(!isCanceled, "sale canceled");
        require(PUBLIC_START_DATE <= block.timestamp, "public sale didn't start");
        require(amount <= MAX_PER_TX, "max amount per transaction reached");
        minted += amount;
        require(minted <= MAX_SUPPLY, "max reached");
        require(msg.value == PUBLIC_COST * amount, "ETH amount must match the exact cost");
        ITEMS.mint(msg.sender, ITEM_ID, amount, "");
    }

    function fundTreasury() external onlyOwner {
        payable(TREASURY).transfer(address(this).balance);
    }

    function cancel() external onlyOwner {
        isCanceled = true;
    }

}
