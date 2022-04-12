//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ERC721StakingPool} from "../core/Distributor.sol";
import {Activity} from "../core/Activity.sol";


contract TradingRewards is Ownable {
    mapping(address => mapping(uint => uint)) internal _staked;
    mapping(address => uint) internal _stakedLength;
    mapping(uint => uint) internal _stakedIndex;

    mapping(address => uint) internal _lastRewardDistributions;
    mapping(address => uint) internal _cumulativeActivity;

    ERC721StakingPool public pool;
    Activity public activity;
    IERC20 public WETH;

    constructor(address _pool, address _activity, address _weth) {
        pool = ERC721StakingPool(_pool);
        activity = Activity(_activity);
        WETH = IERC20(_weth);
    }

    function stake(uint256[] calldata idList) external {
        pool.stakeForAccount(msg.sender, idList);

        for (uint256 i = 0; i < idList.length; i++) {
            _add(msg.sender, idList[i]);
        }

        if(_lastRewardDistributions[msg.sender] == 0) {
            _lastRewardDistributions[msg.sender] = block.timestamp;
            _cumulativeActivity[msg.sender] = activity.activityOf(msg.sender);
        }

        activity.ping(msg.sender);
    }

    function withdraw(uint256[] calldata idList) external {
        pool.withdrawForAccount(msg.sender, idList);

        for (uint256 i = 0; i < idList.length; i++) {
            _remove(msg.sender, idList[i]);
        }

        if(_lastRewardDistributions[msg.sender] == 0) {
            _lastRewardDistributions[msg.sender] = block.timestamp;
            _cumulativeActivity[msg.sender] = activity.activityOf(msg.sender);
        }

        activity.ping(msg.sender);
    }

    function getRewardForAccount(address account) external onlyOwner returns(uint) {
        uint reward = pool.getRewardForAccount(account, address(this), _stakedLength[account]);

        uint totalActivity_ = activity.activityOf(account);
        uint activity_ = totalActivity_ - _cumulativeActivity[account];

        uint earned = 0;

        if(reward > 0) {
            uint duration = block.timestamp - _lastRewardDistributions[account];
            earned = (reward * activity_) / duration;

            uint lost = reward - earned;
            if(lost > 0) {
                uint finish = pool.periodFinish();
                WETH.transfer(address(pool), lost);
                if(block.timestamp >= finish) {
                    pool.notifyRewardAmount(lost, 1);
                } else {
                    uint durationUntilEnd = finish - block.timestamp;
                    pool.notifyRewardAmount(lost, uint64(durationUntilEnd));
                }
            }

        }

        _lastRewardDistributions[account] = block.timestamp;
        _cumulativeActivity[account] = totalActivity_;

        activity.ping(account);

        if(earned > 0) {
            WETH.transfer(msg.sender, earned);
        }

        return earned;
    }

    function stakedOf(address account) external view returns(uint[] memory) {
        uint length = _stakedLength[account];

        uint256[] memory idList = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            idList[i] = _staked[account][i];
        }

        return idList;
    }

    function stakeOfByIndex(address account, uint index) external view returns(uint) {
        return _staked[account][index];
    }

    function stakedIndexOf(uint tokenId) external view returns(uint) {
        return _stakedIndex[tokenId];
    }

    function stakedAmount(address account) external view returns(uint) {
        return _stakedLength[account];
    }

    function _add(address account, uint id) internal {
        uint index = _stakedLength[account];
        _stakedLength[account]++;
        _stakedIndex[id] = index;
        _staked[account][index] = id;
    }

    function _remove(address account, uint id) internal {
        uint lastTokenIndex = _stakedLength[account] - 1;
        _stakedLength[account]--;
        uint256 tokenIndex = _stakedIndex[id];

        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _staked[account][lastTokenIndex];

            _staked[account][tokenIndex] = lastTokenId;
            _stakedIndex[lastTokenId] = tokenIndex;
        }

        delete _stakedIndex[id];
        delete _staked[account][lastTokenIndex];
    }
}
