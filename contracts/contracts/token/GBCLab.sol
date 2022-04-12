//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {ERC1155, IERC1155, IERC1155MetadataURI} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl, IAccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC2981, IERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * @title Blueberry Lab Items
 * @author IrvingDevPro
 * @notice This contract manage the tokens usable by GBC holders
 */
contract GBCLab is ERC1155, Ownable, AccessControl, ERC2981 {
    /// @notice Contract Name
    string public name = "GMX Blueberry Lab";

    /// @notice Contract Symbol
    string public symbol = "GBCL";

    /**
     * @notice Types are the different atributes of the GBC NFT
     * @dev Map items to their types
     */
    mapping(uint256 => uint256) public getAttributeOf;

    /// @dev Map of address which skip approve condition
    mapping(address => bool) public isApproved;

    /// @dev Keep track of user wallet
    mapping(address => mapping(uint256 => uint256)) private _ownedTokens;
    /// @dev Keep track of the number of tokens owned
    mapping(address => uint256) private _ownedTokensCounter;
    /// @dev Keep track of index on the user wallet
    mapping(address => mapping(uint256 => uint256)) private _ownedIndex;


    mapping(uint256 => uint256) private _totalSupply;

    /// @dev Roles used by the contract to let external contracts or users do advanced features
    bytes32 public constant MINTER = keccak256("MINTER");
    bytes32 public constant BURNER = keccak256("BURNER");

    /// @dev Set the deployer as default admin of the contract
    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function totalSupply(uint id) public view returns (uint256) {
        return _totalSupply[id];
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256) {
        require(index < _ownedTokensCounter[owner], "ERC1155Enumerable: owner index out of bounds");
        return _ownedTokens[owner][index + 1];
    }

    function walletOfOwner(address _owner) public view returns(uint256[] memory) {
        uint256 ownerTokenCount = _ownedTokensCounter[_owner];
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    /**
     * @notice Mint x number of token to an address
     * @param to The address receiver of the tokens
     * @param id The token id to mint
     * @param amount The amount to generate
     */
    function mint(address to, uint id, uint amount) external onlyRole(MINTER) {
        _mint(to, id, amount, "");
    }

    /**
     * @notice Mint x numbers of tokens to an address
     * @param to The address receiver of the tokens
     * @param ids The list of tokens ids to mint
     * @param amounts The amounts to generate in same orders at their ids
     */
    function mintBatch(address to, uint[] memory ids, uint[] memory amounts) external onlyRole(MINTER) {
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
        _burnBatch(from, ids, amounts);
    }

    /**
     * @notice Set the default fees on transfer for marketplace
     * @param receiver The address who receive the fees
     * @param feeNumerator The fee devided by _feeDenominator() (10000 by default)
     * @dev Be aware of the _feeDenominator by default to have 5% fee on any sell the feeNumerator is 500
     */
    function setDefaultFee(address receiver, uint96 feeNumerator) external onlyOwner {
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
    function setTokenFee(uint token, address receiver, uint96 feeNumerator) external onlyOwner {
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
    function setDefaultApproval(address _address, bool value) external onlyOwner {
        isApproved[_address] = value;
    }

    /**
     * @notice Update the metadata uri
     * @param newuri The new uri to set
     */
    function setUri(string memory newuri) external onlyOwner {
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
            } else if (from != to) {
                _remove(from, tokenId);
            }
            if (to == address(0)) {
                _totalSupply[tokenId] -= amount;
            } else if (to != from) {
                _add(to, tokenId);
            }
        }
    }

    function _remove(address account, uint id) internal {
        uint index = _ownedIndex[account][id];
        if(index != 0) {
            uint256 lastTokenIndex = _ownedTokensCounter[account];
            _ownedTokensCounter[account]--;

            if(index != lastTokenIndex) {
                uint256 lastTokenId = _ownedTokens[account][lastTokenIndex];

                _ownedTokens[account][index] = lastTokenId;
                _ownedIndex[account][lastTokenId] = index;
            }

            delete _ownedIndex[account][id];
            delete _ownedTokens[account][lastTokenIndex];
        }
    }

    function _add(address account, uint id) internal {
        uint index = _ownedIndex[account][id];
        if(index == 0) {
            index = _ownedTokensCounter[account] + 1;
            _ownedTokensCounter[account]++;
            _ownedTokens[account][index] = id;
            _ownedIndex[account][id] = index;
        }
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl, ERC2981) returns (bool) {
        return  interfaceId == type(IERC2981).interfaceId ||
                interfaceId == type(IERC1155).interfaceId ||
                interfaceId == type(IERC1155MetadataURI).interfaceId ||
                interfaceId == type(IAccessControl).interfaceId ||
                super.supportsInterface(interfaceId);
    }
}
