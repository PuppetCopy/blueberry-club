// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";
import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";

struct Epoch {
    uint256 id;
    uint256 rewardPerToken;
    uint256 rest;
}

contract Distributor is Auth {
    uint256 private constant GBC_SUPPLY = 10000;

    event Deposit(address indexed depositor, uint256 amount);
    event Claim(
        address indexed operator,
        address indexed account,
        address indexed receiver,
        uint256 amount
    );

    mapping(uint256 => mapping(uint256 => bool)) public isTokenUsed;

    Epoch public epoch;

    ERC721 public immutable token;

    constructor(Authority authority, ERC721 token_)
        Auth(address(0), authority)
    {
        token = token_;
    }

    function deposit() external payable requiresAuth {
        _deposit(msg.value);
    }

    function claim(address account, uint256[] memory tokens)
        external
        requiresAuth
        returns (uint256)
    {
        return _claim(account, payable(msg.sender), tokens);
    }

    function _deposit(uint256 amount) internal {
        Epoch memory _epoch = epoch;
        uint256 deposited = amount + _epoch.rest;

        _epoch.id++;
        _epoch.rest = deposited;
        _epoch.rewardPerToken = deposited / GBC_SUPPLY;

        epoch = _epoch;

        emit Deposit(msg.sender, amount);
    }

    function _claim(
        address holder,
        address payable receiver,
        uint256[] memory tokens
    ) internal returns (uint256 reward) {
        Epoch memory epoch_ = epoch;

        uint256 id = epoch_.id;
        uint256 rewardPerToken = epoch_.rewardPerToken;

        for (uint256 i = 0; i < tokens.length; ) {
            uint256 token_ = tokens[i];

            if (token.ownerOf(token_) != holder) revert();
            if (isTokenUsed[id][token_]) revert();

            isTokenUsed[id][token_] = true;

            reward += rewardPerToken;

            unchecked {
                i++;
            }
        }

        // Can underflow but transaction will revert because not enough funds on contract
        unchecked {
            epoch_.rest -= reward;
        }

        epoch = epoch_;

        receiver.transfer(reward);

        emit Claim(msg.sender, holder, receiver, reward);
    }
}
