// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Mintable} from "../Mintable.sol";

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";

abstract contract Holder is Mintable {
    ERC721 public immutable checker;

    mapping(uint256 => bool) public isTokenUsed;

    constructor(ERC721 checker_) {
        checker = checker_;
    }

    function mint(uint120 amount, uint256[] memory tokens) external payable {
        _mint(msg.sender, amount, tokens);
    }

    function mintFor(
        address to,
        uint120 amount,
        uint256[] memory tokens
    ) external payable requiresAuth {
        _mint(to, amount, tokens);
    }

    function _mint(
        address to,
        uint120 amount,
        uint256[] memory tokens
    ) internal {
        uint256 amount_ = tokens.length;

        require(amount_ == amount, "INVALID_TOKENS");

        for (uint256 i = 0; i < amount_; ) {
            uint256 token = tokens[i];
            require(checker.ownerOf(token) == to, "NOT_OWNER");
            require(!isTokenUsed[token], "TOKEN_USED");
            isTokenUsed[token] = true;

            unchecked {
                i++;
            }
        }

        _mint(to, amount);
    }
}
