// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DistributionActivity
 * @author IrvingDevPro
 * @notice Track user actions among the GBC contracts
 */
contract DistributionActivity is Ownable {

    error Error_HandlerNotAuthorized();
    error Error_PingBackwards();

    event Ping(address operator, address account, uint256 timestamp);

    mapping(address => bool) public isFlagged;
    mapping(address => uint256) public lastActivityOf;

    bool isWhitelist;

    function ping() external {
        _ping(msg.sender, msg.sender, block.timestamp);
    }

    function ping(address account) external {
        _validateHandler();
        _ping(msg.sender, account, block.timestamp);
    }

    function setAccountFlag(address account, bool _isFlagged) external onlyOwner {
        isFlagged[account] = _isFlagged;
    }

    function setAuthorizationMethode(bool _isWhitelist) external onlyOwner {
        isWhitelist = _isWhitelist;
    }

    function _ping(address operator, address account, uint256 timestamp) internal {
        uint256 lastActivityOf_ = lastActivityOf[account];
        if(timestamp < lastActivityOf_) revert Error_PingBackwards();
        if(lastActivityOf_ != timestamp) {
            lastActivityOf[account] = timestamp;
            emit Ping(operator, account, timestamp);
        }
    }

    function _validateHandler() internal view {
        bool flag = isFlagged[msg.sender];
        if(isWhitelist && !flag) revert Error_HandlerNotAuthorized();
        if(!isWhitelist && flag) revert Error_HandlerNotAuthorized();
    }
}
