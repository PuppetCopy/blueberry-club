// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Auth, Authority} from "../../../lib/Auth.sol";

import {PublicData} from "./Data.sol";

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

import {GBCLab as Lab} from "../../Lab.sol";

import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

struct SaleState {
    uint128 minted;
    uint8 paused;
}

contract PublicSale is PublicData, Auth {
    using SafeTransferLib for ERC20;

    event Pause(address executor, bool isPaused);

    SaleState public state;

    mapping(address => uint256) public mintOf;
    mapping(uint256 => bool) public isTokenUsed;

    function initialize(address _owner) external {
        __Auth_init(_owner, Authority(address(0)));
        state.paused = 1;
    }

    function mint(uint128 amount) external {
        _mint(msg.sender, amount);
    }

    function mintFor(address to, uint128 amount) external requiresAuth {
        _mint(to, amount);
    }

    function _mint(address to, uint128 amount) internal {
        SaleState memory state_ = state;
        uint128 minted_ = state_.minted + amount;
        uint256 mintOf_ = mintOf[to] + amount;

        (
            Lab lab,
            uint96 wallet,
            address payable receiver,
            uint96 transaction,
            ERC20 token,
            uint96 finish,
            uint64 start,
            uint96 supply,
            uint96 cost,
            uint256 item
        ) = data();

        require(block.timestamp >= start, "NOT_STARTED");
        require(block.timestamp < finish, "SALE_ENDED");
        require(amount <= transaction, "MAX_TRANSACTION");
        require(mintOf_ <= wallet, "MAX_WALLET");
        require(minted_ <= supply, "MAX_WALLET");
        require(state_.paused == 1, "SALE_PAUSED");

        state = SaleState(minted_, 1);
        mintOf[to] = mintOf_;

        if (address(token) == address(0)) {
            receiver.transfer(cost * amount);
        } else {
            token.safeTransferFrom(msg.sender, receiver, cost * amount);
        }

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
