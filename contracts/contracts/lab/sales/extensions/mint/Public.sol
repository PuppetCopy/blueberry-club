// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Mintable, MintRule} from "./Mintable.sol";

abstract contract Public is Mintable {
    MintRule public publicRule;

    mapping(address => uint120) public publicMintedOf;

    constructor(MintRule memory _rule) {
        publicRule = _rule;
    }

    function publicMintable(address account) public view returns (uint256) {
        MintRule memory rule_ = publicRule;
        unchecked {
            return rule_.amount -= publicMintedOf[account];
        }
    }

    function publicMint(uint120 amount) external payable {
        _publicMintFor(msg.sender, amount);
    }

    function publicMintFor(address to, uint120 amount)
        external
        payable
        requiresAuth
    {
        _publicMintFor(to, amount);
    }

    function _publicMintFor(address to, uint120 amount) internal {
        MintRule memory rule_ = publicRule;
        uint120 minted_ = publicMintedOf[to];
        unchecked {
            rule_.amount -= minted_;
        }

        publicMintedOf[to] = minted_ + amount;

        _mint(to, amount, rule_);
    }

    function setPublicRule(MintRule memory _rule) external requiresAuth {
        publicRule = _rule;
    }
}
