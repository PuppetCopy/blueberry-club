//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITournament {
    /// @dev The token used to claim
    function token() external view returns (IERC20);

    /// @dev The amount user can claim from this tournament
    function claimable(uint256) external view returns (uint256);

    /// @dev Let other contracts claim for user
    function claim(address account, uint256 amount) external;
}
