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

    /// @dev Hardcoded type ids
    uint public constant BACKGROUND_TYPE_ID = 1;
    uint public constant UNIQUE_TYPE_ID = 7;

    bool private _itemSet;
    bool private _backgroundSet;
    bool private _uniqueSet;

    struct Assets {
        uint background;
        uint item;
        uint unique;
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

    function getTokenAssetsWithTypes(uint256 _tokenId) external view returns(uint[2] memory background, uint[2] memory item, uint[2] memory unique) {
        Assets memory assets = getTokenAssets[_tokenId];
        background[0] = assets.background;
        background[1] = BACKGROUND_TYPE_ID;
        item[0] = assets.item;
        item[1] = ITEMS.getItemType(assets.item);
        unique[0] = assets.unique;
        unique[1] = UNIQUE_TYPE_ID;
        return(background, item, unique);
    }
    
    /// @dev Set new item and return the previous one with his type
    /// @param token The storage Assets token
    /// @param item the item id
    function _addItem(Assets storage token, uint item, uint itemType) internal returns(uint oldItem, bool grab) {
        grab = false;
        if(itemType == BACKGROUND_TYPE_ID && !_backgroundSet) {
            _backgroundSet = true;
            grab = true;
            oldItem = token.background;
            token.background = item;
        } else if(itemType == UNIQUE_TYPE_ID && !_uniqueSet) {
            _uniqueSet = true;
            grab = true;
            oldItem = token.unique;
            token.unique = item;
        } else if(!_itemSet) {
            _itemSet = true;
            grab = true;
            oldItem = token.item;
            token.item = item;
        }
        return (oldItem, grab);
    }
    
    /// @dev Remove actual item and return it with his type
    /// @param token The storage Assets token
    function _removeItem(Assets storage token, uint itemType) internal returns(uint oldItem) {
        if(itemType == BACKGROUND_TYPE_ID) {
            oldItem = token.background;
            token.background = 0;
        } else if(itemType == UNIQUE_TYPE_ID) {
            oldItem = token.unique;
            token.unique = 0;
        } else {
            oldItem = token.item;
            token.item = 0;
        }
        return oldItem;
    }


    function _resetVars() internal {
        _itemSet = false;
        _uniqueSet = false;
        _backgroundSet = false;
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
        for (uint256 i = 0; i < itemIds.length; i++) {
            uint itemId = itemIds[i];
            bool remove = removes[i];
            uint itemType = ITEMS.getItemType(itemId);
            Assets storage token = getTokenAssets[tokenId];
            uint itemReturn;
            if(remove) {
                itemReturn = _removeItem(token, itemType);
            } else {
                bool grab;
                (itemReturn, grab) = _addItem(token, itemId, itemType);
                if(grab) {
                    _grabItem(owner, itemId);
                }
            }
            if(itemReturn != 0) {
                _returnItem(owner, itemReturn);
            }
        }
        _resetVars();
    }

    /// @dev Let owner get back the tokens if something goes wrong
    function rescueERC1155(address from, address to, uint[] memory ids, uint[] memory amounts) external onlyOwner {
        ITEMS.safeBatchTransferFrom(from, to, ids, amounts, "");
    }
}
