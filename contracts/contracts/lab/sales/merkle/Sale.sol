// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Auth, Authority} from "../../../lib/Auth.sol";

import {PublicData} from "./Data.sol";

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

import {GBCLab as Lab} from "../../Lab.sol";

import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

struct SaleState {
    uint128 minted;
    uint8 paused;
}

struct MerkleRule {
    address to;
    uint96 transaction;
    uint128 amount;
    uint64 start;
    uint64 finish;
    uint96 wallet;
    uint96 supply;
    uint96 cost;
}

contract PublicSale is PublicData, Auth {
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
        return
            keccak256(
                abi.encodePacked(
                    rule.to,
                    rule.transaction,
                    rule.amount,
                    rule.start,
                    rule.finish,
                    rule.wallet,
                    rule.supply,
                    rule.cost
                )
            );
    }

    function mint(MerkleRule memory rule, bytes32[] memory proof) external {
        require(rule.to == msg.sender, "INVALID_SENDER");
        _mint(rule, proof);
    }

    function mintFor(MerkleRule memory rule, bytes32[] memory proof)
        external
        requiresAuth
    {
        _mint(rule, proof);
    }

    function _mint(MerkleRule memory rule, bytes32[] memory proof) internal {
        bytes32 leaf = hash(rule);

        address to = rule.to;
        uint128 amount = rule.amount;

        SaleState memory state_ = state;
        uint128 minted_ = state_.minted + amount;
        uint256 mintOf_ = mintOf[to] + amount;

        (
            Lab lab,
            uint96 wallet,
            address payable receiver,
            uint96 transaction,
            ERC20 token,
            uint96 finish,
            uint64 start,
            uint96 supply,
            uint96 cost,
            uint256 item,
            bytes32 root
        ) = _data(rule);

        require(!isLeafUsed[leaf], "LEAF_USED");
        require(MerkleProof.verify(proof, root, leaf), "INVALID_PROOF");

        require(start == 0 || block.timestamp >= start, "NOT_STARTED");
        require(finish == 0 || block.timestamp < finish, "SALE_ENDED");
        require(transaction == 0 || amount <= transaction, "MAX_TRANSACTION");
        require(wallet == 0 || mintOf_ <= wallet, "MAX_WALLET");
        require(supply == 0 || minted_ <= supply, "MAX_WALLET");
        require(state_.paused == 1, "SALE_PAUSED");

        state = SaleState(minted_, 1);
        mintOf[to] = mintOf_;
        isLeafUsed[leaf] = true;

        if (cost > 0) {
            if (address(token) == address(0)) {
                receiver.transfer(cost * amount);
            } else {
                token.safeTransferFrom(msg.sender, receiver, cost * amount);
            }
        }

        lab.mint(to, item, amount, "");
    }

    function _data(MerkleRule memory rule)
        internal
        pure
        returns (
            Lab lab,
            uint96 wallet,
            address payable receiver,
            uint96 transaction,
            ERC20 token,
            uint96 finish,
            uint64 start,
            uint96 supply,
            uint96 cost,
            uint256 item,
            bytes32 root
        )
    {
        (
            lab,
            wallet,
            receiver,
            transaction,
            token,
            finish,
            start,
            supply,
            cost,
            item,
            root
        ) = data();

        if (rule.transaction > 0) {
            transaction = rule.transaction - 1;
        }

        if (rule.start > 0) {
            start = rule.start - 1;
        }

        if (rule.finish > 0) {
            finish = rule.finish - 1;
        }

        if (rule.wallet > 0) {
            wallet = rule.wallet - 1;
        }

        if (rule.supply > 0) {
            supply = rule.supply - 1;
        }

        if (rule.cost > 0) {
            cost = rule.cost - 1;
        }
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
