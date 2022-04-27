//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Profile
 * @author IrvingDevPro
 * @notice This contract can set or unset an GBC as you profile picture on GBC Lab
 */
contract Profile is Ownable {
    /// @notice Store the GBC owned and wanted by user
    mapping(address => uint) private _mains;
    /// @notice Store the username picked by the user
    mapping(address => string) private _usernames;
    /// @notice Store the username already used
    mapping(string => bool)private isUsernameUsed;
    /// @notice Retrieve the contract which can own the GBC
    mapping(address => bool) public isHandler;

    IERC721 private gbc;

    event SetMain(address indexed assigner, uint tokenId);
    event SetUsername(address indexed assigner, string username);

    constructor(address _gbc) {
        gbc = IERC721(_gbc);
    }

    function chooseMain(uint tokenId) external {
        require(gbc.ownerOf(tokenId) == msg.sender, "Profile: not the owner");

        _mains[msg.sender] = tokenId;
        emit SetMain(msg.sender, tokenId);
    }

    function chooseUsername(string memory newUsername) external {
        require(bytes(newUsername).length >= 4 && bytes(newUsername).length <= 15, "Profile: username invalid length");
        require(!isUsernameUsed[newUsername], "Profile: username already used");

        string memory oldUsername = _usernames[msg.sender];
        isUsernameUsed[oldUsername] = false;
        isUsernameUsed[newUsername] = true;
        _usernames[msg.sender] = newUsername;
        emit SetUsername(msg.sender, newUsername);
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
