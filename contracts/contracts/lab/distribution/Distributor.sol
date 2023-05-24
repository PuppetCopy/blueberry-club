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

    // 1. contract will check if the account is eligible and has a GBC. 
    // else check if the account is a Mux container and refer to its origin, check step 1.
    // 2. user can buy/transfer a GBC anytime to claim on the account
    // 3. they flag the GBC per monthly competition to prevent users buying 1 GBC 
    // and claiming on multiple account (simple mapping)
    // 4. WETH is unwapped so network ETH is received

    uint256 private constant GBC_SUPPLY = 10000;

    // event Deposit(address indexed depositor, uint256 amount);
    // event Claim(
    //     address indexed operator,
    //     address indexed account,
    //     address indexed receiver,
    //     uint256 amount
    // );

    mapping(uint256 => mapping(uint256 => bool)) public isTokenUsed;

    // Epoch public epoch;

    ERC721 public immutable token;

    constructor(Authority authority, ERC721 _token) Auth(address(0), authority) {
        token = _token;
    }

    function distribute(uint256 _newRewards, uint256[] memory _rewardsList, address[] memory _winnersList) external requiresAuth {
        // TODO
        // 1. check if claiming period is closed 
        // 2. store data
        // 3. start claiming period (should be open for 1 week)
        // 4. pull _newRewards (WETH) from msg.sender
    }

    function claim() external requiresAuth returns (uint256) {
        // TODO
        // 1. check if claiming period is open
        // 2. check if msg.sender owns GBC && in winners list
        // or if msg.origin has a MUX container that is in winners list
        // 3. flag the GBC as used
    }

    // --------------- IGNORE --------------- 

    // function _deposit(uint256 amount) internal {
    //     Epoch memory _epoch = epoch;
    //     uint256 deposited = amount + _epoch.rest;

    //     _epoch.id++;
    //     _epoch.rest = deposited;
    //     _epoch.rewardPerToken = deposited / GBC_SUPPLY;

    //     epoch = _epoch;

    //     emit Deposit(msg.sender, amount);
    // }

    // function _claim(address holder, address payable receiver, uint256[] memory tokens) internal returns (uint256 reward) {
    //     Epoch memory epoch_ = epoch;

    //     uint256 id = epoch_.id;
    //     uint256 rewardPerToken = epoch_.rewardPerToken;

    //     for (uint256 i = 0; i < tokens.length; ) {
    //         uint256 token_ = tokens[i];

    //         if (token.ownerOf(token_) != holder) revert();
    //         if (isTokenUsed[id][token_]) revert();

    //         isTokenUsed[id][token_] = true;

    //         reward += rewardPerToken;

    //         unchecked {
    //             i++;
    //         }
    //     }

    //     // Can underflow but transaction will revert because not enough funds on contract
    //     unchecked {
    //         epoch_.rest -= reward;
    //     }

    //     epoch = epoch_;

    //     receiver.transfer(reward);

    //     emit Claim(msg.sender, holder, receiver, reward);
    // }
}
