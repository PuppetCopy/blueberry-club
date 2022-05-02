//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

/**
 * @title Trading Tournament
 * @author IrvingDevPro
 * @notice A tournament contract as a buch of function which can
 * be used by the router. There is 1 tournament contract for each
 * quarter meaning the logic to open, close position or leadboard
 * can change in future
 */
abstract contract Tournament is Auth {
    IERC20 immutable public token;

    constructor(IERC20 _token) Auth(msg.sender, Authority(address(0))) {
        token = _token;
    }
}
