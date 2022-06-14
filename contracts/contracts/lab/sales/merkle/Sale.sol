// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Auth, Authority} from "../../../lib/Auth.sol";

import {MerkleData} from "./Data.sol";

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

import {GBCLab as Lab} from "../../Lab.sol";

import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import "hardhat/console.sol";

struct MerkleRule {
    address to;
    uint128 amount;
    uint128 cost;
}

struct SaleState {
    uint128 minted;
    uint8 paused;
}

contract MerkleSale is MerkleData, Auth {
    using SafeTransferLib for ERC20;

    event Pause(address executor, bool isPaused);

    SaleState public state;

    mapping(address => uint256) public mintOf;
    mapping(bytes32 => bool) public isLeafUsed;

    function initialize(address _owner) external {
        __Auth_init(_owner, Authority(address(0)));
        state.paused = 1;
    }

    function hash(MerkleRule memory rule) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(rule.to, rule.amount, rule.cost));
    }

    function mint(MerkleRule memory rule, bytes32[] memory proof)
        external
        payable
    {
        require(rule.to == msg.sender, "INVALID_SENDER");
        _mint(rule, proof);
    }

    function mintFor(MerkleRule memory rule, bytes32[] memory proof)
        external
        payable
        requiresAuth
    {
        _mint(rule, proof);
    }

    function _mint(MerkleRule memory rule, bytes32[] memory proof) internal {
        bytes32 leaf = hash(rule);

        require(!isLeafUsed[leaf], "LEAF_USED");
        require(MerkleProof.verify(proof, root(), leaf), "INVALID_PROOF");

        uint128 amount = rule.amount;
        address to = rule.to;
        uint128 cost_;
        if (rule.cost > 0) {
            cost_ = rule.cost - 1;
        } else {
            cost_ = cost();
        }

        SaleState memory state_ = state;
        uint128 minted_ = state_.minted + amount;

        require(start() == 0 || block.timestamp >= start(), "NOT_STARTED");
        require(finish() == 0 || block.timestamp < finish(), "SALE_ENDED");
        require(supply() == 0 || minted_ <= supply(), "MAX_SUPPLY");
        require(state_.paused == 1, "SALE_PAUSED");

        state = SaleState(minted_, 1);

        if (cost_ > 0) {
            if (address(token()) == address(0)) {
                receiver().transfer(cost_ * amount);
            } else {
                token().safeTransferFrom(
                    msg.sender,
                    receiver(),
                    cost_ * amount
                );
            }
        }

        lab().mint(to, item(), amount, "");
    }

    function setPaused(bool isPaused_) external requiresAuth {
        if (isPaused_) {
            state.paused = 2;
        } else {
            state.paused = 1;
        }
        emit Pause(msg.sender, isPaused_);
    }
}
