//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "./Items.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Blueberry Lab Manager
 * @author IrvingDevPro
 * @notice This contract is used by GBC Team to re render the NFT
 */
contract GBCLabsManager is ERC1155Holder, ReentrancyGuard, Ownable, PaymentSplitter {

    /// @dev Hardcoded background type id
    uint public constant BACKGROUND_TYPE_ID = 1;

    struct Assets {
        uint background;
        uint item;
        uint itemType;
    }

    /// @notice Blueberry Lab Items contract
    GBCLabsItems private ITEMS;

    /// @notice GBC contract
    IERC721 private GBC;

    /// @dev Map the GBC NFT to his owned assets
    mapping(uint256 => Assets) public getTokenAssets;
    
    /**
     * @notice The PaymentSplitter is used for security reasons (Funds sended by mistake to the contract) this contract should not receive tokens
     * @param _payees The list of addresses which can realease the tokens on the contract 
     * @param _shares In same order as _payees set how splitted are tokens among the _payees
     * @param _gbc The GBC deployed contract address
     * @param _items The Blueberry Lab Items contract contract address
     */
    constructor(address[] memory _payees, uint[] memory _shares , address _gbc, address _items) PaymentSplitter(_payees, _shares)  {
        ITEMS = GBCLabsItems(_items);
        GBC = IERC721(_gbc);
    }
    
    /// @dev Set new background and return the previous one
    /// @param token The storage Assets token
    /// @param item the background item id
    function _addBackground(Assets storage token, uint item) internal returns(uint oldBackground) {
        oldBackground = token.background;
        token.background = item;
        return oldBackground;
    }
    
    /// @dev Delete actual background and return it
    /// @param token The storage Assets token
    function _removeBackground(Assets storage token) internal returns(uint oldBackground) {
        oldBackground = token.background;
        token.background = 0;
        return oldBackground;
    }
    
    /// @dev Set new item and return the previous one with his type
    /// @param token The storage Assets token
    /// @param item the item id
    /// @param _type the type of the item
    function _addItem(Assets storage token, uint item, uint _type) internal returns(uint oldItem, uint oldType) {
        oldItem = token.item;
        oldType = token.itemType;
        token.item = item;
        token.itemType = _type;
        return (oldItem, oldType);
    }
    
    /// @dev Remove actual item and return it with his type
    /// @param token The storage Assets token
    function _removeItem(Assets storage token) internal returns(uint oldItem, uint oldType) {
        oldItem = token.item;
        oldType = token.itemType;
        token.item = 0;
        token.itemType = 0;
        return (oldItem, oldType);
    }
    
    /// @dev Send item to an address
    /// @param to The receiver of item
    /// @param item The item id
    function _returnItem(address to, uint item) internal {
        ITEMS.safeTransferFrom(address(this), to, item, 1, "");
    }
    
    /// @dev Receive item from an address
    /// @param from The address of user providing item
    /// @param item The item id
    function _grabItem(address from, uint item) internal {
        require(ITEMS.balanceOf(from, item) >= 1, "Manager: Balance too low");
        ITEMS.safeTransferFrom(from, address(this), item, 1, "");
    }
    
    /// @notice Let anyone set an item and background to his GBC
    /// @param tokenId the ID of the GBC NFT
    /// @param itemIds the items ids (One background and one items or just a background or item)
    /// @param removes if true remove the item from GBC NFT if false replace the item provided
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

    /// @dev Let owner get back the tokens if something goes wrong
    function rescueERC1155(address from, address to, uint[] memory ids, uint[] memory amounts) external onlyOwner {
        ITEMS.safeBatchTransferFrom(from, to, ids, amounts, "");
    }
}
