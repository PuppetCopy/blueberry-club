// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {GBCLab} from "../Lab.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

struct SaleState {
    uint120 minted;
    uint120 supply;
    uint8 paused;
}

abstract contract Sale is Auth {
    event Pause(address executor, bool isPaused);

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

    function supply() external view returns (uint256) {
        return state.supply;
    }

    function minted() external view returns (uint256) {
        return state.minted;
    }

    function isPaused() public view returns (bool) {
        return state.paused == 2;
    }

    function mint(uint120 amount) external payable virtual;

    function mintFor(address to, uint120 amount) external payable virtual;

    function _mint(address to, uint120 amount) internal {
        SaleState memory state_ = state;
        require(state.paused != 2, "IS_PAUSED");
        uint120 minted_ = state_.minted + amount;
        require(minted_ <= state_.supply, "MAX_SUPPLY");
        state.minted = minted_;
        LAB.mint(to, ITEM, amount, "");
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
