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
abstract contract Sale is Ownable {

    address public immutable TREASURY;

    uint public immutable ITEM_ID;
    uint public immutable MAX_SUPPLY;
    uint public immutable MAX_PER_TX;

    uint public immutable START_DATE;

    GBCLab public immutable ITEMS;

    uint public minted;

    bool public isCanceled;

    constructor(address _items, address _TREASURY, uint _ITEM_ID, uint _MAX_SUPPLY, uint _MAX_PER_TX, uint _START_DATE) {
        TREASURY = _TREASURY;
        ITEM_ID = _ITEM_ID;
        MAX_SUPPLY = _MAX_SUPPLY;
        MAX_PER_TX = _MAX_PER_TX;

        START_DATE = _START_DATE;

        ITEMS = GBCLab(_items);
    }

    function _mint(uint amount) internal {
        require(!isCanceled, "sale canceled");
        require(START_DATE <= block.timestamp, "public sale didn't start");
        require(amount <= MAX_PER_TX, "max amount per transaction reached");
        minted += amount;
        require(minted <= MAX_SUPPLY, "max reached");
        ITEMS.mint(msg.sender, ITEM_ID, amount, "");
    }

    function fundTreasury() external onlyOwner {
        payable(TREASURY).transfer(address(this).balance);
    }

    function cancel() external onlyOwner {
        isCanceled = true;
    }
}
