// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Sale, GBCLab, SaleState} from "../Sale.sol";
import {Native} from "../payments/Native.sol";
import {Mintable, MintState} from "../mint/utils/Mintable.sol";
import {Public, MintRule} from "../mint/Public.sol";
import {PrivateMerkle} from "../mint/Merkle.sol";


contract MerkleTpl is Sale, Native, PrivateMerkle {
    constructor(uint256 item_, address _owner, GBCLab lab_, MintState memory _mintState, SaleState memory _mintSale, bytes32 _merkleRoot)
        Sale(item_, lab_, _mintSale, _owner)
        Native(payable(_owner))
        Mintable(_mintState)

        PrivateMerkle(_merkleRoot)
    {}
}
