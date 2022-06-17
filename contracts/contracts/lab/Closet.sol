//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {GBCLab} from "./Lab.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";
import {ERC1155TokenReceiver} from "@rari-capital/solmate/src/tokens/ERC1155.sol";

/**
 * @title Closet
 * @author IrvingDevPro
 * @notice Permit GBC holders add and remove items from lab to their GBC
 */
contract Closet is ERC1155TokenReceiver {
    uint256 constant DEAD_INDEX = type(uint256).max;

    event Set(uint256 indexed token, uint256[] deposits, uint256[] whithdraws);

    error AlreadyDeposited();
    error NotDeposited();
    error NotOwner();
    error MaxOwnableReached();
    error PluginNotApproved();

    /// @notice Keep the list of items owned by an NFT
    mapping(uint256 => mapping(uint256 => uint256)) public itemsOwned;
    /// @notice Keep the length of the list of items by an NFT
    mapping(uint256 => uint256) public ownedLength;
    /// @notice Keep the index of an item on the list
    mapping(uint256 => mapping(uint256 => uint256)) public itemsIndex;

    /// @notice Let user appove plugin
    mapping(address => mapping(address => bool)) public pluginApproval;

    IERC721 public immutable GBC;
    GBCLab public immutable LAB;

    constructor(IERC721 _gbc, GBCLab _lab) {
        GBC = _gbc;
        LAB = _lab;
    }

    function get(
        uint256 token,
        uint256 start,
        uint256 size
    ) external view returns (uint256[] memory) {
        uint256 length = ownedLength[token];

        if (start >= length) {
            return new uint256[](0);
        }

        length -= start;

        if (size > length) {
            size = length;
        }

        uint256[] memory owned = new uint256[](size);

        for (uint256 i = 0; i < size; i++) {
            owned[i] = itemsOwned[token][start + i + 1];
        }

        return owned;
    }

    function isWearing(uint256 token, uint256 item)
        external
        view
        returns (bool)
    {
        uint256 index = itemsIndex[token][item];
        return (index != 0 && index != DEAD_INDEX);
    }

    function isWearing(uint256 token, uint256[] memory items)
        external
        view
        returns (bool[] memory)
    {
        uint256 length = items.length;
        bool[] memory wearings = new bool[](length);
        for (uint256 i = 0; i < length; i++) {
            uint256 index = itemsIndex[token][items[i]];
            wearings[i] = (index != 0 && index != DEAD_INDEX);
        }
        return wearings;
    }

    function set(
        uint256 token,
        uint256[] calldata deposits,
        uint256[] calldata withdraws,
        address receiver
    ) external {
        if (GBC.ownerOf(token) != msg.sender) revert NotOwner();
        _deposit(msg.sender, token, deposits);
        _withdraw(receiver, token, withdraws);

        emit Set(token, deposits, withdraws);
    }

    function setForAccount(
        address account,
        uint256 token,
        uint256[] calldata deposits,
        uint256[] calldata withdraws,
        address receiver
    ) external {
        if (!pluginApproval[account][msg.sender]) revert PluginNotApproved();
        if (GBC.ownerOf(token) != account) revert NotOwner();

        _deposit(account, token, deposits);
        _withdraw(receiver, token, withdraws);

        emit Set(token, deposits, withdraws);
    }

    function approve(address plugin, bool approved) external {
        pluginApproval[msg.sender][plugin] = approved;
    }

    function _deposit(
        address owner,
        uint256 token,
        uint256[] calldata items
    ) internal {
        uint256 nextIndex = ownedLength[token];
        uint256 length = items.length;
        uint256[] memory amounts = new uint256[](length);
        for (uint256 i = 0; i < length; ) {
            uint256 item = items[i];

            _validDeposit(itemsIndex[token][item]);

            nextIndex++;
            itemsOwned[token][nextIndex] = item;
            itemsIndex[token][item] = nextIndex;
            amounts[i] = 1;

            unchecked {
                i++;
            }
        }
        if (nextIndex == DEAD_INDEX) revert MaxOwnableReached();
        ownedLength[token] = nextIndex;
        LAB.safeBatchTransferFrom(owner, address(this), items, amounts, "");
    }

    function _withdraw(
        address receiver,
        uint256 token,
        uint256[] calldata items
    ) internal {
        uint256 lastIndex = ownedLength[token];
        uint256 length = items.length;
        uint256[] memory amounts = new uint256[](length);
        for (uint256 i = 0; i < length; ) {
            uint256 item = items[i];
            uint256 index = itemsIndex[token][item];

            _validWithdraw(index);

            if (index != lastIndex) {
                uint256 lastItem = itemsOwned[token][lastIndex];

                itemsOwned[token][index] = lastItem;
                itemsIndex[token][lastItem] = index;
            }

            itemsIndex[token][item] = DEAD_INDEX;
            itemsOwned[token][lastIndex] = DEAD_INDEX;
            lastIndex--;
            amounts[i] = 1;
            unchecked {
                i++;
            }
        }
        ownedLength[token] = lastIndex;
        LAB.safeBatchTransferFrom(address(this), receiver, items, amounts, "");
    }

    function _validDeposit(uint256 index) internal pure {
        if (index != 0 && index != DEAD_INDEX) revert AlreadyDeposited();
    }

    function _validWithdraw(uint256 index) internal pure {
        if (index == 0 && index == DEAD_INDEX) revert NotDeposited();
    }
}
