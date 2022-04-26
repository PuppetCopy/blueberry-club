//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {Distributor} from "./Distributor.sol";

import {IRewardDistribution} from "../distributions/IRewardDistribution.sol";

contract Router is Ownable {

    event Ping(address indexed sender, address indexed account, uint256 timestamp);

    error Error_PingBackwards();
    error Error_NotRewardDistributor();
    error Error_SenderNotRewardDistributor();
    error Error_NotTokenOwner();
    error Error_BalanceTooLow();

    IERC721 public gbc;
    Distributor public distributor;

    /// @notice Keep the last action done on contract timestamp
    mapping(address => uint256) public lastActivityOf;
    /// @notice Let set address as distributor
    mapping(address => bool) public isRewardDistributor;
    /// @notice Get amount staked on each distributors
    mapping(address => mapping(address => uint256)) public balanceOf;

    constructor(address _gbc, address _distributor) {
        gbc = IERC721(_gbc);
        distributor = Distributor(_distributor);
    }

    function ping(address account) external {
        _ping(account, block.timestamp);
    }

    function stake(address rewardDistributor, uint256[] calldata idList) external {
        if(!isRewardDistributor[rewardDistributor]) revert Error_NotRewardDistributor();

        distributor.stakeForAccount(_msgSender(), idList);

        balanceOf[_msgSender()][rewardDistributor] += idList.length;
        _ping(_msgSender(), block.timestamp);
    }

    function withdraw(address rewardDistributor, uint256[] calldata idList) external {
        if(!isRewardDistributor[rewardDistributor]) revert Error_NotRewardDistributor();

        uint256 staked = balanceOf[_msgSender()][rewardDistributor];
        if(idList.length > staked) revert Error_BalanceTooLow();

        distributor.withdrawForAccount(_msgSender(), idList);

        balanceOf[_msgSender()][rewardDistributor] = staked - idList.length;
        _ping(_msgSender(), block.timestamp);
    }

    function claim(address rewardDistributor) external {
        if(!isRewardDistributor[rewardDistributor]) revert Error_NotRewardDistributor();

        uint256 earned = distributor.getRewardForAccount(_msgSender(), rewardDistributor, balanceOf[_msgSender()][rewardDistributor]);

        IRewardDistribution(rewardDistributor).notifyReward(_msgSender(), earned);
        _ping(_msgSender(), block.timestamp);
    }

    function exit(address rewardDistributor, uint256[] calldata idList) external {
        if(!isRewardDistributor[rewardDistributor]) revert Error_NotRewardDistributor();

        uint256 staked = balanceOf[_msgSender()][rewardDistributor];
        if(idList.length > staked) revert Error_BalanceTooLow();

       uint256 earned = distributor.exitForAccount(_msgSender(), rewardDistributor, idList);

        IRewardDistribution(rewardDistributor).notifyReward(_msgSender(), earned);
        balanceOf[_msgSender()][rewardDistributor] = staked - idList.length;
        _ping(_msgSender(), block.timestamp);
    }

    function disable(address account, address rewardDistributor, uint256[] calldata idList) external onlyOwner {
        if(!isRewardDistributor[rewardDistributor]) revert Error_NotRewardDistributor();

        uint256 staked = balanceOf[_msgSender()][rewardDistributor];
        if(idList.length > staked) revert Error_BalanceTooLow();

        uint256 earned = distributor.disableForAccount(account, rewardDistributor, idList);
        IRewardDistribution(rewardDistributor).notifyReward(_msgSender(), earned);
    }

    function enable(uint256[] calldata idList) external {
        distributor.enableForAccount(_msgSender(), idList);
        _ping(_msgSender(), block.timestamp);
    }

    function _ping(address account, uint256 timestamp_) internal {
        uint256 lastActivity_ = lastActivityOf[account];

        if(timestamp_ < lastActivity_) revert Error_PingBackwards();
        if(timestamp_ == lastActivity_) return;

        lastActivityOf[account] = timestamp_;
        emit Ping(_msgSender(), account, timestamp_);
    }
}
