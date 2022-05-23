// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Sale, GBCLab, SaleState} from "../Sale.sol";
import {SaleNative} from "../extensions/payments/SaleNative.sol";
import {Public, PublicState} from "../extensions/Public.sol";

contract Classic is Sale, SaleNative, Public {
    constructor(uint256 item_, GBCLab lab_, SaleState memory state_, address payable owner_)
        Sale(item_, lab_, state_, owner_)
        SaleNative(owner_)
        Public(PublicState(0.02 ether, uint64(block.timestamp + 3600 * 24 * 10), uint64(block.timestamp + 3600 * 24 * 20), 10))
    {}
}
