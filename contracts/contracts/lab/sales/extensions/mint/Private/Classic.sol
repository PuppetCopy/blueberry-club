// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Private, MintRule} from "./Private.sol";

abstract contract Classic is Private {
    function addRuleTo(address to, MintRule memory rule) external onlyOwner {
        _addRuleTo(to, rule);
    }
}
