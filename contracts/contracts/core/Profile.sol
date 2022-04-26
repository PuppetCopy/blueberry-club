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
    mapping(address => string) private _usernames;
    mapping(address => bool) public isHandler;

    IERC721 private gbc;

    event SetMain(address indexed assigner, uint tokenId);
    event SetUsername(address indexed assigner, string username);

    constructor(address _gbc) {
        gbc = IERC721(_gbc);
    }

    function chooseMain(uint tokenId) external {
        require(gbc.ownerOf(tokenId) == _msgSender(), "Not the owner");
        _mains[_msgSender()] = tokenId;

        emit SetMain(_msgSender(), tokenId);
    }

    function chooseUsername(string memory username) external {
        _usernames[_msgSender()] = username;
        emit SetUsername(_msgSender(), username);
    }

    function getDataOf(address account) external view returns(uint tokenId, string memory username) {
        tokenId = _mains[account];
        address owner = gbc.ownerOf(tokenId);
        username = _usernames[account];
        if(!isHandler[owner] && owner != account) {
            tokenId = 0;
        }
    }

    function setHandler(address handler, bool _isHandler) external onlyOwner {
        isHandler[handler] = _isHandler;
    }
}
