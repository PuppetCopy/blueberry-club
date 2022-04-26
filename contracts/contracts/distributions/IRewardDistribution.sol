//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IRewardDistribution {
    function rewardOf(address account) external view returns (uint256);
    function notifyReward(address account, uint256 amount) external;
}
