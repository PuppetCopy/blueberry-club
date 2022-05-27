// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Private, MintRule} from "./Private.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

struct HolderState {
    uint128 totalMintable;
    uint128 walletMintable;

    uint208 cost;
    uint64 start;
    uint120 transaction;
    uint120 amount;
}

error TooManyTokens();
error NftMaxMintable();
error NftAlreadyUsed();

abstract contract Holder is Private {

    IERC721 public immutable NFT;

    HolderState private _state;

    mapping(uint256 => bool) public isNftUsed;
    mapping(address => uint256) public nftMinted;

    uint256 public totalNftMinted;

    constructor(IERC721 _nft, HolderState memory state) {
        NFT = _nft;
        _state = state;
    }

    function nftMint(uint256[] calldata tokensId) external {
        HolderState memory state_ = _state;
        if (tokensId.length < type(uint120).max) revert TooManyTokens();

        uint120 amount = uint120(tokensId.length);

        uint256 nftMinted_ = nftMinted[msg.sender] + amount;
        uint256 totalNftMinted_ = totalNftMinted + amount;


        if (state_.totalMintable < totalNftMinted_) revert NftMaxMintable();
        if (state_.walletMintable < nftMinted_) revert NftMaxMintable();

        nftMinted[msg.sender] = nftMinted_;
        totalNftMinted = totalNftMinted_;

        for (uint256 i = 0; i < amount;) {
            if (isNftUsed[tokensId[i]]) revert NftAlreadyUsed();
            isNftUsed[tokensId[i]] = true;

            unchecked {
                i++;
            }
        }

        _mint(msg.sender, amount, MintRule(state_.cost, state_.start, state_.transaction, amount));
    }
}
