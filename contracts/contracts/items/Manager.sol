//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "./Items.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GBCLabsManager is ERC1155Holder, ReentrancyGuard, Ownable, PaymentSplitter {

    uint public constant BACKGROUND_TYPE_ID = 1;

    struct Assets {
        uint background;
        uint item;
        uint itemType;
    }

    GBCLabsItems private ITEMS;
    IERC721 private GBC;

    mapping(uint256 => Assets) public getTokenAssets;
    
    constructor(address[] memory _payees, uint[] memory _shares ,address _gbc, address _items) PaymentSplitter(_payees, _shares)  {
        ITEMS = GBCLabsItems(_items);
        GBC = IERC721(_gbc);
    }
    
    function _addBackground(Assets storage token, uint item) internal returns(uint oldBackground) {
        oldBackground = token.background;
        token.background = item;
        return oldBackground;
    }
    
    function _removeBackground(Assets storage token) internal returns(uint oldBackground) {
        oldBackground = token.background;
        token.background = 0;
        return oldBackground;
    }
    
    function _addItem(Assets storage token, uint item, uint _type) internal returns(uint oldItem, uint oldType) {
        oldItem = token.item;
        oldType = token.itemType;
        token.item = item;
        token.itemType = _type;
        return (oldItem, oldType);
    }
    
    function _removeItem(Assets storage token) internal returns(uint oldItem, uint oldType) {
        oldItem = token.item;
        oldType = token.itemType;
        token.item = 0;
        token.itemType = 0;
        return (oldItem, oldType);
    }
    
    function _returnItem(address to, uint item) internal {
        ITEMS.safeTransferFrom(address(this), to, item, 1, "");
    }
    
    function _grabItem(address from, uint item) internal {
        require(ITEMS.balanceOf(from, item) >= 1, "Manager: Balance too low");
        ITEMS.safeTransferFrom(from, address(this), item, 1, "");
    }
    
    function setItemsTo(uint tokenId, uint[] memory itemIds, bool[] memory removes) external nonReentrant {
        address owner = GBC.ownerOf(tokenId);
        require(owner == msg.sender, "You don't own the token");
        bool setBackground = false;
        bool setItem = false;
        for (uint256 i = 0; i < itemIds.length; i++) {
            uint itemId = itemIds[i];
            bool remove = removes[i];
            uint itemType = ITEMS.getItemType(itemId);
            Assets storage token = getTokenAssets[tokenId];
            if(remove) {
                if(itemType == BACKGROUND_TYPE_ID) {
                    uint oldBackground = _removeBackground(token);
                    if(oldBackground != 0) {
                        _returnItem(owner, oldBackground);
                    }
                } else {
                    (uint oldItem,) = _removeItem(token);
                    if(oldItem != 0) {
                        _returnItem(owner, oldItem);
                    }
                }
            } else {
                if(itemType == BACKGROUND_TYPE_ID && !setBackground) {
                    _grabItem(owner, itemId);
                    setBackground = true;
                    uint oldBackground = _addBackground(token, itemId);
                    if(oldBackground != 0) {
                        _returnItem(owner, oldBackground);
                    }
                } else if(!setItem) {
                    _grabItem(owner, itemId);
                    setItem = true;
                    (uint oldItem,) = _addItem(token, itemId, itemType);
                    if(oldItem != 0) {
                        _returnItem(owner, oldItem);
                    }
                }
            }
        }
    }

    function rescueERC1155(address from, address to, uint[] memory ids, uint[] memory amounts) external onlyOwner {
        ITEMS.safeBatchTransferFrom(from, to, ids, amounts, "");
    }
}
