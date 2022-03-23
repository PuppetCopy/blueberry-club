//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {GBCLab as IGBCLab} from "../token/GBCLab.sol";

contract Manager {

    uint public constant BACKGROUND_TYPE = 1;
    uint public constant SPECIAL_TYPE = 8;

    IERC721 public GBC;
    IGBCLab public GBCLab;

    struct Items {
        uint background;
        uint special;
        uint custom;
    }

    mapping(uint => Items) public itemsOf;

    constructor(address _gbc, address _gbcLab) {
        GBC = IERC721(_gbc);
        GBCLab = IGBCLab(_gbcLab);
    }

    function set(uint gbc, uint item) external {
        require(GBC.ownerOf(gbc) == msg.sender, "Manager: not owner of gbc");
        require(GBCLab.balanceOf(msg.sender, item) > 0, "Manager: not owner of item");

        GBCLab.burn(msg.sender, item, 1);

        Items storage items = itemsOf[gbc];
        uint itemType = GBCLab.getItemType(item);

        if(itemType == BACKGROUND_TYPE) {
            if(items.background != 0) GBCLab.mint(msg.sender, items.background, 1);
            items.background = item;
        } else if(itemType == SPECIAL_TYPE) {
            if(items.special != 0) GBCLab.mint(msg.sender, items.special, 1);
            items.special = item;
        } else {
            if(items.custom != 0) GBCLab.mint(msg.sender, items.custom, 1);
            items.custom = item;
        }
    }

    function remove(uint gbc, uint section) external {
        require(GBC.ownerOf(gbc) == msg.sender, "Manager: not owner of gbc");

        Items storage items = itemsOf[gbc];

        if(section == BACKGROUND_TYPE) {
            if(items.background != 0) GBCLab.mint(msg.sender, items.background, 1);
            items.background = 0;
        } else if(section == SPECIAL_TYPE) {
            if(items.special != 0) GBCLab.mint(msg.sender, items.special, 1);
            items.special = 0;
        } else {
            if(items.custom != 0) GBCLab.mint(msg.sender, items.custom, 1);
            items.custom = 0;
        }
    }
}
