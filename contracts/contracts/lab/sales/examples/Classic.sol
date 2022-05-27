// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Sale, GBCLab, SaleState} from "../Sale.sol";
import {Native} from "../extensions/payments/Native.sol";
import {Mintable, MintState} from "../extensions/mint/Mintable.sol";
import {Public, MintRule} from "../extensions/mint/Public.sol";
import {PrivateClassic} from "../extensions/mint/Private/Classic.sol";

/**
 * Classic Sale of 5000 items with Public and Private Sale in ETH
 * Global:
 *   - Sale never ends
 *   - 200 items maximum per wallet
 *
 * Public Sale:
 *   - price: 0.02 ethers
 *   - start: 10 days after deployement
 *   - maxium per transaction 10
 *   - maximum mintable in public: 100
 * Private Sale:
 * Private is flexible and each user as his own specifique rules
 * letting owner of the sale decide how to organise the private section
 * everything is possible: free mint, discount mint, admin mint...
 */
contract ClassicSale is Sale, Native, Public, PrivateClassic {
    constructor(uint256 item_, GBCLab lab_)
        Sale(item_, lab_, SaleState(0, 5000, 1), msg.sender)
        Native(payable(msg.sender))
        Mintable(MintState(~uint64(0), 200))
        Public(MintRule(0.02 ether, uint64(block.timestamp + 3600 * 24 * 10), 10, 100))
    {}
}
