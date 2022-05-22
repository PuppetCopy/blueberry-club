//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import {Closet} from "./Closet.sol";

/**
 * @title Closet
 * @author IrvingDevPro
 * @notice Permit GBC holders add and remove items from lab to their GBC
 */
contract Helper {
    uint256 public constant EMPTY = type(uint256).max;

    struct SetRequest {
        uint256 add;
        uint256 remove;
    }

    error InvalidLength();

    Closet public immutable closet;

    constructor(Closet closet_) {
        closet = closet_;
    }

    function set(uint256 token, SetRequest calldata background, SetRequest calldata custom, SetRequest calldata special) external {
        (uint256 lengthD, uint256 lengthW) = _getAmounts(background, custom, special);
        (uint256[] memory deposits, uint256[] memory withdraws) = _getArrays(background, custom, special, lengthD, lengthW);

        closet.setForAccount(msg.sender, token, deposits, withdraws, msg.sender);
        if (closet.ownedLength(token) > 3) revert InvalidLength();
    }

    function _getAmounts(SetRequest calldata background, SetRequest calldata custom, SetRequest calldata special) internal pure returns (uint256 lengthD, uint256 lengthW) {
        /// @dev EMPTY is max value of uint256 to save gas we don't use `!=` but instead `<`
        if (background.add < EMPTY) {
            lengthD++;
        }
        if (background.remove < EMPTY) {
            lengthW++;
        }
        if (custom.add < EMPTY) {
            lengthD++;
        }
        if (custom.remove < EMPTY) {
            lengthW++;
        }
        if (special.add < EMPTY) {
            lengthD++;
        }
        if (special.remove < EMPTY) {
            lengthW++;
        }
    }

    function _getArrays(SetRequest calldata background, SetRequest calldata custom, SetRequest calldata special, uint256 lengthD, uint256 lengthW) internal pure returns (uint256[] memory, uint256[] memory) {
        uint256[] memory deposits = new uint256[](lengthD);
        uint256[] memory withdraws = new uint256[](lengthW);

        if (background.add != EMPTY) {
            deposits[lengthD--] = background.add;
        }
        if (background.remove != EMPTY) {
            withdraws[lengthW--] = background.remove;
        }
        if (custom.add != EMPTY) {
            deposits[lengthD--] = custom.add;
        }
        if (custom.remove != EMPTY) {
            withdraws[lengthW--] = custom.remove;
        }
        if (special.add != EMPTY) {
            deposits[lengthD--] = special.add;
        }
        if (special.remove != EMPTY) {
            withdraws[lengthW--] = special.remove;
        }
        return (deposits, withdraws);
    }
}
