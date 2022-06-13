// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Clone} from "clones-with-immutable-args/Clone.sol";

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

import {GBCLab as Lab} from "../../Lab.sol";

contract HolderData is Clone {
    /// @notice Chunk1
    /// @return lab             : address
    /// @return wallet          : uint96
    function _chunk1() private pure returns (Lab lab, uint96 wallet) {
        uint256 i = _getArgUint256(0);
        lab = Lab(address(uint160(i)));
        wallet = uint96(i >> 160);
    }

    /// @notice Chunk2
    /// @return receiver        : address
    /// @return transaction     : uint96
    function _chunk2()
        private
        pure
        returns (address payable receiver, uint96 transaction)
    {
        uint256 i = _getArgUint256(32);
        receiver = payable(address(uint160(i)));
        transaction = uint96(i >> 160);
    }

    /// @notice Chunk3
    /// @return token           : address
    /// @return finish          : uint96
    function _chunk3() private pure returns (ERC20 token, uint96 finish) {
        uint256 i = _getArgUint256(64);
        token = ERC20(address(uint160(i)));
        finish = uint96(i >> 160);
    }

    /// @notice Chunk4
    /// @return checker         : address
    /// @return start           : uint96
    function _chunk4() private pure returns (ERC721 checker, uint96 start) {
        uint256 i = _getArgUint256(96);
        checker = ERC721(address(uint160(i)));
        start = uint96(i >> 160);
    }

    /// @notice Chunk5
    /// @return supply         : uint128
    /// @return cost           : uint128
    function _chunk5() private pure returns (uint128 supply, uint128 cost) {
        uint256 i = _getArgUint256(128);
        supply = uint128(i);
        cost = uint128(i >> 128);
    }

    /// @notice Chunk6
    /// @return item         : uint256
    function _chunk6() private pure returns (uint256) {
        return _getArgUint256(160);
    }

    function chunk1() external pure returns (Lab lab, uint96 wallet) {
        return _chunk1();
    }

    function chunk2()
        external
        pure
        returns (address payable receiver, uint96 transaction)
    {
        return _chunk2();
    }

    function chunk3() external pure returns (ERC20 token, uint96 finish) {
        return _chunk3();
    }

    function chunk4() external pure returns (ERC721 checker, uint96 start) {
        return _chunk4();
    }

    function chunk5() external pure returns (uint128 supply, uint128 cost) {
        return _chunk5();
    }

    function chunk6() external pure returns (uint256) {
        return _chunk6();
    }

    function data()
        public
        pure
        returns (
            Lab lab,
            uint96 wallet,
            address payable receiver,
            uint96 transaction,
            ERC20 token,
            uint96 finish,
            ERC721 checker,
            uint96 start,
            uint128 supply,
            uint128 cost,
            uint256 item
        )
    {
        (lab, wallet) = _chunk1();
        (receiver, transaction) = _chunk2();
        (token, finish) = _chunk3();
        (checker, start) = _chunk4();
        (supply, cost) = _chunk5();
        item = _chunk6();
    }
}
