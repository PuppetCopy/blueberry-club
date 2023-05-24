// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";
import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Distributor is Auth {

    mapping(uint256 => mapping(uint256 => bool)) public isTokenUsed;

    ERC721 public immutable token;

    // ============================================================================================
    // Constructor
    // ============================================================================================

    constructor(Authority authority, ERC721 _token) Auth(address(0), authority) {
        token = _token;
    }

    // ============================================================================================
    // External Functions
    // ============================================================================================

    function claim(uint256 _tokenID, address _receiver) external nonReentrant returns (uint256) {
        return _claim(_tokenID, msg.sender, _receiver);
    }

    function muxClaim(uint256 _tokenID, address _container, address _receiver) external nonReentrant returns (uint256) {
        if (muxContainerOwner[_container] != msg.sender) revert NotContainerOwner();

        return _claim(_tokenID, _container, _receiver);
    }

    // ============================================================================================
    // Owner Functions
    // ============================================================================================

    function distribute(uint256 _newRewards, uint256[] memory _rewardsList, address[] memory _winnersList) external requiresAuth {
        if (_rewardsList.length != _winnersList.length) revert LengthMismatch();

        for (uint256 i = 0; i < usedTokens.length; i++) {
            isTokenUsed[usedTokens[i]] = false;
        }

        for (uint256 i = 0; i < _rewardsList.length; i++) {
            address _winner = _winnersList[i];
            winnersReward[_winner] = _rewardsList[i];

            address _muxContainerOwner = _getMuxContainerOwner(_winner);
            if (_muxContainerOwner != address(0)) {
                muxContainerOwner[_winner] = _muxContainerOwner;
            }
        }

        uint256 _unclaimedRewards = IERC20(WETH).balanceOf(address(this));

        IERC20(WETH).safeTransferFrom(msg.sender, address(this), _newRewards);

        emit Distribute(_unclaimedRewards, _newRewards);
    }

    function setClaimable(bool _claimable) external requiresAuth {
        claimable = _claimable;

        emit SetClaimable(_claimable);
    }

    // ============================================================================================
    // Internal Functions
    // ============================================================================================

    function _claim(uint256 _tokenID, address _winner, address _receiver) internal returns (uint256 _reward) {
        if (!claimable) revert NotClaimable();
        if (token.ownerOf(_tokenID) != msg.sender) revert NotOwnerOfToken();

        _reward = winnersReward[_winner];
        if (_reward == 0) revert NotWinner();

        isTokenUsed[_tokenID] = true;
        usedTokens.push(_tokenID);

        IERC20(WETH).safeTransfer(_receiver, _reward);

        emit Claim(msg.sender, _winner, _receiver, _reward);
    }

    function _getMuxContainerOwner(address _container) internal view returns (address) {
        // TODO
    }
}
