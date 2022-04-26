//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Wrapper} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Wrapper.sol";

import {Router} from "../core/Router.sol";

import {IRewardDistribution} from "./IRewardDistribution.sol";

/**
 * This contract is an reward distributor example. It receive user
 * rewards and just give it to the user.
 *
 * To use this reward distributor you need to specify this contract
 * ethereum address when you stake your tokens
 */
contract BasicRewardDistribution is IRewardDistribution, Ownable {

    ERC20Wrapper public WETH;

    mapping(address => uint256) public rewardOf;
    mapping(address => bool) public isAllowed;

    constructor(address _weth) {
        WETH = ERC20Wrapper(_weth);
    }

    function notifyReward(address account, uint256 amount) external {
        require(isAllowed[msg.sender], "Sender is not allowed");
        rewardOf[account] += amount;
    }

    function claim() external {
        uint256 earned = rewardOf[_msgSender()];
        WETH.withdrawTo(_msgSender(), earned);
        rewardOf[_msgSender()] = 0;
    }
}
