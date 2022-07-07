// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Auth} from "@rari-capital/solmate/src/auth/Auth.sol";

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

import {FullMath} from "../lib/FullMath.sol";

/// @title Marketplace
/// @author IrvingDev (https://github.com/IrvingDevPro)
/// @notice An easy to use marketplace for any type of tokens with
abstract contract Marketplace is Auth {
    /// -----------------------------------------------------------------------
    /// Library usage
    /// -----------------------------------------------------------------------

    using SafeTransferLib for ERC20;

    /// -----------------------------------------------------------------------
    /// Constants
    /// -----------------------------------------------------------------------

    uint256 private constant MAXIMUM_DURATION_AUCTION = 30 * 24 * 60 * 60;
    uint256 private constant FEE_DENOMINATOR = 10000;

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event OrderCreated(
        uint256 indexed orderId,
        OrderKind kind,
        uint256 start,
        uint256 end,
        address indexed maker,
        uint256 price,
        address tokenContract,
        uint256 tokenId
    );

    event OrderBid(
        uint256 indexed orderId,
        address indexed bidder,
        uint256 bid
    );

    event OrderFilled(
        uint256 indexed orderId,
        address indexed taker,
        uint256 paid
    );

    event OrderCancelled(uint256 indexed orderId);

    /// -----------------------------------------------------------------------
    /// Structs
    /// -----------------------------------------------------------------------

    enum OrderKind {
        Direct,
        Auction
    }

    struct Order {
        OrderKind kind;
        bool open;
        uint256 openFrom;
        uint256 openTo;
        address maker;
        uint256 price;
        address tokenContract;
        uint256 tokenId;
        address bidder;
        uint256 bidAmount;
        address taker;
        uint256 paidAmount;
    }

    struct Fee {
        address receiver;
        uint96 fee;
    }

    /// -----------------------------------------------------------------------
    /// Storage
    /// -----------------------------------------------------------------------

    mapping(uint256 => Order) public order;

    uint256 private _orderIdTracker;

    Fee public fee;

    /// -----------------------------------------------------------------------
    /// User actions
    /// -----------------------------------------------------------------------

    function createOrder(
        OrderKind kind,
        uint256 openFrom,
        uint256 openTo,
        uint256 price,
        address tokenContract,
        uint256 tokenId
    ) external returns (uint256) {
        if (
            kind == OrderKind.Auction &&
            _duration(openFrom, openTo) > MAXIMUM_DURATION_AUCTION
        ) revert("MAXIMUM_DURATION_AUCTION");

        _deposit(msg.sender, tokenContract, tokenId);

        uint256 orderId = _orderIdTracker++;

        order[orderId] = Order({
            kind: kind,
            open: true,
            openFrom: openFrom,
            openTo: openTo,
            maker: msg.sender,
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
            price,
            tokenContract,
            tokenId
        );

        return orderId;
    }

    function cancelOrder(uint256 orderId) external {
        Order memory order_ = order[orderId];
        require(
            order_.maker == msg.sender || isAuthorized(msg.sender, msg.sig),
            "INVALID_SENDER"
        );
        require(order_.open, "ALREADY_CANCELED");
        require(order_.bidder == address(0), "AUCTION_STARTED");

        _withdraw(order_.maker, order_.tokenContract, order_.tokenId);

        order_.open = false;
        order[orderId] = order_;
        emit OrderCancelled(orderId);
    }

    function bidOrder(uint256 orderId) external payable {
        Order memory order_ = order[orderId];

        require(order_.kind == OrderKind.Auction, "INVALID_KIND");
        require(order_.open, "ORDER_CANCELED");
        require(order_.openFrom <= block.timestamp, "NOT_STARTED");
        require(order_.openTo > block.timestamp, "FINISHED");
        require(order_.price <= msg.value, "INVALID_AMOUNT");

        if (order_.bidder != address(0)) {
            uint256 bid = order_.bidAmount;
            require(bid < msg.value, "INVALID_BID");

            SafeTransferLib.safeTransferETH(order_.bidder, bid);
        }

        order_.bidder = msg.sender;
        order_.bidAmount = msg.value;

        order[orderId] = order_;

        emit OrderBid(orderId, msg.sender, msg.value);
    }

    function fillOrder(uint256 orderId) external payable virtual {
        Order memory order_ = order[orderId];

        require(order_.open, "ORDER_CLOSED");
        order_.open = false;

        if (order_.kind == OrderKind.Direct) {
            require(order_.openFrom <= block.timestamp, "NOT_STARTED");
            require(
                order_.openTo == 0 || order_.openTo > block.timestamp,
                "ENDED"
            );
            require(order_.price <= msg.value, "INVALID_AMOUNT");

            order_.taker = msg.sender;
            order_.paidAmount = msg.value;
        } else {
            require(order_.bidder != address(0), "NO_BIDDER");
            require(
                (order_.bidder == msg.sender &&
                    order_.openTo <= block.timestamp) ||
                    order_.maker == msg.sender ||
                    isAuthorized(msg.sender, msg.sig),
                "LemonadeMarketplace: must be the maker or final bidder to fill auction order"
            );

            order_.taker = order_.bidder;
            order_.paidAmount = order_.bidAmount;
        }

        order[orderId] = order_;

        uint256 bill = order_.paidAmount;

        if (bill > 0) {
            Fee memory fee_ = fee;

            uint256 royalty = FullMath.mulDiv(bill, fee_.fee, FEE_DENOMINATOR);

            SafeTransferLib.safeTransferETH(fee_.receiver, royalty);

            bill -= royalty;
            if (bill > 0) {
                SafeTransferLib.safeTransferETH(order_.maker, bill);
            }
        }

        _withdraw(order_.taker, order_.tokenContract, order_.tokenId);

        emit OrderFilled(orderId, order_.taker, order_.paidAmount);
    }

    /// -----------------------------------------------------------------------
    /// Internal
    /// -----------------------------------------------------------------------

    function _duration(uint256 openFrom, uint256 openTo)
        private
        view
        returns (uint256)
    {
        uint256 start = openFrom < block.timestamp ? block.timestamp : openFrom;
        uint256 end = openTo == 0 ? type(uint256).max : openTo;

        /// @dev undeflow if start > end
        return end - start;
    }

    function _deposit(
        address from,
        address tokenContract,
        uint256 tokenId
    ) internal virtual;

    function _withdraw(
        address to,
        address tokenContract,
        uint256 tokenId
    ) internal virtual;

    function setFee(Fee memory fee_) external requiresAuth {
        fee = fee_;
    }
}
