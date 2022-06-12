// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Payable, GBCLab} from "./../payment/Payable.sol";
import {Token} from "./../payment/Token.sol";
import {Mintable, MintRule} from "./../base/Mintable.sol";

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

contract PublicPayToken is Payable, Token, Mintable {
    constructor(uint256 item_,
                uint208 totalMinted,
                address owner_,
                address treasury_,
                GBCLab lab_,
                ERC20 token_,
                MintRule memory _rule)
        Token(token_)
        Payable(payable(treasury_), item_, lab_, owner_)
        Mintable(
            _rule.supply,
            _rule.cost,
            _rule.accountLimit,
            _rule.start,
            _rule.finish,
            totalMinted
        )
    {}

    function mint(uint120 mintAmount) external payable {
        _mint(msg.sender, mintAmount);
    }

    function mintFor(address to, uint120 mintAmount) external payable {
        _mint(to, mintAmount);
    }


}
