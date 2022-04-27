//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {GBCLab as IGBCLab} from "./GBCLab.sol";

contract Closet {

    uint public constant BACKGROUND_ATTRIBUTE = 1;
    uint public constant SPECIAL_ATTRIBUTE = 8;

    IERC721 public GBC;
    IGBCLab public GBCLab;

    struct Items {
        uint background;
        uint special;
        uint custom;
    }

    mapping(uint => Items) public itemsOf;

    event SetItems(
        address assigner,
        uint tokenId,
        uint custom,
        uint background,
        uint special
    );

    constructor(address _gbc, address _gbcLab) {
        GBC = IERC721(_gbc);
        GBCLab = IGBCLab(_gbcLab);
    }

    function set(uint gbc, uint[] memory _items, bool[] memory _removes) external {
        require(GBC.ownerOf(gbc) == msg.sender, "Manager: not owner of gbc");
        Items storage items = itemsOf[gbc];
        for (uint256 i = 0; i < _items.length; i++) {
            uint item = _items[i];
            bool remove = _removes[i];
            if(!remove) {
                require(GBCLab.balanceOf(msg.sender, item) > 0, "Manager: Account doesn't own the item");
                GBCLab.burn(msg.sender, item, 1);
            }

            uint itemType = GBCLab.getAttributeOf(item);

            if(itemType == BACKGROUND_ATTRIBUTE) {
                if(items.background != 0) GBCLab.mint(msg.sender, items.background, 1);
                items.background = remove ? 0 : item;
            } else if(itemType == SPECIAL_ATTRIBUTE) {
                if(items.special != 0) GBCLab.mint(msg.sender, items.special, 1);
                items.special = remove ? 0 : item;
            } else {
                if(items.custom != 0) GBCLab.mint(msg.sender, items.custom, 1);
                items.custom = remove ? 0 : item;
            }
        }

        emit SetItems(msg.sender, gbc, items.custom, items.background, items.special);
    }
}
