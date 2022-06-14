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

    function mint(uint256[] memory tokens) external payable {
        _mint(msg.sender, tokens);
    }

    function mintFor(address to, uint256[] memory tokens)
        external
        payable
        requiresAuth
    {
        _mint(to, tokens);
    }

    function _mint(address to, uint256[] memory tokens) internal {
        require(tokens.length <= type(uint128).max, "INVALID_TOKENS");
        uint128 amount = uint128(tokens.length);

        SaleState memory state_ = state;
        uint128 minted_ = state_.minted + amount;
        uint256 mintOf_ = mintOf[to] + amount;

        require(start() == 0 || block.timestamp >= start(), "NOT_STARTED");
        require(finish() == 0 || block.timestamp < finish(), "SALE_ENDED");
        require(
            transaction() == 0 || amount <= transaction(),
            "MAX_TRANSACTION"
        );
        require(wallet() == 0 || mintOf_ <= wallet(), "MAX_WALLET");
        require(supply() == 0 || minted_ <= supply(), "MAX_WALLET");
        require(state_.paused == 1, "SALE_PAUSED");

        for (uint256 i = 0; i < amount; ) {
            uint256 token_ = tokens[i];
            require(checker().ownerOf(token_) == to, "NOT_OWNER");
            require(!isTokenUsed[token_], "ALREADY_USED");

            isTokenUsed[token_] = true;

            unchecked {
                i++;
            }
        }

        state = SaleState(minted_, 1);
        mintOf[to] = mintOf_;

        if (cost() > 0) {
            if (address(token()) == address(0)) {
                receiver().transfer(cost() * amount);
            } else {
                token().safeTransferFrom(
                    msg.sender,
                    receiver(),
                    cost() * amount
                );
            }
        }

        lab().mint(to, item(), amount, "");
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
