//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {RolesAuthority, Authority} from "@rari-capital/solmate/src/auth/authorities/RolesAuthority.sol";

/**
 * @title Police
 * @author IrvingDevPro
 * @notice This contract manage user and roles permisions
 * in all contracts which this contract setted as autority
 */
contract Police is RolesAuthority {
    constructor(address _owner) RolesAuthority(_owner, Authority(address(0))) {}
}
