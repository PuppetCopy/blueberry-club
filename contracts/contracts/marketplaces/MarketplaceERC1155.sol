// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Marketplace} from "./Marketplace.sol";

import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

import {ERC1155, ERC1155TokenReceiver} from "@rari-capital/solmate/src/tokens/ERC1155.sol";

/// @title Marketplace
/// @author IrvingDev (https://github.com/IrvingDevPro)
/// @notice An easy to use marketplace for any type of tokens with
contract MarketplaceERC1155 is Marketplace, ERC1155TokenReceiver {
    constructor(address owner, Authority authority_) Auth(owner, authority_) {}

    function _deposit(
        address from,
        address tokenContract,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal override {
        ERC1155(tokenContract).safeBatchTransferFrom(
            from,
            address(this),
            ids,
            amounts,
            ""
        );
    }

    function _withdraw(
        address to,
        address tokenContract,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal override {
        ERC1155(tokenContract).safeBatchTransferFrom(
            address(this),
            to,
            ids,
            amounts,
            ""
        );
    }
}
