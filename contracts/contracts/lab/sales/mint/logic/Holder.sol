// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Mintable} from "../Mintable.sol";

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";
import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ERC1155} from "@rari-capital/solmate/src/tokens/ERC1155.sol";

abstract contract HolderERC721 is Mintable {
    ERC721 public immutable checker;

    constructor(ERC721 checker_) {
        checker = checker_;
    }

    function mint(uint120 amount) external payable override {
        _mint(msg.sender, amount);
    }

    function mintFor(address to, uint120 amount)
        external
        payable
        override
        requiresAuth
    {
        _mint(to, amount);
    }
}
