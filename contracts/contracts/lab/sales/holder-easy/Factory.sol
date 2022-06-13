// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ClonesWithImmutableArgs} from "clones-with-immutable-args/ClonesWithImmutableArgs.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

import {HolderSaleEasy} from "./Sale.sol";

import {Packer} from "../../../lib/Packer.sol";

contract HolderFactoryEasy is Auth {
    event CreateSale(HolderSaleEasy indexed sale);

    using ClonesWithImmutableArgs for address;

    HolderSaleEasy public immutable saleImplementation;

    constructor(HolderSaleEasy _saleImplementation, address _owner)
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
        address checker,
        uint96 start,
        uint128 supply,
        uint128 cost,
        uint256 item,
        address _owner
    ) external requiresAuth returns (HolderSaleEasy sale) {
        bytes memory data = abi.encodePacked(
            lab,
            uint256(wallet),
            receiver,
            uint256(transaction),
            token,
            uint256(finish),
            checker,
            uint256(start),
            uint256(supply),
            uint256(cost),
            item
        );

        sale = HolderSaleEasy(address(saleImplementation).clone(data));
        sale.initialize(_owner);

        emit CreateSale(sale);
    }
}
