// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

contract FakeToken is ERC20 {
    constructor() ERC20("Fake Token", "FT", 18) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}