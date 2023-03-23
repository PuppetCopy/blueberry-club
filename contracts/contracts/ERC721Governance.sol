// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Votes} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Votes.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract ERC721Governance is ERC721, Ownable, EIP712, ERC721Votes {
    ERC721 public erc721Token;

    constructor() ERC721("MyToken", "MTK") EIP712("MyToken", "1") {}

    function safeMint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
    }

    function wrapToken(uint256 tokenId) external {
        require(
            erc721Token.ownerOf(tokenId) == msg.sender,
            "Caller is not the owner of the token."
        );
        erc721Token.transferFrom(msg.sender, address(this), tokenId);
        _mint(msg.sender, tokenId);
        // _delegate(msg.sender);
    }

    function unwrapToken(uint256 tokenId) external {
        require(
            ownerOf(tokenId) == msg.sender,
            "Caller is not the owner of the wrapped token."
        );
        _burn(tokenId);
        erc721Token.transferFrom(address(this), msg.sender, tokenId);
    }

    function _afterTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Votes)
    {
        super._afterTokenTransfer(from, to, tokenId, batchSize);
    }
}