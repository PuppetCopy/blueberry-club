// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";

import {GBCLab} from "../../Lab.sol";

import {Sale, SaleState} from "../Sale.sol";
import {Payable, Native} from "../payments/Native.sol";
import {Mintable, MintState} from "../mint/Mintable.sol";
import {Public} from "../mint/logic/Public.sol";

contract PublicSale is Sale, Native, Mintable, Public {
    constructor(
        uint256 item_,
        GBCLab lab_,
        SaleState memory state_,
        address _owner,
        address payable receiver_,
        MintState memory state,
        uint256 cost_
    )
        Sale(item_, lab_, state_, _owner)
        Payable(receiver_)
        Mintable(state, cost_)
    {}

    function _mint(address to, uint120 amount)
        internal
        override(Sale, Mintable)
    {
        super._mint(to, amount);
    }
}
