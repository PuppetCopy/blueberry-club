// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Private, MintRule} from "./Private.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

struct SignedMintRule {
    address to;
    uint96 nonce;
    uint208 cost;
    uint64 start;
    uint120 transaction;
    uint120 amount;
}

error WrongSigner();
error InvalidHash();

abstract contract PrivateSignature is Private {

    address public signer;

    function getHash(SignedMintRule memory _rule) public pure returns (bytes32 h) {
        h = keccak256(abi.encodePacked(_rule.to, _rule.cost, _rule.start, _rule.transaction, _rule.amount, _rule.nonce));
    }

    function addRule(SignedMintRule memory _rule, bytes32 signedHash, bytes memory signature) external {
        bytes32 hash_ = getHash(_rule);
        if (hash_ != signedHash) revert InvalidHash();

        address _signer = ECDSA.recover(signedHash, signature);
        if (_signer != signer) revert WrongSigner();

        _addRuleTo(_rule.to, MintRule(_rule.cost, _rule.start, _rule.transaction, _rule.amount));
    }

    function signatureMint(SignedMintRule memory _srule, bytes32 signedHash, bytes memory signature, uint120 amount) external {
        bytes32 hash_ = getHash(_srule);
        if (hash_ != signedHash) revert InvalidHash();

        address _signer = ECDSA.recover(signedHash, signature);
        if (_signer != signer) revert WrongSigner();

        MintRule memory _rule = MintRule(_srule.cost, _srule.start, _srule.transaction, _srule.amount);
        MintRule memory _saveRule = MintRule(_srule.cost, _srule.start, _srule.transaction, _srule.amount - amount);

        _addRuleTo(msg.sender, _saveRule);
        _mint(msg.sender, amount, _rule);
    }

    function setSignatureSigner(address _signer) external onlyOwner {
        signer = _signer;
    }
}
