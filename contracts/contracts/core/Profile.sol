//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Blueberry Profile Setter
 * @author IrvingDevPro
 * @notice This contract can set or unset an GBC as you profile picture on different GMX projects
 */
contract Profile is Ownable {

    mapping(address => uint) private _mains;
    mapping(address => bool) public isHandler;

    IERC721 private gbc;

    event SetMain(address assigner, uint tokenId);

    constructor(address _gbc) {
        gbc = IERC721(_gbc);
    }

    function chooseMain(uint tokenId) external {
        require(gbc.ownerOf(tokenId) == msg.sender, "Not the owner");
        _mains[msg.sender] = tokenId;

        emit SetMain(msg.sender, tokenId);
    }

    function getMain(address account) external view returns(uint tokenId) {
        tokenId = _mains[account];
        address owner = gbc.ownerOf(tokenId);
        if(isHandler[owner] || owner == account) {
            return tokenId;
        }
        return 0;
    }

    function setHandler(address handler, bool _isHandler) external onlyOwner {
        isHandler[handler] = _isHandler;
    }
}
