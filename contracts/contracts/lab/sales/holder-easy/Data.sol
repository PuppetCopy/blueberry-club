// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Clone} from "clones-with-immutable-args/Clone.sol";

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

import {GBCLab as Lab} from "../../Lab.sol";

contract HolderDataEasy is Clone {
    function lab() public pure returns (Lab) {
        return Lab(_getArgAddress(0));
    }

    function wallet() public pure returns (uint96) {
        return uint96(_getArgUint256(20));
    }

    function receiver() public pure returns (address payable) {
        return payable(_getArgAddress(52));
    }

    function transaction() public pure returns (uint96) {
        return uint96(_getArgUint256(72));
    }

    function token() public pure returns (ERC20) {
        return ERC20(_getArgAddress(104));
    }

    function finish() public pure returns (uint96) {
        return uint96(_getArgUint256(124));
    }

    function checker() public pure returns (ERC721) {
        return ERC721(_getArgAddress(156));
    }

    function start() public pure returns (uint96) {
        return uint96(_getArgUint256(176));
    }

    function supply() public pure returns (uint128) {
        return uint128(_getArgUint256(208));
    }

    function cost() public pure returns (uint128) {
        return uint128(_getArgUint256(240));
    }

    function item() public pure returns (uint256) {
        return _getArgUint256(272);
    }
}
