// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SalePay} from "./SalePay.sol";

abstract contract SaleNative is SalePay {

    address payable public immutable receiver;

    constructor(address payable receiver_) {
        receiver = receiver_;
    }

    function _takeMoney() internal {
        receiver.transfer(msg.value);
    }

    function _takeMoney(uint256 amount) internal override {
        receiver.transfer(amount);
    }
}
