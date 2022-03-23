//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../utils/ERC1155Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * @title Blueberry Lab Items
 * @author IrvingDevPro
 * @notice This contract manage the tokens usable by GBC holders
 */
contract GBCLab is ERC1155Enumerable, AccessControl, ERC2981 {
    /// @notice Contract Name
    string public name = "Blueberry Lab";

    /// @notice Contract Symbol
    string public symbol = "BLI";

    /**
     * @notice Types are the different atributes of the GBC NFT
     * @dev Map items to their types
     */
    mapping(uint256 => uint256) public getItemType;

    /// @dev Map of address which skip approve condition
    mapping(address => bool) public isApproved;

    /// @dev Roles used by the contract to let external contracts or users do advanced features
    bytes32 public constant DESIGNER = keccak256("DESIGNER");
    bytes32 public constant MINTER = keccak256("MINTER");
    bytes32 public constant BURNER = keccak256("BURNER");
    bytes32 public constant MANAGER = keccak256("MANAGER");

    /// @dev Set the deployer as default admin of the contract
    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Let role "DESIGNER" create a new item
     * @param itemType the type of the new item (Hat, eyes, ...)
     * @param itemId the ID of the token
     * @dev The type are arbitrary meaning it's to the caller of the function to take care the type follow the rules
     */
    function addItem(uint itemType, uint itemId) external onlyRole(DESIGNER) {
        require(itemType != 0, "Item cannot have type 0");
        require(itemId != 0, "Item cannot have id 0");
        require(getItemType[itemId] == 0, "Item already exist");
        _mint(address(this), itemId, 1, "");
        getItemType[itemId] = itemType;
    }

    /**
     * @notice Mint x number of token to an address
     * @param to The address receiver of the tokens
     * @param id The token id to mint
     * @param amount The amount to generate
     */
    function mint(address to, uint id, uint amount) external onlyRole(MINTER) {
        require(getItemType[id] != 0, "Item does not exist");
        _mint(to, id, amount, "");
    }

    /**
     * @notice Mint x numbers of tokens to an address
     * @param to The address receiver of the tokens
     * @param ids The list of tokens ids to mint
     * @param amounts The amounts to generate in same orders at their ids
     */
    function mintBatch(address to, uint[] memory ids, uint[] memory amounts) external onlyRole(MINTER) {
        require(ids.length == amounts.length, "Ids length differeent of amounts length");
        for (uint256 i = 0; i < ids.length; i++) {
            require(getItemType[ids[i]] != 0, "Item does not exist");
        }
        _mintBatch(to, ids, amounts, "");
    }

    /**
     * @notice Burn x numbers of tokens of address
     * @param from The address burning tokens
     * @param id The token id to burn
     * @param amount The amount to delete
     */
    function burn(address from, uint id, uint amount) external onlyRole(BURNER) {
        _burn(from, id, amount);
    }

    /**
     * @notice Burn x numbers of tokens to an address
     * @param from The address burning tokens
     * @param ids The list of tokens ids to burn
     * @param amounts The amounts to delete in same orders at their ids
     */
    function burnBatch(address from, uint[] memory ids, uint[] memory amounts) external onlyRole(BURNER) {
        require(ids.length == amounts.length, "Ids length differeent of amounts length");
        _burnBatch(from, ids, amounts);
    }

    /**
     * @notice Set the default fees on transfer for marketplace
     * @param receiver The address who receive the fees
     * @param feeNumerator The fee devided by _feeDenominator() (10000 by default)
     * @dev Be aware of the _feeDenominator by default to have 5% fee on any sell the feeNumerator is 500
     */
    function setDefaultFee(address receiver, uint96 feeNumerator) external onlyRole(MANAGER) {
        if(feeNumerator > 0) {
            _setDefaultRoyalty(receiver, feeNumerator);
        } else {
            _deleteDefaultRoyalty();
        }
    }

    /**
     * @notice Set the fee on transfer for specifique token for marketplace
     * @param token The token ID
     * @param receiver The address who receive the fees
     * @param feeNumerator The fee devided by _feeDenominator() (10000 by default)
     * @dev Be aware of the _feeDenominator by default to have 5% fee on any sell the feeNumerator is 500
     */
    function setTokenFee(uint token, address receiver, uint96 feeNumerator) external onlyRole(MANAGER) {
        if(feeNumerator > 0) {
            _setTokenRoyalty(token ,receiver, feeNumerator);
        } else {
            _resetTokenRoyalty(token);
        }
    }

    /**
     * @notice Add/Remove addresses which can spend user tokens without approval
     * @param _address The contract address which bypass approve check
     * @param value true to enable the feature false to disable
     * @dev It's very important to not let anyone get access to this function or add to the addresses a non verified contract
     */
    function setDefaultApproval(address _address, bool value) external onlyRole(MANAGER) {
        isApproved[_address] = value;
    }

    /**
     * @notice Update the metadata uri
     * @param newuri The new uri to set
     */
    function setUri(string memory newuri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
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
