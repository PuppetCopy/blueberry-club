// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {Sale, GBCLab, SaleState} from "../Sale.sol";
import {Native} from "../payments/Native.sol";
import {Mintable, MintState} from "../mint/utils/Mintable.sol";
import {PrivateHolder, HolderState } from "../mint/Holder.sol";

contract HolderWhitelistTpl is Sale, Native, PrivateHolder {
    constructor(uint256 item_, address _owner, address _treasury, IERC721 _nft, GBCLab lab_, SaleState memory _saleState, MintState memory _mintState, HolderState memory _holderState)
        Sale(item_, lab_, _saleState, _owner)
        Native(payable(_owner))
        Mintable(_mintState)

        PrivateHolder(_nft, _holderState)
    {}
}
