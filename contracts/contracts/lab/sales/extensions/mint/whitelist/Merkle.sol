// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Private, MintRule} from "./Private.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

struct MerkleMintRule {
    address to;
    uint96 nonce;
    uint208 cost;
    uint64 start;
    uint120 transaction;
    uint120 amount;
}

error LeafClaimed();
error InvalidProof();
error WrongSender();

abstract contract PrivateMerkle is Private {
    bytes32 public immutable root;

    mapping(bytes32 => bool) public leafClaimed;

    constructor(bytes32 _root) {
        root = _root;
    }

    function getMerkleHash(MerkleMintRule memory _rule)
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    _rule.to,
                    _rule.cost,
                    _rule.start,
                    _rule.transaction,
                    _rule.amount,
                    _rule.nonce
                )
            );
    }

    function merkleMint(
        MerkleMintRule memory _mrule,
        bytes32[] calldata merkleProof,
        uint120 amount
    ) external {
        if (_mrule.to == msg.sender) revert WrongSender();
        bytes32 leaf = getMerkleHash(_mrule);
        if (leafClaimed[leaf]) revert LeafClaimed();

        if (!MerkleProof.verify(merkleProof, root, leaf)) revert InvalidProof();

        leafClaimed[leaf] = true;

        MintRule memory _rule = MintRule(
            _mrule.cost,
            _mrule.start,
            _mrule.transaction,
            _mrule.amount
        );

        _mint(msg.sender, amount, _rule);
        _rule.amount -= amount;
        _addRuleTo(msg.sender, _rule);
    }

    function merkleMintFor(
        MerkleMintRule memory _mrule,
        bytes32[] calldata merkleProof,
        uint120 amount
    ) external requiresAuth {
        bytes32 leaf = getMerkleHash(_mrule);
        if (leafClaimed[leaf]) revert LeafClaimed();

        if (!MerkleProof.verify(merkleProof, root, leaf)) revert InvalidProof();

        leafClaimed[leaf] = true;

        MintRule memory _rule = MintRule(
            _mrule.cost,
            _mrule.start,
            _mrule.transaction,
            _mrule.amount
        );

        _mint(_mrule.to, amount, _rule);
        _rule.amount -= amount;
        _addRuleTo(_mrule.to, _rule);
    }
}
