// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Sale, GBCLab, SaleState} from "../Sale.sol";
import {Native} from "../payments/Native.sol";
import {Mintable, MintState} from "../mint/utils/Mintable.sol";
import {Public, MintRule} from "../mint/Public.sol";
import {PrivateClassic} from "../mint/Classic.sol";

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
contract PublicTpl is Sale, Native, Public, PrivateClassic {
    constructor(uint256 item_, address _owner, address _treasury, GBCLab lab_, SaleState memory _saleState, MintState memory _mintState, MintRule memory _mintRule)
        Sale(item_, lab_, _saleState, _owner)
        Native(payable(_treasury))
        Mintable(_mintState)

        Public(_mintRule)
    {}
}

