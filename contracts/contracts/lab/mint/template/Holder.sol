// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Native} from "./../payment/Native.sol";
import {Payable} from "./../payment/Payable.sol";
import {Mintable, MintRule} from "./../base/Mintable.sol";
import {GBCLab} from "../../../token/GBCL.sol";

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";



error TooManyTokens();
error NftMaxMintable();
error NftAlreadyUsed();
error NotOwner();

contract Holder is Payable, Native, Mintable {
    IERC721 public immutable NFT;

    mapping(uint256 => bool) public isNftUsed;
    mapping(address => uint256) public nftMinted;

    uint256 public totalNftMinted;

    constructor(uint256 item_,
                uint208 totalMinted,
                address _owner,
                GBCLab lab_,
                MintRule memory _rule,
                IERC721 _nft)
        Payable(payable(_owner), item_, lab_, _owner)
        Mintable(
            _rule.supply,
            _rule.cost,
            _rule.accountLimit,
            _rule.start,
            _rule.finish,
            totalMinted
        )
    {
        NFT = _nft;
    }



    function mint(uint256[] calldata idList) external payable {
        _mintFor(msg.sender, idList);
    }

    function mintFor(address to, uint256[] calldata idList) external payable requiresAuth {
        _mintFor(to, idList);
    }


    function _mintFor(address to, uint256[] calldata idList) internal {
        if (idList.length > type(uint120).max) revert TooManyTokens();

        uint120 amount = uint120(idList.length);

        for (uint256 i = 0; i < amount; ) {
            if (NFT.ownerOf(idList[i]) != to) revert NotOwner();
            if (isNftUsed[idList[i]]) revert NftAlreadyUsed();

            isNftUsed[idList[i]] = true;

            unchecked {
                i++;
            }
        }

        _mint(to, amount);
    }


}
