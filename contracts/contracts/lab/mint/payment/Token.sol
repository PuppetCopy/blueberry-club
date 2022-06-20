// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Payable} from "./Payable.sol";

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

abstract contract Token is Payable {
    using SafeTransferLib for ERC20;

    ERC20 public immutable TOKEN;

    constructor(ERC20 token_) {
        TOKEN = token_;
    }

    function _takeMoney(uint256 amount) internal override {
        TOKEN.safeTransferFrom(msg.sender, RECEIVER, amount);
        emit Paied(msg.sender, amount);
    }
}