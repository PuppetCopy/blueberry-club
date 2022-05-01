//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {RolesAuthority, Authority} from "@rari-capital/solmate/src/auth/authorities/RolesAuthority.sol";

contract Police is RolesAuthority {
    constructor() RolesAuthority(msg.sender, Authority(address(0))) {}
}
