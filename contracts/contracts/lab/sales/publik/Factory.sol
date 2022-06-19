// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ClonesWithImmutableArgs} from "clones-with-immutable-args/ClonesWithImmutableArgs.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

import {PublicSale} from "./Sale.sol";
import {GBCLab} from "../../Lab.sol";

import {Packer} from "../../../lib/Packer.sol";

contract PublicFactory is Auth {
    event CreateSale(PublicSale indexed sale);

    using ClonesWithImmutableArgs for address;

    PublicSale public immutable saleImplementation;
    GBCLab public immutable LAB;

    constructor(PublicSale _saleImplementation, address _owner, GBCLab _lab)
        Auth(_owner, Authority(address(0)))
    {
        saleImplementation = _saleImplementation;
        LAB = _lab;
    }

    function deploy(
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
            LAB,
            _owner,
            _owner,
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
