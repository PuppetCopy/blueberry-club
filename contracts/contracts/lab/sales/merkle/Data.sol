// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Clone} from "clones-with-immutable-args/Clone.sol";

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

import {GBCLab as Lab} from "../../Lab.sol";

contract MerkleData is Clone {
    function lab() public pure returns (Lab) {
        return Lab(_getArgAddress(0));
    }

    function receiver() public pure returns (address payable) {
        return payable(_getArgAddress(20));
    }

    function token() public pure returns (ERC20) {
        return ERC20(_getArgAddress(40));
    }

    function finish() public pure returns (uint256) {
        return _getArgUint256(60);
    }

    function start() public pure returns (uint256) {
        return _getArgUint256(92);
    }

    function supply() public pure returns (uint256) {
        return _getArgUint256(124);
    }

    function cost() public pure returns (uint256) {
        return _getArgUint256(156);
    }

    function item() public pure returns (uint256) {
        return _getArgUint256(188);
    }

    function root() public pure returns (bytes32) {
        return bytes32(_getArgUint256(220));
    }
}
