// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";

/// @title Marketplace
/// @author IrvingDev (https://github.com/IrvingDevPro)
/// @notice An easy to use marketplace for any type of tokens with
abstract contract Marketplace {
    /// -----------------------------------------------------------------------
    /// Library usage
    /// -----------------------------------------------------------------------

    using SafeTransferLib for ERC20;

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    enum OrderKind {
        Direct,
        Auction
    }

    event OrderCreated(
        uint256 indexed orderId,
        OrderKind kind,
        uint256 openFrom,
        uint256 openTo,
        address indexed maker,
        ERC20 currency,
        uint256 price,
        ERC721 tokenContract,
        uint256 tokenId
    );

    event OrderBid(
        uint256 indexed orderId,
        address indexed bidder,
        uint256 bidAmount
    );

    event OrderFilled(
        uint256 indexed orderId,
        address indexed taker,
        uint256 paidAmount
    );

    event OrderCancelled(uint256 indexed orderId);

    /// -----------------------------------------------------------------------
    /// Structs
    /// -----------------------------------------------------------------------

    struct Order {
        OrderKind kind;
        bool open;
        uint256 openFrom;
        uint256 openTo;
        address maker;
        ERC20 currency;
        uint256 price;
        ERC721 tokenContract;
        uint256 tokenId;
        address bidder;
        uint256 bidAmount;
        address taker;
        uint256 paidAmount;
    }

    /// -----------------------------------------------------------------------
    /// Storage
    /// -----------------------------------------------------------------------

    mapping(uint256 => Order) private order;

    uint256 private _orderIdTracker;

    /// -----------------------------------------------------------------------
    /// User actions
    /// -----------------------------------------------------------------------

    function createOrder(
        OrderKind kind,
        uint256 openFrom,
        uint256 openTo,
        ERC20 currency,
        uint256 price,
        ERC721 tokenContract,
        uint256 tokenId
    ) external virtual returns (uint256) {
        uint256 openDuration_ = openDuration(openFrom, openTo);

        require(openDuration_ > 0, "DURATION_ZERO");

        if (kind == OrderKind.Auction) {
            /// 2592000 = 30 * 24 * 60 * 60 = 30 days
            require(openDuration_ <= 2592000, "AUCTION_LIMIT_DURATION");
        }

        tokenContract.transferFrom(msg.sender, address(this), tokenId);

        uint256 orderId = _orderIdTracker++;

        order[orderId] = Order({
            kind: kind,
            open: true,
            openFrom: openFrom,
            openTo: openTo,
            maker: msg.sender,
            currency: currency,
            price: price,
            tokenContract: tokenContract,
            tokenId: tokenId,
            bidder: address(0),
            bidAmount: 0,
            taker: address(0),
            paidAmount: 0
        });

        emit OrderCreated(
            orderId,
            kind,
            openFrom,
            openTo,
            msg.sender,
            currency,
            price,
            tokenContract,
            tokenId
        );

        return orderId;
    }

    function cancelOrder(uint256 orderId) external virtual {
        /// @dev No need to check if order exist because we check if sender is owner
        Order memory order_ = order[orderId];
        require(order_.maker == msg.sender, "INVALID_CANCELER");
        require(order_.open, "ALREADY_CANCELED");
        require(order_.bidder == address(0), "HAS_BIDDER");

        order_.tokenContract.safeTransferFrom(
            address(this),
            order_.maker,
            order_.tokenId
        );

        order[orderId].open = false;

        emit OrderCancelled(orderId);
    }

    function bidOrder(uint256 orderId, uint256 amount) external virtual {
        /// @dev No need to check if order exist because we check if is open
        Order memory order_ = order[orderId];
        require(order_.kind == OrderKind.Auction, "DIRECT_ORDER");
        require(order_.open, "CLOSED_ORDER");
        require(order_.openFrom <= block.timestamp, "FROM_CLOSED_ORDER");
        require(order_.openTo > block.timestamp, "TO_CLOSED_ORDER");
        require(order_.price <= amount, "INVALID_INITIAL_BID");

        if (order_.bidder != address(0)) {
            require(order_.bidAmount < amount, "INVALID_BID");

            order_.currency.safeTransfer(order_.bidder, order_.bidAmount);
        }

        order_.bidder = msg.sender;
        order_.bidAmount = amount;
        order[orderId] = order_;

        order_.currency.safeTransferFrom(msg.sender, address(this), amount);

        emit OrderBid(orderId, msg.sender, amount);
    }

    function fillOrder(uint256 orderId, uint256 amount) external virtual {
        Order memory order_ = order[orderId];
        require(order_.open, "CLOSED_ORDER");

        order_.open = false;

        address spender;

        if (order_.kind == OrderKind.Direct) {
            require(order_.openFrom <= block.timestamp, "FROM_CLOSED_ORDER");
            require(order_.openTo > block.timestamp, "TO_CLOSED_ORDER");
            require(order_.price <= amount, "INVALID_PAID_AMOUNT");

            order_.taker = msg.sender;
            order_.paidAmount = amount;
            spender = msg.sender;
        } else if (order_.kind == OrderKind.Auction) {
            require(order_.bidder != address(0), "NO_BIDDER");
            require(order_.bidder == msg.sender, "INVALID_SENDER");
            require(order_.openTo <= block.timestamp, "NOT_FINISHED");

            order_.taker = order_.bidder;
            order_.paidAmount = order_.bidAmount;
            spender = address(this);
        }

        order[orderId] = order_;

        uint256 paidAmount = order_.paidAmount;

        if (paidAmount > 0) {
            try
                IERC2981(address(order_.tokenContract)).royaltyInfo(
                    order_.tokenId,
                    paidAmount
                )
            returns (address receiver, uint256 royaltyAmount) {
                if (order_.maker != receiver) {
                    order_.currency.safeTransferFrom(
                        spender,
                        receiver,
                        royaltyAmount
                    );
                    paidAmount -= royaltyAmount;
                }
            } catch {}

            order_.currency.safeTransferFrom(spender, order_.maker, paidAmount);
        }

        order_.tokenContract.safeTransferFrom(
            address(this),
            order_.taker,
            order_.tokenId
        );

        emit OrderFilled(orderId, order_.taker, order_.paidAmount);
    }

    /// -----------------------------------------------------------------------
    /// Getters
    /// -----------------------------------------------------------------------

    function openDuration(uint256 openFrom, uint256 openTo)
        private
        view
        returns (uint256)
    {
        uint256 start = openFrom < block.timestamp ? block.timestamp : openFrom;
        uint256 end = openTo == 0 ? type(uint256).max : openTo;

        /// Revert if start > end due to underflow
        return end - start;
    }
}
