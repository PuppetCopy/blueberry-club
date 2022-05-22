// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {GBCLab} from "../GBCLab.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {SaleBasic} from "./SaleBasic.sol";

contract PermissionedWhitelist is SaleBasic {

    bytes32 public immutable MERKLE_ROOT;

    uint public whitelistMinted;

    mapping(address => bool) public claimed;

    constructor(address _lab, address _owner, uint _ITEM_ID, uint _COST, uint _MAX_SUPPLY, uint _MAX_PER_TX, uint _PUBLIC_START_DATE, bytes32 _MERKLE_ROOT) SaleBasic(_lab, _owner, _ITEM_ID, _COST, _MAX_SUPPLY, _MAX_PER_TX, _PUBLIC_START_DATE) {
        MERKLE_ROOT = _MERKLE_ROOT;
    }

    function whitelistMint(bytes32[] calldata merkleProof) public {
        if (claimed[msg.sender]) revert Error_Claimed();
        if (!MerkleProof.verify(merkleProof, MERKLE_ROOT, keccak256(abi.encodePacked(msg.sender)))) revert Error_InvalidProof();

        claimed[msg.sender] = true;

        _mint(1);
    }

}

error Error_Claimed(); // max amount per transaction reached
error Error_InvalidProof(); // Account is not whitelisted

