// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ClonesWithImmutableArgs} from "clones-with-immutable-args/ClonesWithImmutableArgs.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

import {PublicSale} from "./Sale.sol";

import {Packer} from "../../../lib/Packer.sol";

contract PublicFactory is Auth {
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
        uint256 wallet,
        address receiver,
        uint256 transaction,
        address token,
        uint256 finish,
        uint256 start,
        uint256 supply,
        uint256 cost,
        uint256 item,
        address _owner
    ) external requiresAuth returns (PublicSale sale) {
        bytes memory data = abi.encodePacked(
            lab,
            wallet,
            receiver,
            transaction,
            token,
            finish,
            start,
            supply,
            cost,
            item
        );

        sale = PublicSale(address(saleImplementation).clone(data));
        sale.initialize(_owner);

        emit CreateSale(sale);
    }
}
