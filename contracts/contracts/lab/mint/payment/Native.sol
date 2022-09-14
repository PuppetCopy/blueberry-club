// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Payable} from "./Payable.sol";

error InvalidPaidAmount();

abstract contract Native is Payable {

    function _takeMoney() internal {
        uint256 paid = msg.value;
        RECEIVER.transfer(paid);
        emit Paied(msg.sender, paid);
    }

    function _takeMoney(uint256 amount) internal override {
        if (amount != msg.value) revert InvalidPaidAmount();
        if (amount > 0) {
            RECEIVER.transfer(amount);
            emit Paied(msg.sender, amount);
        }
    }
}