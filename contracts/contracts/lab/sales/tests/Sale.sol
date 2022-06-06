// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Sale, SaleState, GBCLab} from "../Sale.sol";

contract SaleTest is Sale {
    constructor(
        uint256 item_,
        GBCLab lab_,
        SaleState memory state_,
        address owner_
    ) Sale(item_, lab_, state_, owner_) {}

    function mint(address to, uint120 amount) external {
        _mint(to, amount);
    }
}
