//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title Blueberry Profile Setter
 * @author IrvingDevPro
 * @notice This contract can set or unset an GBC as you profile picture on different GMX projects
 */
contract Profile {
    mapping(address => uint) private _mains;

    IERC721 private gbc;
    
    constructor(address _gbc) {
        gbc = IERC721(_gbc);
    }

    function chooseMain(uint tokenId) external {
        require(gbc.ownerOf(tokenId) == msg.sender, "Not the owner");
        _mains[msg.sender] = tokenId;
    }

    function getMain(address account) external view returns(uint tokenId) {
        tokenId = _mains[account];
        if(gbc.ownerOf(tokenId) == account) {
            return tokenId;
        } else {
            return 0;
        }
    }
}
