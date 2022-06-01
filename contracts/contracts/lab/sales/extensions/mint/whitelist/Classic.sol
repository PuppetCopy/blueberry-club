// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Private, MintRule} from "./Private.sol";

abstract contract PrivateClassic is Private {
    function classicMintFor(
        address to,
        uint120 amount,
        MintRule memory rule
    ) external payable requiresAuth {
        _mint(to, amount, rule);
        rule.amount -= amount;
        _addRuleTo(to, rule);
    }
}
