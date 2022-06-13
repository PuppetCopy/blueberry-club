// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Auth, Authority} from "../../../lib/Auth.sol";

import {HolderData} from "./Data.sol";

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

import {GBCLab as Lab} from "../../Lab.sol";

import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

struct SaleState {
    uint128 minted;
    uint8 paused;
}

contract HolderSale is HolderData, Auth {
    using SafeTransferLib for ERC20;

    event Pause(address executor, bool isPaused);

    SaleState public state;

    mapping(address => uint256) public mintOf;
    mapping(uint256 => bool) public isTokenUsed;

    function initialize(address _owner) external {
        __Auth_init(_owner, Authority(address(0)));
        state.paused = 1;
    }

    function mint(uint256[] memory tokens) external {
        _mint(msg.sender, tokens);
    }

    function mintFor(address to, uint256[] memory tokens)
        external
        requiresAuth
    {
        _mint(to, tokens);
    }

    function _mint(address to, uint256[] memory tokens) internal {
        (
            uint256 c1,
            uint256 c2,
            uint256 c3,
            uint256 c4,
            uint256 c5,
            uint256 c6
        ) = _chunks();

        uint256 amount = tokens.length;

        _required(amount, c2, c3, c4, c5);

        _check(to, tokens, c4);

        _pay(amount, c2, c3, c5);

        _mint(to, amount, c1, c6);
    }

    function _required(
        uint256 amount,
        uint256 c2,
        uint256 c3,
        uint256 c4,
        uint256 c5
    ) internal {
        SaleState memory state_ = state;
        uint256 minted_ = state_.minted + amount;

        (, uint96 transaction) = chunk2(c2);
        (, uint96 finish) = chunk3(c3);
        (, uint96 start) = chunk4(c4);
        (uint128 supply, ) = chunk5(c5);

        require(start == 0 || block.timestamp >= start, "NOT_STARTED");
        require(finish == 0 || block.timestamp < finish, "SALE_ENDED");
        require(transaction == 0 || amount <= transaction, "MAX_TRANSACTION");
        require(supply == 0 || minted_ <= supply, "MAX_SUPPLY");
        require(state_.paused == 1, "SALE_PAUSED");

        state = SaleState(uint128(minted_), 1);
    }

    function _pay(
        uint256 amount,
        uint256 c2,
        uint256 c3,
        uint256 c5
    ) internal {
        (address payable receiver, ) = chunk2(c2);
        (, uint128 cost) = chunk5(c5);
        (ERC20 token, ) = chunk3(c3);

        if (cost > 0) {
            if (address(token) == address(0)) {
                receiver.transfer(cost * amount);
            } else {
                token.safeTransferFrom(msg.sender, receiver, cost * amount);
            }
        }
    }

    function _check(
        address to,
        uint256[] memory tokens,
        uint256 c4
    ) internal {
        (ERC721 checker, ) = chunk4(c4);

        for (uint256 i = 0; i < tokens.length; ) {
            uint256 token_ = tokens[i];
            require(checker.ownerOf(token_) == to, "NOT_OWNER");
            require(!isTokenUsed[token_], "ALREADY_USED");

            isTokenUsed[token_] = true;

            unchecked {
                i++;
            }
        }
    }

    function _mint(
        address to,
        uint256 amount,
        uint256 c1,
        uint256 c6
    ) internal {
        (Lab lab, uint96 wallet) = chunk1(c1);
        uint256 item = chunk6(c6);

        uint256 mintOf_ = mintOf[to] + amount;

        require(wallet == 0 || mintOf_ <= wallet, "MAX_WALLET");

        mintOf[to] = mintOf_;

        lab.mint(to, item, amount, "");
    }

    function setPaused(bool isPaused_) external requiresAuth {
        if (isPaused_) {
            state.paused = 2;
        } else {
            state.paused = 1;
        }
        emit Pause(msg.sender, isPaused_);
    }
}
