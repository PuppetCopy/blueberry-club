// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Sale, SaleState, GBCLab} from "../Sale.sol";
import {Native} from "../payments/Native.sol";
import {Token} from "../payments/Token.sol";

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

contract SaleTakeMoneyNativeTest is Sale, Native {
    constructor(
        uint256 item_,
        GBCLab lab_,
        SaleState memory state_,
        address payable owner_
    ) Sale(item_, lab_, state_, owner_) Native(owner_) {}

    function mintByValue(address to, uint120 amount) external payable {
        _takeMoney();
        _mint(to, amount);
    }

    function mintByAmount(
        address to,
        uint120 mintAmount,
        uint256 paidAmount
    ) external payable {
        _takeMoney(paidAmount);
        _mint(to, mintAmount);
    }
}

contract FakeToken is ERC20 {
    constructor() ERC20("Fake Token", "FT", 18) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SaleTakeMoneyTokenTest is Sale, Token {
    constructor(
        uint256 item_,
        GBCLab lab_,
        SaleState memory state_,
        address payable owner_,
        ERC20 token_
    ) Sale(item_, lab_, state_, owner_) Token(token_, owner_) {}

    function mintByAmount(
        address to,
        uint120 mintAmount,
        uint256 paidAmount
    ) external payable {
        _takeMoney(paidAmount);
        _mint(to, mintAmount);
    }
}
