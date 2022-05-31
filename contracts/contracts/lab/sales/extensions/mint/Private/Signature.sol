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
error WrongSender();
error InvalidHash();

abstract contract PrivateSignature is Private {
    address public signer;

    function getSignatureHash(SignedMintRule memory _rule)
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

    function signatureMint(
        SignedMintRule memory _srule,
        bytes32 signedHash,
        bytes memory signature,
        uint120 amount
    ) external {
        if (_srule.to != msg.sender) revert WrongSender();
        bytes32 hash_ = getSignatureHash(_srule);
        if (hash_ != signedHash) revert InvalidHash();

        address _signer = ECDSA.recover(signedHash, signature);
        if (_signer != signer) revert WrongSigner();

        MintRule memory _rule = MintRule(
            _srule.cost,
            _srule.start,
            _srule.transaction,
            _srule.amount
        );

        _mint(msg.sender, amount, _rule);
        _rule.amount -= amount;
        _addRuleTo(msg.sender, _rule);
    }

    function signatureMintFor(
        SignedMintRule memory _srule,
        bytes32 signedHash,
        bytes memory signature,
        uint120 amount
    ) external {
        bytes32 hash_ = getSignatureHash(_srule);
        if (hash_ != signedHash) revert InvalidHash();

        address _signer = ECDSA.recover(signedHash, signature);
        if (_signer != signer) revert WrongSigner();

        MintRule memory _rule = MintRule(
            _srule.cost,
            _srule.start,
            _srule.transaction,
            _srule.amount
        );

        address to = _srule.to;

        _mint(to, amount, _rule);
        _rule.amount -= amount;
        _addRuleTo(to, _rule);
    }

    function setSignatureSigner(address _signer) external requiresAuth {
        signer = _signer;
    }
}
