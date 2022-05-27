// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Mintable, MintRule} from "../Mintable.sol";

abstract contract Private is Mintable {

    mapping(address => mapping(uint256 => MintRule)) public privateMintable;
    mapping(address => uint256) public rulesAmountOf;

    function privateMintbles(address account, uint256 amount, uint256 start) external view returns(MintRule[] memory result) {
        uint256 length = rulesAmountOf[account];

        if (start < length) {
            length -= start;
        } else {
            return new MintRule[](0);
        }

        if (amount > length) {
            amount = length;
        }

        result = new MintRule[](amount);

        for (uint256 i = start; i < amount; i++) {
            result[i] = privateMintable[account][i];
        }
    }

    function privateMint(uint120 amount, uint256 index) external {
        MintRule memory rule_ = privateMintable[msg.sender][index];
        rule_.amount -= amount;
        privateMintable[msg.sender][index] = rule_;
        _mint(msg.sender, amount, rule_);
    }

    function _addRuleTo(address account, MintRule memory _rule) internal returns(uint256 index) {
        index = rulesAmountOf[account];
        privateMintable[account][index] = _rule;
        rulesAmountOf[account] = index + 1;
    }
}
