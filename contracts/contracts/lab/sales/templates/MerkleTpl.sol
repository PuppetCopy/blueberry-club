// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {Sale, GBCLab, SaleState} from "../Sale.sol";
import {Native} from "../payments/Native.sol";
import {Mintable, MintState} from "../mint/utils/Mintable.sol";
import {PrivateMerkle} from "../mint/Merkle.sol";


contract MerkleTpl is Sale, Native, PrivateMerkle {
    constructor(uint256 item_, address _owner, address _treasury, GBCLab lab_, SaleState memory _saleState, MintState memory _mintState, bytes32 _merkleRoot)
        Sale(item_, lab_, _saleState, _owner)
        Native(payable(_owner))
        Mintable(_mintState)

        PrivateMerkle(_merkleRoot)
    {}
}
