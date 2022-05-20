// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SalePay} from "./payments/SalePay.sol";

struct PublicState {
    uint120 cost;
    uint64 start;
    uint64 stop;
    uint8 limit;
}

error PublicNotLive();
error PublicEnded();
error TransactionLimit();

abstract contract Public is SalePay {

    PublicState private state;

    constructor(PublicState memory state_) {
        state = state_;
    }

    function isPublicLive() external view returns (bool) {
        PublicState memory state_ = state;
        return state_.start <= block.timestamp && state_.stop > block.timestamp;
    }

    function publicStart() external view returns (uint256) {
        return state.start;
    }

    function publicStop() external view returns (uint256) {
        return state.stop;
    }

    function limitPerTransaction() external view returns (uint256) {
        return state.limit;
    }

    function mint(uint120 amount) external payable {
        PublicState memory state_ = state;
        if (state_.start > block.timestamp) revert PublicNotLive();
        if (state_.stop <= block.timestamp) revert PublicEnded();
        if (amount > state_.limit) revert TransactionLimit();
        _takeMoney(amount);
        _mint(msg.sender, amount);
    }

    function setState(PublicState memory state_) external onlyOwner {
        state = state_;
    }
}
