// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Mintable, MintRule} from "./Mintable.sol";

abstract contract Public is Mintable {

    MintRule public publicRule;

    mapping(address => uint120) public publicMinted;

    constructor(MintRule memory _rule) {
        publicRule = _rule;
    }

    function publicMintable(address account) public view returns(MintRule memory) {
        MintRule memory rule_ = publicRule;
        unchecked {
            rule_.amount -= publicMinted[account];
        }
        return rule_;
    }

    function publicMint(uint120 amount) external {
        MintRule memory rule_ = publicRule;
        uint120 minted_ = publicMinted[msg.sender];
        unchecked {
            rule_.amount -= minted_;
        }
        publicMinted[msg.sender] = minted_ + amount;
        _mint(msg.sender, amount, rule_);
    }

    function setPublicRule(MintRule memory _rule) external onlyOwner {
        publicRule = _rule;
    }
}
