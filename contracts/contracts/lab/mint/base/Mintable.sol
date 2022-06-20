// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Payable} from "../payment/Payable.sol";

struct MintRule {
    uint120 supply;
    uint208 cost;
    uint192 accountLimit;
    uint64 start;
    uint64 finish;
}

error MintNotStarted();
error MaxSupplyReached();
error MintEnded();
error MaxAmountTxMax();
error MaxWalletReached();
error SaleCanceled();

abstract contract Mintable is Payable {
    mapping(address => uint256) public accountMintCountOf;

    uint208 public totalMinted;

    bool public canceled = false;

    uint208 public immutable COST;
    uint120 public immutable SUPPLY;
    uint192 public immutable ACCOUNT_LIMIT;

    uint64 public immutable START;
    uint64 public immutable FINISH;

    constructor(uint120 _supply,
                uint208 _cost,
                uint192 _accountLimit,
                uint64 _start,
                uint64 _finish,

                uint208 _totalMinted
    ) {
        SUPPLY = _supply;
        COST = _cost;
        ACCOUNT_LIMIT = _accountLimit;
        START = _start;
        FINISH = _finish;

        totalMinted = _totalMinted;
    }

    function _mint(address to, uint120 amount_) internal virtual {
        uint256 _accountMintCount = accountMintCountOf[to] + amount_;

        if (_accountMintCount > ACCOUNT_LIMIT) revert MaxWalletReached();

        if (block.timestamp <= START) revert MintNotStarted();
        if (block.timestamp > FINISH) revert MintEnded();

        totalMinted += amount_;
        if (totalMinted > SUPPLY) revert MaxSupplyReached();

        if (canceled) revert SaleCanceled();

        accountMintCountOf[to] = _accountMintCount;

        _takeMoney(COST * amount_);

        LAB.mint(to, ITEM, amount_, "");
    }

    function cancel() external requiresAuth {
        canceled = true;
    }
}