// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Sale, SaleState, GBCLab} from "../Sale.sol";
import {Native} from "../payments/Native.sol";
import {Token} from "../payments/Token.sol";
import {Mintable, MintState, MintRule} from "../mint/utils/Mintable.sol";
import {Public} from "../mint/Public.sol";

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

contract SalePublicTest is Sale, Native, Public {
    constructor(
        uint256 item_,
        GBCLab lab_,
        SaleState memory state_,
        address payable owner_,
        uint64 start,
        uint64 end
    )
        Sale(item_, lab_, state_, owner_)
        Native(owner_)
        Mintable(MintState(200, end))
        Public(MintRule(0.02 ether, start, 10, 100))
    {}
}
