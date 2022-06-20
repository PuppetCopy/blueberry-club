// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";
import {GBCLab} from "../../../lab/Lab.sol";

abstract contract Payable is Auth {
    event Rescue(address indexed token, address indexed to, uint256 amount);
    event Paied(address indexed payeer, uint256 amount);

    uint256 public immutable ITEM;
    GBCLab public immutable LAB;
    address payable public immutable RECEIVER;


    constructor(address payable receiver_,
                uint256 item_,
                GBCLab lab_,
                address _owner
    ) Auth(_owner, Authority(address(0))) {
        ITEM = item_;
        LAB = lab_;
        RECEIVER = receiver_;
    }

    function _takeMoney(uint256 amount) internal virtual;

    function rescueTokens(
        ERC20 token,
        address to,
        uint256 amount
    ) external requiresAuth {
        token.transfer(to, amount);
        emit Rescue(address(token), to, amount);
    }

    function rescueTokens(address payable to, uint256 amount)
        external
        requiresAuth
    {
        to.transfer(amount);
        emit Rescue(address(0), to, amount);
    }
}