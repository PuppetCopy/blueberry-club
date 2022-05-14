// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {GBCLab} from "../GBCLab.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Sale} from "./sale.sol";

contract Whitelist is Ownable, Sale {

    bytes32 public immutable MERKLE_ROOT;
    uint public immutable COST;

    uint public whitelistMinted;

    mapping(address => bool) public claimed;

    constructor( address _items, address _TREASURY, uint _ITEM_ID, uint _MAX_SUPPLY, uint _MAX_PER_TX, uint _PUBLIC_COST, uint _PUBLIC_START_DATE, bytes32 _MERKLE_ROOT) Sale(_items, _TREASURY, _ITEM_ID, _MAX_SUPPLY, _MAX_PER_TX, _PUBLIC_START_DATE) {
        COST = _PUBLIC_COST;
        MERKLE_ROOT = _MERKLE_ROOT;
    }

    function whitelistMint(bytes32[] calldata merkleProof) public {
        require(claimed[msg.sender] == false, "already claimed");
        claimed[msg.sender] = true;
        require(MerkleProof.verify(merkleProof, MERKLE_ROOT, keccak256(abi.encodePacked(msg.sender))), "invalid merkle proof");
        require(minted <= MAX_SUPPLY, "max reached");

        _mint(1);
    }


    function mint(uint amount) external payable {
        require(msg.value == COST * amount, "ETH amount must match the exact cost");

        _mint(amount);
    }


}


