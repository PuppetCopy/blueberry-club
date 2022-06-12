// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Payable} from "../payments/Payable.sol";

struct MintState {
    uint64 start;
    uint64 finish;
    uint64 wallet;
    uint64 transaction;
}

abstract contract Mintable is Payable {
    uint256 private immutable _state_slot;
    uint256 public immutable cost;

    mapping(address => uint256) public totalMintedOf;

    constructor(MintState memory state, uint256 cost_) {
        _state_slot = _stateToUint(state);
        cost = cost_;
    }

    function finish() public view returns (uint256) {
        return _state().finish;
    }

    function start() public view returns (uint256) {
        return _state().start;
    }

    function maxWallet() public view returns (uint256) {
        return _state().wallet;
    }

    function maxTransaction() public view returns (uint256) {
        return _state().transaction;
    }

    function _mint(address to, uint120 amount) internal virtual override {
        MintState memory state_ = _state();
        uint256 totalMinted_ = totalMintedOf[to] + amount;

        require(block.timestamp < state_.finish, "FINISHED");
        require(block.timestamp >= state_.start, "NOT_STARTED");
        require(totalMinted_ <= state_.wallet, "MAX_WALLET");
        require(amount <= state_.transaction, "MAX_TRANSACTION");

        totalMintedOf[to] = totalMinted_;

        _takeMoney(cost * amount);

        super._mint(to, amount);
    }

    function _state() private view returns (MintState memory state_) {
        return _uintToState(_state_slot);
    }

    function _uintToState(uint256 state)
        private
        pure
        returns (MintState memory state_)
    {
        state_.start = uint64(state);
        state_.finish = uint64(state >> 64);
        state_.wallet = uint64(state >> 128);
        state_.transaction = uint64(state >> 192);
    }

    function _stateToUint(MintState memory state)
        private
        pure
        returns (uint256 state_)
    {
        state_ = uint256(state.start);
        state_ = _pack(state_, state.finish, 64);
        state_ = _pack(state_, state.wallet, 128);
        state_ = _pack(state_, state.transaction, 192);
    }

    function _pack(
        uint256 word,
        uint64 value,
        uint8 position
    ) private pure returns (uint256) {
        uint256 casted;
        assembly {
            casted := value
        }
        return (word & ((1 << position) - 1)) | (casted << position);
    }
}
