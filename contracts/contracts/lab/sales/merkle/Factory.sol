// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ClonesWithImmutableArgs} from "clones-with-immutable-args/ClonesWithImmutableArgs.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

import {PublicSale} from "./Sale.sol";

import {Packer} from "../../../lib/Packer.sol";

contract HolderFactory is Auth {
    event CreateSale(PublicSale indexed sale);

    using ClonesWithImmutableArgs for address;

    PublicSale public immutable saleImplementation;

    constructor(PublicSale _saleImplementation, address _owner)
        Auth(_owner, Authority(address(0)))
    {
        saleImplementation = _saleImplementation;
    }

    function deploy(
        address lab,
        uint96 wallet,
        address receiver,
        uint96 transaction,
        address token,
        uint96 finish,
        uint64 start,
        uint96 supply,
        uint96 cost,
        uint256 item,
        bytes32 root,
        address _owner
    ) external requiresAuth returns (PublicSale sale) {
        bytes memory data = abi.encodePacked(
            Packer.pack(lab, wallet),
            Packer.pack(receiver, transaction),
            Packer.pack(token, finish),
            Packer.pack(start, supply, cost),
            item,
            uint256(root)
        );

        sale = PublicSale(address(saleImplementation).clone(data));
        sale.initialize(_owner);

        emit CreateSale(sale);
    }
}
