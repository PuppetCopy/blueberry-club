// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Native} from "./../payment/Native.sol";
import {Payable} from "./../payment/Payable.sol";
import {Mintable, MintRule} from "./../base/Mintable.sol";
import {GBCLab} from "../../../token/GBCL.sol";

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


error LeafClaimed();
error InvalidProof();
error WrongSender();

contract Private is Payable, Native, Mintable {
    bytes32 public immutable root;

    mapping(bytes32 => bool) public leafClaimed;

    constructor(uint256 item_,
                uint208 totalMinted,
                address _owner,
                GBCLab lab_,
                MintRule memory _rule,
                bytes32 _root)
        Payable(payable(_owner), item_, lab_, _owner)
        Mintable(
            _rule.supply,
            _rule.cost,
            _rule.accountLimit,
            _rule.start,
            _rule.finish,
            totalMinted
        )
    {
        root = _root;
    }


    function getMerkleHash(address to, uint120 nonce, MintRule memory _rule)
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    to,
                    nonce,
                    _rule.supply,
                    _rule.cost,
                    _rule.accountLimit,
                    _rule.start,
                    _rule.finish
                )
            );
    }

    function mint(
        uint120 nonce,
        MintRule memory _mrule,
        bytes32[] calldata merkleProof,
        uint120 amount
    ) external payable {
        _mintFor(msg.sender, nonce, _mrule, merkleProof, amount);
    }

    function mintFor(
        address to,
        uint120 nonce,
        MintRule memory _mrule,
        bytes32[] calldata merkleProof,
        uint120 amount
    ) external payable requiresAuth {
        _mintFor(to, nonce, _mrule, merkleProof, amount);
    }


    function _mintFor(
        address to,
        uint120 nonce,
        MintRule memory _mrule,
        bytes32[] calldata merkleProof,
        uint120 amount
    ) internal requiresAuth {
        bytes32 leaf = getMerkleHash(to, nonce, _mrule);

        if (leafClaimed[leaf]) revert LeafClaimed();
        if (!MerkleProof.verify(merkleProof, root, leaf)) revert InvalidProof();

        leafClaimed[leaf] = true;

        _mint(to, amount);
    }

}
