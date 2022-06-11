// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Payable} from "../payments/Payable.sol";

struct MintRule {
    uint208 cost;
    uint64 start;
    uint120 transaction;
    uint120 amount;
}

struct MintState {
    uint192 maxMintable;
    uint64 finish;
}

error MintNotStarted();
error AmountOverRule();
error MintEnded();
error MaxAmountTransaction();
error MaxWalletReached();

abstract contract Mintable is Payable {
    MintState private _state;

    mapping(address => uint256) public totalMintedOf;

    constructor(MintState memory state) {
        _state = state;
    }

    function maxPerWallet() public view returns (uint256) {
        return _state.maxMintable;
    }

    function finish() public view returns (uint256) {
        return _state.finish;
    }

    function setFinish(uint64 _finish) external requiresAuth {
        _state.finish = _finish;
    }

    function setMaxPerWallet(uint192 _maxMintable) external requiresAuth {
        _state.maxMintable = _maxMintable;
    }

    function _mint(
        address to,
        uint120 amount,
        MintRule memory rule
    ) internal {
        MintState memory state_ = _state;
        uint256 totalMinted_ = totalMintedOf[msg.sender] + amount;

        if (state_.finish < block.timestamp) revert MintEnded();
        if (rule.start > block.timestamp) revert MintNotStarted();
        if (rule.amount < amount) revert AmountOverRule();
        if (rule.transaction < amount) revert MaxAmountTransaction();
        if (state_.maxMintable < totalMinted_) revert MaxWalletReached();

        totalMintedOf[to] = totalMinted_;

        _takeMoney(rule.cost * amount);

        _mint(to, amount);
    }
}
