// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Mintable} from "../Mintable.sol";

abstract contract Public is Mintable {
    function mint(uint120 amount) external payable override {
        _mint(msg.sender, amount);
    }

    function mintFor(address to, uint120 amount)
        external
        payable
        override
        requiresAuth
    {
        _mint(to, amount);
    }
}
