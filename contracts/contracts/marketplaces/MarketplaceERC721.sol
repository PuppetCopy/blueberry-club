// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Marketplace} from "./Marketplace.sol";

import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

import {ERC721TokenReceiver, ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";

/// @title Marketplace
/// @author IrvingDev (https://github.com/IrvingDevPro)
/// @notice An easy to use marketplace for any type of tokens with
contract MarketplaceERC721 is Marketplace, ERC721TokenReceiver {
    constructor(address owner, Authority authority_) Auth(owner, authority_) {}

    function _deposit(
        address from,
        address tokenContract,
        uint256[] memory tokenIds,
        uint256[] memory
    ) internal override {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            ERC721(tokenContract).safeTransferFrom(
                from,
                address(this),
                tokenIds[i],
                ""
            );
        }
    }

    function _withdraw(
        address to,
        address tokenContract,
        uint256[] memory tokenIds,
        uint256[] memory
    ) internal override {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            ERC721(tokenContract).safeTransferFrom(
                address(this),
                to,
                tokenIds[i],
                ""
            );
        }
    }
}
