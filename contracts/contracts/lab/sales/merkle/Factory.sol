// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ClonesWithImmutableArgs} from "clones-with-immutable-args/ClonesWithImmutableArgs.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

import {MerkleSale} from "./Sale.sol";

import {Packer} from "../../../lib/Packer.sol";

contract MerkleFactory is Auth {
    event CreateSale(MerkleSale indexed sale);

    using ClonesWithImmutableArgs for address;

    MerkleSale public immutable saleImplementation;

    constructor(MerkleSale _saleImplementation, address _owner)
        Auth(_owner, Authority(address(0)))
    {
        saleImplementation = _saleImplementation;
    }

    function deploy(
        address lab,
        address receiver,
        address token,
        uint256 finish,
        uint256 start,
        uint256 supply,
        uint256 cost,
        uint256 item,
        bytes32 root,
        address _owner
    ) external requiresAuth returns (MerkleSale sale) {
        bytes memory data = abi.encodePacked(
            lab,
            receiver,
            token,
            finish,
            start,
            supply,
            cost,
            item,
            root
        );

        sale = MerkleSale(address(saleImplementation).clone(data));
        sale.initialize(_owner);

        emit CreateSale(sale);
    }
}
