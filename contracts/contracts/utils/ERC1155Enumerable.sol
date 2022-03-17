//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

abstract contract ERC1155Enumerable is ERC1155, ERC1155Holder {
    mapping(address => mapping(uint256 => uint256)) private _ownedTokens;
    mapping(address => uint256) private _ownedTokensCounter;
    mapping(uint256 => uint256) private _totalSupply;

    mapping(uint256 => uint256) private _ownedTokensIndex;

    uint256[] private _allTokens;

    mapping(uint256 => uint256) private _allTokensIndex;

    function totalTokens() public view returns (uint256) {
        return _allTokens.length;
    }

    function totalSupply(uint id) public view returns (uint256) {
        return _totalSupply[id] - 1;
    }

    function exists(uint256 id) public view virtual returns (bool) {
        return ERC1155Enumerable.totalSupply(id) > 0;
    }

    function tokenByIndex(uint256 index) public view returns (uint256) {
        require(index < _allTokens.length, "ERC1155Enumerable: global index out of bounds");
        return _allTokens[index];
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256) {
        require(index < _ownedTokensCounter[owner], "ERC1155Enumerable: owner index out of bounds");
        return _ownedTokens[owner][index];
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

        for (uint256 i = 0; i < ids.length; i++) {
            uint tokenId = ids[i];
            uint amount = amounts[i];
            if (from == address(0)) {
                _totalSupply[tokenId] += amount;
                if(balanceOf(address(this), tokenId) == 0) {
                    _addTokenToAllTokensEnumeration(tokenId);
                }
            } else if (from != to) {
                if((balanceOf(from, tokenId) - amount) == 0) {
                    _removeTokenFromOwnerEnumeration(from, tokenId);
                }
            }
            if (to == address(0)) {
                _totalSupply[tokenId] -= amount;
                if(from == address(this) && (balanceOf(address(this), tokenId) - amount) == 0) {
                    _removeTokenFromAllTokensEnumeration(tokenId);
                }
            } else if (to != from) {
                if(balanceOf(to, tokenId) == 0) {
                    _addTokenToOwnerEnumeration(to, tokenId);
                }
            }
        }
    }

    function walletOfOwner(address _owner) public view returns(uint256[] memory) {
        uint256 ownerTokenCount = _ownedTokensCounter[_owner];
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
        uint256 length = _ownedTokensCounter[to];
        _ownedTokensCounter[to]++;
        _ownedTokens[to][length] = tokenId;
        _ownedTokensIndex[tokenId] = length;
    }

    function _addTokenToAllTokensEnumeration(uint256 tokenId) private {
        _allTokensIndex[tokenId] = _allTokens.length;
        _allTokens.push(tokenId);
    }

    function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {
        uint256 lastTokenIndex = _ownedTokensCounter[from] - 1;
        _ownedTokensCounter[from]--;
        uint256 tokenIndex = _ownedTokensIndex[tokenId];

        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastTokenIndex];

            _ownedTokens[from][tokenIndex] = lastTokenId;
            _ownedTokensIndex[lastTokenId] = tokenIndex;
        }

        delete _ownedTokensIndex[tokenId];
        delete _ownedTokens[from][lastTokenIndex];
    }

    function _removeTokenFromAllTokensEnumeration(uint256 tokenId) private {
        uint256 lastTokenIndex = _allTokens.length - 1;
        uint256 tokenIndex = _allTokensIndex[tokenId];
        
        uint256 lastTokenId = _allTokens[lastTokenIndex];

        _allTokens[tokenIndex] = lastTokenId;
        _allTokensIndex[lastTokenId] = tokenIndex;

        delete _allTokensIndex[tokenId];
        _allTokens.pop();
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC1155Receiver) returns (bool) {
        return  interfaceId == type(IERC1155Receiver).interfaceId ||
                interfaceId == type(IERC1155).interfaceId ||
                interfaceId == type(IERC1155MetadataURI).interfaceId ||
                super.supportsInterface(interfaceId);
    }
}
