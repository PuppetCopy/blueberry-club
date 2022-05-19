// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {GBCLab} from "../GBCLab.sol";
import {Closet} from "../Closet.sol";
import {Owned} from "@rari-capital/solmate/src/auth/Owned.sol";

/**
 * @title SaleExample
 * @author IrvingDevPro
 * @notice Just a simple sale to show how to use the power of GBCLab
 */
contract Sale is Owned {

    uint public immutable ITEM_ID;
    uint public immutable COST;
    uint public immutable MAX_SUPPLY;
    uint public immutable MAX_PER_TX;

    uint public immutable START_DATE;

    GBCLab public immutable LAB;

    uint public minted;
    bool public isCanceled;

    constructor(address _lab, address _owner, uint _ITEM_ID, uint _COST, uint _MAX_SUPPLY, uint _MAX_PER_TX, uint _START_DATE) Owned(_owner) {
        ITEM_ID = _ITEM_ID;
        COST = _COST;
        MAX_SUPPLY = _MAX_SUPPLY;
        MAX_PER_TX = _MAX_PER_TX;

        START_DATE = _START_DATE;

        LAB = GBCLab(_lab);
    }

    function _mint(uint amount) internal {
        if (isCanceled) revert Error_Canceled();
        if (amount >= MAX_PER_TX) revert Error_MintAmountPerTx();

        minted += amount;
        if (minted >= MAX_SUPPLY) revert Error_MaxSupply();

        LAB.mint(msg.sender, ITEM_ID, amount, "0x00");
    }


   function publicMint(uint amount) external payable {
        if (START_DATE >= block.timestamp) revert Error_NotLive();
        if (msg.value != COST * amount) revert Error_MismatchCost();

        _mint(amount);
    }
    

    function fundTreasury() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    function cancel() external onlyOwner {
        isCanceled = true;
    }
}

error Error_Canceled(); // max amount per transaction reached
error Error_MintAmountPerTx(); // max amount per transaction reached
error Error_MismatchCost(); // ETH amount must match the exact cost
error Error_NotLive(); // ETH amount must match the exact cost
error Error_MaxSupply(); // ETH amount must match the exact cost
