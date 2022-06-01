// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Payable} from "./Payable.sol";

error InvalidPaidAmount();

abstract contract Native is Payable {
    address payable public immutable receiver;

    constructor(address payable receiver_) {
        receiver = receiver_;
    }

    function _takeMoney() internal {
        uint256 paid = msg.value;
        receiver.transfer(paid);
        emit Paied(msg.sender, paid);
    }

    function _takeMoney(uint256 amount) internal override {
        if (amount != msg.value) revert InvalidPaidAmount();
        receiver.transfer(amount);
        emit Paied(msg.sender, amount);
    }
}
