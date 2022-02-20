//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "./dependencies/ERC1155Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract GBCLabsItems is ERC1155Enumerable, AccessControl, ERC2981 {
    string public name = "Blueberry Lab Items";
    string public symbol = "BLI";

    mapping(uint256 => uint256) public getItemType;
    mapping(address => bool) public isApproved;
    uint private _feeDenominator = 10000;

    bytes32 public constant DESIGNER = keccak256("DESIGNER");
    bytes32 public constant MINTER = keccak256("MINTER");
    bytes32 public constant BURNER = keccak256("BURNER");

    bytes32 public constant MANAGER = keccak256("MANAGER");
    
    constructor() ERC1155("https://www.blueberry.club/api/item/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function addItem(uint itemType, uint itemId) external onlyRole(DESIGNER) {
        require(itemType != 0, "Items: Item cannot have type 0");
        require(itemId != 0, "Items: Item cannot have id 0");
        require(getItemType[itemId] == 0, "Items: Item already exist");
        _mint(address(this), itemId, 1, "");
        getItemType[itemId] = itemType;
    }

    function mint(address to, uint id, uint amount) external onlyRole(MINTER) {
        require(getItemType[id] != 0, "Item does not exist");
        _mint(to, id, amount, "");
    }

    function mintBatch(address to, uint[] memory ids, uint[] memory amounts) external onlyRole(MINTER) {
        require(ids.length == amounts.length, "Ids length differeent of amounts length");
        for (uint256 i = 0; i < ids.length; i++) {
            require(getItemType[ids[i]] != 0, "Item does not exist");
        }
        _mintBatch(to, ids, amounts, "");
    }

    function burn(address from, uint id, uint amount) external onlyRole(BURNER) {
        _burn(from, id, amount);
    }

    function burnBatch(address from, uint[] memory ids, uint[] memory amounts) external onlyRole(BURNER) {
        _burnBatch(from, ids, amounts);
    }

    function setDefaultFee(address receiver, uint96 feeNumerator) external onlyRole(MANAGER) {
        if(feeNumerator > 0) {
            _setDefaultRoyalty(receiver, feeNumerator);
        } else {
            _deleteDefaultRoyalty();
        }
    }

    function setTokenFee(uint token, address receiver, uint96 feeNumerator) external onlyRole(MANAGER) {
        if(feeNumerator > 0) {
            _setTokenRoyalty(token ,receiver, feeNumerator);
        } else {
            _resetTokenRoyalty(token);
        }
    }

    function setFeeDenominator(uint value) external onlyRole(MANAGER) {
        _feeDenominator = value;
    }

    function setApproval(address _address, bool value) external onlyRole(MANAGER) {
        isApproved[_address] = value;
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()) || isApproved[_msgSender()],
            "ERC1155: caller is not owner nor approved"
        );
        _safeTransferFrom(from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()) || isApproved[_msgSender()],
            "ERC1155: transfer caller is not owner nor approved"
        );
        _safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Enumerable, AccessControl, ERC2981) returns (bool) {
        return  interfaceId == type(IERC2981).interfaceId ||
                interfaceId == type(IERC1155Receiver).interfaceId ||
                interfaceId == type(IERC1155).interfaceId ||
                interfaceId == type(IERC1155MetadataURI).interfaceId ||
                interfaceId == type(IAccessControl).interfaceId || 
                super.supportsInterface(interfaceId);
    }
}
