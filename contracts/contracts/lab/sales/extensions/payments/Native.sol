// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Payable} from "./Payable.sol";

error TakedDifferentTransfer();

abstract contract Native is Payable {

    address payable public immutable receiver;

    constructor(address payable receiver_) {
        receiver = receiver_;
    }

    function _takeMoney() internal {
        receiver.transfer(msg.value);
        emit Paied(msg.sender, msg.value);
    }

    function _takeMoney(uint256 amount) internal override {
        if (amount != msg.value) revert TakedDifferentTransfer();
        _takeMoney();
    }
}
