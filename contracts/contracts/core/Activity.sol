//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Activity is Ownable {

    event Ping(address indexed sender, address indexed account, uint duration);

    uint internal _activityLimit;

    mapping(address => uint) internal _activities;
    mapping(address => uint) internal _lastActivities;

    constructor(uint _initial_limit) {
        _activityLimit = _initial_limit;
    }

    function activityLimit() external view returns(uint) {
        return _activityLimit;
    }

    function activityOf(address account) external view returns(uint) {
        uint activity_ = _activities[account];
        uint duration_ = _duration((account));

        return activity_ + duration_;
    }

    function ping(address account) external {
        uint duration_ = _duration((account));

        if(duration_ > 0) {
            _activities[account] += duration_;
        }

        _lastActivities[account] = block.timestamp;

        emit Ping(msg.sender, account, duration_);
    }

    function setActivityLimit(uint limit) external onlyOwner {
        _activityLimit = limit;
    }

    function _duration(address account) internal view returns(uint) {
        uint lastActivity_ = _lastActivities[account];
        uint activityLimit_ = _activityLimit;

        if(lastActivity_ == 0) {
            lastActivity_ = block.timestamp;
        }

        uint duration_ = block.timestamp - lastActivity_;

        if(duration_ > activityLimit_) {
            duration_ = activityLimit_;
        }

        return duration_;
    }
}
