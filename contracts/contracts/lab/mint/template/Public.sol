// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Native} from "./../payment/Native.sol";
import {Payable} from "./../payment/Payable.sol";
import {Mintable, MintRule} from "./../base/Mintable.sol";
import {GBCLab} from "../../../lab/Lab.sol";


contract Public is Payable, Native, Mintable {

    constructor(uint256 item_,
                uint208 totalMinted,
                address _owner,
                GBCLab lab_,
                MintRule memory _rule)
        Payable(payable(_owner), item_, lab_, _owner)
        Mintable(
            _rule.supply,
            _rule.cost,
            _rule.accountLimit,
            _rule.start,
            _rule.finish,
            totalMinted
        )
    {}

    function mint(uint120 amount) external payable {
        _mint(msg.sender, amount);
    }

    function mintFor(address to, uint120 amount) external payable requiresAuth {
        _mint(to, amount);
    }

}