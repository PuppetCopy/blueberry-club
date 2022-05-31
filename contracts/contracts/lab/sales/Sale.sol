// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {GBCLab} from "../GBCLab.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

struct SaleState {
    uint120 minted;
    uint120 max;
    uint8 paused;
}

error SalePaused();
error MaxSupplyReached();

contract Sale is Auth {
    event Paused(address executor);
    event Unpaused(address executor);

    uint256 public immutable ITEM;
    GBCLab public immutable LAB;

    SaleState private state;

    constructor(
        uint256 item_,
        GBCLab lab_,
        SaleState memory state_,
        address _owner
    ) Auth(_owner, Authority(address(0))) {
        ITEM = item_;
        LAB = lab_;
        state = state_;
    }

    function maxSupply() external view returns (uint256) {
        return state.max;
    }

    function totalMinted() external view returns (uint256) {
        return state.minted;
    }

    function isPaused() public view returns (bool) {
        return state.paused == 2;
    }

    function _mint(address to, uint120 amount) internal {
        SaleState memory state_ = state;
        if (state.paused == 2) revert SalePaused();
        uint120 totalMinted_ = state_.minted + amount;
        if (totalMinted_ > state_.max) revert MaxSupplyReached();
        state.minted = totalMinted_;
        LAB.mint(to, ITEM, amount, "");
    }

    function setPaused(bool isPaused_) external requiresAuth {
        if (isPaused_) {
            state.paused = 2;
            emit Paused(msg.sender);
        } else {
            state.paused = 1;
            emit Unpaused(msg.sender);
        }
    }
}
