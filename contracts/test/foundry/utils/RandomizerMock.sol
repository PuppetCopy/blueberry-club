// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "contracts/lab/mint/template/Lottery.sol";

contract RandomizerMock {

    function request(uint256 _id) public returns (uint256) {

        bytes32 _value = bytes32(_id);
        Lottery(payable(msg.sender)).randomizerCallback(_id, _value);

        return _id;
    }
}