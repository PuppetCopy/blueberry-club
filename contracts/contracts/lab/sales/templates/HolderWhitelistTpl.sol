// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {Sale, GBCLab, SaleState} from "../Sale.sol";
import {Native} from "../payments/Native.sol";
import {Mintable, MintState} from "../mint/utils/Mintable.sol";
import {Public, MintRule} from "../mint/Public.sol";
import {PrivateHolder, HolderRule } from "../mint/Holder.sol";


contract HolderWhitelistTpl is Sale, Native, PrivateHolder {
    constructor(uint256 item_, address _owner, IERC721 _nft, GBCLab lab_, MintState memory _mintState, HolderRule memory _holderRule, SaleState memory _mintSale, MintRule memory _mintRule)
        Sale(item_, lab_, _mintSale, _owner)
        Native(payable(_owner))
        Mintable(_mintState)

        PrivateHolder(_nft, _holderRule)
    {}
}
