// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Sale} from "../Sale.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

abstract contract Payable is Sale {
    event Rescue(address indexed token, address indexed to, uint256 amount);

    address payable public immutable receiver;

    function _takeMoney(uint256 amount) internal virtual;

    constructor(address payable receiver_) {
        receiver = receiver_;
    }

    function rescueTokens(
        ERC20 token,
        address to,
        uint256 amount
    ) external requiresAuth {
        token.transfer(to, amount);
        emit Rescue(address(token), to, amount);
    }

    function rescueTokens(address payable to, uint256 amount)
        external
        requiresAuth
    {
        to.transfer(amount);
        emit Rescue(address(0), to, amount);
    }
}
