//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {Distributor} from "./Distributor.sol";

contract Router is Ownable {

    event Ping(address indexed sender, address indexed account, uint256 timestamp);

    error Error_PingBackwards();
    error Error_SenderNotCollector();
    error Error_AmountOverEarned();

    IERC721 public gbc;
    Distributor public distributor;

    /// @notice Keep the last action done on contract timestamp
    mapping(address => uint256) public lastActivityOf;
    /// @notice Keep track which address can collect user earnings
    mapping(address => bool) public isCollector;

    constructor(address _gbc, address _distributor) {
        gbc = IERC721(_gbc);
        distributor = Distributor(_distributor);
    }

    function ping(address account) external {
        _ping(account, block.timestamp);
    }

    function stake(uint256[] calldata idList) external {
        distributor.stakeForAccount(_msgSender(), _msgSender(), idList);
        _ping(_msgSender(), block.timestamp);
    }

    function withdraw(uint256[] calldata idList) external {
        distributor.withdrawForAccount(_msgSender(), _msgSender(), idList);
        _ping(_msgSender(), block.timestamp);
    }

    function enable(uint256[] calldata idList) external {
        distributor.enableForAccount(_msgSender(), idList);
        _ping(_msgSender(), block.timestamp);
    }

    function claim(address account, uint256 amount) external {
        if(!isCollector[msg.sender]) revert Error_SenderNotCollector();

        uint256 earned = distributor.earned(account);
        if(amount > earned) revert Error_AmountOverEarned();

        distributor.getRewardForAccount(account, msg.sender, earned - amount);
        _ping(account, block.timestamp);
    }

    function claimable(address account) external view returns (uint256) {
        return distributor.earned(account);
    }

    function _ping(address account, uint256 timestamp_) internal {
        uint256 lastActivity_ = lastActivityOf[account];

        if(timestamp_ < lastActivity_) revert Error_PingBackwards();
        if(timestamp_ == lastActivity_) return;

        lastActivityOf[account] = timestamp_;
        emit Ping(_msgSender(), account, timestamp_);
    }
}
