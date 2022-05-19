// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {GBCLab} from "../GBCLab.sol";
import {SaleBasic} from "./SaleBasic.sol";

/**
 * @title SaleExample
 * @author IrvingDevPro
 * @notice Just a simple sale to show how to use the power of GBCLab
 */
contract GbcWhitelist is SaleBasic {

    uint public immutable WHITELIST_START_DATE;
    uint public immutable WHITELIST_COST;
    uint public immutable WHITELIST_MAX;

    IERC721 public immutable GBC;

    uint public whitelistMinted;

    mapping(uint => bool) public isAlreadyUsed;

    constructor(address _gbc, address _lab, address _owner, uint _ITEM_ID, uint _COST, uint _MAX_SUPPLY, uint _MAX_PER_TX, uint _PUBLIC_START_DATE, uint _WHITELIST_START_DATE, uint _WHITELIST_COST, uint _WHITELIST_MAX) SaleBasic(_lab, _owner, _ITEM_ID, _COST, _MAX_SUPPLY, _MAX_PER_TX, _PUBLIC_START_DATE) {
        WHITELIST_START_DATE = _WHITELIST_START_DATE;
        WHITELIST_COST = _WHITELIST_COST;
        WHITELIST_MAX = _WHITELIST_MAX;

        GBC = IERC721(_gbc);
    }

    function mintWhitelist(uint[] memory gbcs) external payable {
        if (WHITELIST_START_DATE >= block.timestamp) revert Error_WhitelistNotLive();
        
        whitelistMinted += gbcs.length;

        if (whitelistMinted >= WHITELIST_MAX) revert Error_WhitelistMaxReached();
        if (msg.value != WHITELIST_COST * gbcs.length) revert Error_MismatchCost();

        for (uint256 i = 0; i < gbcs.length; i++) {
            uint gbc = gbcs[i];
            if (GBC.ownerOf(gbc) != msg.sender) revert Error_NotOwned();
            if (isAlreadyUsed[gbc]) revert Error_UsedGBC();

            isAlreadyUsed[gbc] = true;
        }
        _mint(gbcs.length);
    }


}

error Error_WhitelistNotLive(); // Whitelist has not started yet
error Error_WhitelistMaxReached(); // max mint amount reached
error Error_Whitelist(); // max mint amount reached
error Error_NotOwned(); // not owner
error Error_UsedGBC(); // already 
error Error_MismatchCost(); // ETH amount must match the exact cost

