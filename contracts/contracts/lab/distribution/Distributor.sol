// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Auth, Authority} from "@solmate/auth/Auth.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {IGLPAdapter, AccountState} from "src/interfaces/IGLPAdapter.sol";

contract PrizePoolDistributor is ReentrancyGuard, Auth {

    using SafeERC20 for IERC20;

    bool public claimable;

    address private constant WETH = address(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);

    uint256[] public usedTokens;

    mapping(address => address) public muxContainerOwner; // container => owner
    mapping(uint256 => bool) public isTokenUsed; // tokenID => isUsed
    mapping(address => uint256) public winnersReward; // winner => reward

    IERC721 public immutable token;

    // ============================================================================================
    // Constructor
    // ============================================================================================

    constructor(Authority _authority, IERC721 _token, address _owner) Auth(_owner, _authority) {
        token = _token;
    }

    function getMuxContainerOwner(address _container) public view returns (address) {
        if (isContract(_container)) {
            return IGLPAdapter(_container).muxAccountState().account;
        } else {
            return address(0);
        }
    }

    function isContract(address _addr) private view returns (bool){
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
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

        uint256[] memory _usedTokens = usedTokens;
        for (uint256 i = 0; i < _usedTokens.length; i++) {
            isTokenUsed[_usedTokens[i]] = false;
        }

        delete usedTokens;

        for (uint256 i = 0; i < _rewardsList.length; i++) {
            address _winner = _winnersList[i];
            winnersReward[_winner] = _rewardsList[i];

            address _muxContainerOwner = getMuxContainerOwner(_winner);
            if (_muxContainerOwner != address(0)) {
                muxContainerOwner[_winner] = _muxContainerOwner;
            }
        }

        uint256 _unclaimedRewards = IERC20(WETH).balanceOf(address(this));

        emit Distribute(_unclaimedRewards, _newRewards);

        IERC20(WETH).safeTransferFrom(msg.sender, address(this), _newRewards);
    }

    function setClaimable(bool _claimable) external requiresAuth {
        claimable = _claimable;

        emit SetClaimable(_claimable);
    }

    // ============================================================================================
    // Internal Function
    // ============================================================================================

    function _claim(uint256 _tokenID, address _winner, address _receiver) internal returns (uint256 _reward) {
        if (!claimable) revert NotClaimable();
        if (token.ownerOf(_tokenID) != msg.sender) revert NotOwnerOfToken();

        _reward = winnersReward[_winner];
        if (_reward == 0) revert NotWinner();

        isTokenUsed[_tokenID] = true;
        usedTokens.push(_tokenID);

        emit Claim(msg.sender, _winner, _receiver, _reward);

        IERC20(WETH).safeTransfer(_receiver, _reward);
    }

    // ============================================================================================
    // Events
    // ============================================================================================

    event Claim(address indexed sender, address indexed winner, address indexed receiver, uint256 reward);
    event Distribute(uint256 unclaimedRewards, uint256 newRewards);
    event SetClaimable(bool claimable);

    // ============================================================================================
    // Errors
    // ============================================================================================

    error NotClaimable();
    error NotContainerOwner();
    error NotOwnerOfToken();
    error NotWinner();
    error LengthMismatch();
}
