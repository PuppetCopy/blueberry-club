//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import { IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {GBCLab} from "./GBCLab.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

error NotOwner();

/**
 * @title Closet
 * @author IrvingDevPro
 * @notice Permit GBC holders add and remove items from lab to their GBC
 */
contract Closet is Auth {
    uint public constant BACKGROUND_ATTRIBUTE = 1;
    uint public constant SPECIAL_ATTRIBUTE = 8;

    IERC721 public GBC;
    GBCLab public LAB;

    struct Items {
        uint background;
        uint special;
        uint custom;
    }

    mapping(uint => Items) public itemsOf;
    mapping(uint256 => uint256) public getAttributeOf;

    event SetItems(
        address assigner,
        uint tokenId,
        uint custom,
        uint background,
        uint special
    );

    constructor(IERC721 _gbc, GBCLab _lab, address _owner, Authority _authority) Auth(_owner, _authority) {
        GBC = _gbc;
        LAB = _lab;
    }

    function set(uint gbc, uint[] memory _items, bool[] memory _removes) external {
        if (GBC.ownerOf(gbc) == msg.sender) revert NotOwner();
        Items storage items = itemsOf[gbc];
        for (uint256 i = 0; i < _items.length; i++) {
            uint item = _items[i];
            bool remove = _removes[i];
            if(!remove) {
                LAB.burn(msg.sender, item, 1);
            }

            uint itemType = getAttributeOf[item];

            if(itemType == BACKGROUND_ATTRIBUTE) {
                if(items.background != 0) LAB.mint(msg.sender, items.background, 1, "");
                items.background = remove ? 0 : item;
            } else if(itemType == SPECIAL_ATTRIBUTE) {
                if(items.special != 0) LAB.mint(msg.sender, items.special, 1, "");
                items.special = remove ? 0 : item;
            } else {
                if(items.custom != 0) LAB.mint(msg.sender, items.custom, 1, "");
                items.custom = remove ? 0 : item;
            }
        }

        emit SetItems(msg.sender, gbc, items.custom, items.background, items.special);
    }

    function setItemType(uint id, uint attribute) external requiresAuth {
        getAttributeOf[id] = attribute;
    }

}
