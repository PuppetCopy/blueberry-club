// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {GBCLab} from "../GBCLab.sol";
import {Owned} from "@rari-capital/solmate/src/auth/Owned.sol";

struct SaleState {
    uint120 minted;
    uint120 max;
    uint8 paused;
}

error SalePaused();
error MaxSupplyReached();

contract Sale is Owned {
    uint256 public immutable ITEM;
    GBCLab public immutable LAB;

    SaleState private state;

    constructor(uint256 item_, GBCLab lab_, SaleState memory state_, address _owner) Owned(_owner)  {
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

    function setPaused(bool isPaused_) external onlyOwner {
        if (isPaused_) {
            state.paused = 2;
        } else {
            state.paused = 1;
        }
    }
}
