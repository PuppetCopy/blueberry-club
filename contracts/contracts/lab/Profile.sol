//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

error NotOwner();
error InvalidUsername();

/**
 * @title Profile
 * @author IrvingDevPro
 * @notice This contract can set or unset an GBC as you profile picture on GBC Lab
 */
contract Profile is Auth {
    /// @notice Store the GBC owned and wanted by user
    mapping(address => uint) public mainOf;
    /// @notice Store the username picked by the user
    mapping(address => string) public usernameOf;
    /// @notice Store the username already used
    mapping(string => bool) public isUsernameUsed;
    /// @notice Retrieve the contract which can own the GBC
    mapping(address => bool) public isHandler;

    IERC721 immutable private GBC;

    event SetMain(address indexed assigner, uint tokenId);
    event SetUsername(address indexed assigner, string username);

    constructor(IERC721 _gbc, address _owner, Authority _authority) Auth(_owner, _authority) {
        GBC = _gbc;
    }

    function chooseMain(uint tokenId) external {
        if (GBC.ownerOf(tokenId) != msg.sender) revert NotOwner();

        mainOf[msg.sender] = tokenId;
        emit SetMain(msg.sender, tokenId);
    }

    function chooseUsername(string memory newUsername) external {
        uint length = bytes(newUsername).length;
        if (length < 1 || length > 8 || isUsernameUsed[newUsername]) revert InvalidUsername();

        isUsernameUsed[usernameOf[msg.sender]] = false;
        isUsernameUsed[newUsername] = true;
        usernameOf[msg.sender] = newUsername;
        emit SetUsername(msg.sender, newUsername);
    }

    function chooseMainAndUsername(uint tokenId, string memory newUsername) external {
        this.chooseMain(tokenId);
        this.chooseUsername(newUsername);
    }

    function getDataOf(address account) external view returns(uint tokenId, string memory username) {
        tokenId = mainOf[account];
        address owner = GBC.ownerOf(tokenId);
        if(!isHandler[owner] && owner != account) revert NotOwner();

        username = usernameOf[account];
    }

    function setHandler(address handler, bool _isHandler) external requiresAuth {
        isHandler[handler] = _isHandler;
    }
}
