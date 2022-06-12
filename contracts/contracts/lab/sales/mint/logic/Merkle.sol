// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Mintable} from "../Mintable.sol";

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

abstract contract Merkle is Mintable {
    bytes32 public immutable root;
    mapping(bytes32 => bool) public isLeafClaimed;

    constructor(bytes32 _root) {
        root = _root;
    }

    function mint(uint120 amount, bytes32[] calldata proof) external payable {
        _mint(msg.sender, amount, proof);
    }

    function mintFor(
        address to,
        uint120 amount,
        bytes32[] calldata proof
    ) external payable requiresAuth {
        _mint(to, amount, proof);
    }

    function _mint(
        address to,
        uint120 amount,
        bytes32[] calldata proof
    ) internal {
        bytes32 leaf = keccak256(abi.encodePacked(to));

        require(!isLeafClaimed[leaf], "LEAF_USED");
        require(!MerkleProof.verify(proof, root, leaf), "INVALID_PROOF");

        isLeafClaimed[leaf] = true;

        _mint(to, amount);
    }
}
