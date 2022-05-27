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

abstract contract Merkle is Private {

    bytes32 public immutable root;

    mapping(bytes32 => bool) public leafClaimed;

    constructor(bytes32 _root) {
        root = _root;
    }

    function getHash(MerkleMintRule memory _rule) public pure returns (bytes32 h) {
        h = keccak256(abi.encodePacked(_rule.to, _rule.cost, _rule.start, _rule.transaction, _rule.amount, _rule.nonce));
    }

    function addRule(MerkleMintRule memory _rule, bytes32[] calldata merkleProof) external {
        bytes32 leaf = getHash(_rule);
        if (leafClaimed[leaf]) revert LeafClaimed();

        if (!MerkleProof.verify(merkleProof, root, leaf)) revert InvalidProof();

        leafClaimed[leaf] = true;

        _addRuleTo(_rule.to, MintRule(_rule.cost, _rule.start, _rule.transaction, _rule.amount));
    }

    function merkleMint(MerkleMintRule memory _mrule, bytes32[] calldata merkleProof, uint120 amount) external {
        bytes32 leaf = getHash(_mrule);
        if (leafClaimed[leaf]) revert LeafClaimed();

        if (!MerkleProof.verify(merkleProof, root, leaf)) revert InvalidProof();

        leafClaimed[leaf] = true;

        MintRule memory _rule = MintRule(_mrule.cost, _mrule.start, _mrule.transaction, _mrule.amount);
        MintRule memory _saveRule = MintRule(_mrule.cost, _mrule.start, _mrule.transaction, _mrule.amount - amount);

        _addRuleTo(msg.sender, _saveRule);
        _mint(msg.sender, amount, _rule);
    }
}
