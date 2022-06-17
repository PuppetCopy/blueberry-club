// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Clone} from "clones-with-immutable-args/Clone.sol";

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

import {GBCLab as Lab} from "../../Lab.sol";

contract PublicData is Clone {
    function lab() public pure returns (Lab) {
        return Lab(_getArgAddress(0));
    }

    function wallet() public pure returns (uint256) {
        return _getArgUint256(20);
    }

    function receiver() public pure returns (address payable) {
        return payable(_getArgAddress(52));
    }

    function transaction() public pure returns (uint256) {
        return _getArgUint256(72);
    }

    function token() public pure returns (ERC20) {
        return ERC20(_getArgAddress(104));
    }

    function finish() public pure returns (uint256) {
        return _getArgUint256(124);
    }

    function start() public pure returns (uint256) {
        return _getArgUint256(156);
    }

    function supply() public pure returns (uint256) {
        return _getArgUint256(188);
    }

    function cost() public pure returns (uint256) {
        return _getArgUint256(220);
    }

    function item() public pure returns (uint256) {
        return _getArgUint256(252);
    }
}
