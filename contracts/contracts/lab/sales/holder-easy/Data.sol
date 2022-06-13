// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Clone} from "clones-with-immutable-args/Clone.sol";

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

import {GBCLab as Lab} from "../../Lab.sol";

contract HolderData is Clone {
    function _chunk1() internal pure returns (uint256) {
        return _getArgUint256(0);
    }

    function _chunk2() internal pure returns (uint256) {
        return _getArgUint256(32);
    }

    function _chunk3() internal pure returns (uint256) {
        return _getArgUint256(64);
    }

    function _chunk4() internal pure returns (uint256) {
        return _getArgUint256(96);
    }

    function _chunk5() internal pure returns (uint256) {
        return _getArgUint256(128);
    }

    function _chunk6() internal pure returns (uint256) {
        return _getArgUint256(160);
    }

    function _chunks()
        internal
        pure
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return (
            _chunk1(),
            _chunk2(),
            _chunk3(),
            _chunk4(),
            _chunk5(),
            _chunk6()
        );
    }

    function chunk1() external pure returns (Lab lab, uint96 wallet) {
        return chunk1(_chunk1());
    }

    function chunk2()
        external
        pure
        returns (address payable receiver, uint96 transaction)
    {
        return chunk2(_chunk2());
    }

    function chunk3() external pure returns (ERC20 token, uint96 finish) {
        return chunk3(_chunk3());
    }

    function chunk4() external pure returns (ERC721 checker, uint96 start) {
        return chunk4(_chunk4());
    }

    function chunk5() external pure returns (uint128 supply, uint128 cost) {
        return chunk5(_chunk5());
    }

    function chunk6() external pure returns (uint256) {
        return chunk6(_chunk6());
    }

    /// @notice Chunk1
    /// @return lab             : address
    /// @return wallet          : uint96
    function chunk1(uint256 i) public pure returns (Lab lab, uint96 wallet) {
        lab = Lab(address(uint160(i)));
        wallet = uint96(i >> 160);
    }

    /// @notice Chunk2
    /// @return receiver        : address
    /// @return transaction     : uint96
    function chunk2(uint256 i)
        public
        pure
        returns (address payable receiver, uint96 transaction)
    {
        receiver = payable(address(uint160(i)));
        transaction = uint96(i >> 160);
    }

    /// @notice Chunk3
    /// @return token           : address
    /// @return finish          : uint96
    function chunk3(uint256 i)
        public
        pure
        returns (ERC20 token, uint96 finish)
    {
        token = ERC20(address(uint160(i)));
        finish = uint96(i >> 160);
    }

    /// @notice Chunk4
    /// @return checker         : address
    /// @return start           : uint96
    function chunk4(uint256 i)
        public
        pure
        returns (ERC721 checker, uint96 start)
    {
        checker = ERC721(address(uint160(i)));
        start = uint96(i >> 160);
    }

    /// @notice Chunk5
    /// @return supply         : uint128
    /// @return cost           : uint128
    function chunk5(uint256 i)
        public
        pure
        returns (uint128 supply, uint128 cost)
    {
        supply = uint128(i);
        cost = uint128(i >> 128);
    }

    /// @notice Chunk6
    /// @return item         : uint256
    function chunk6(uint256 i) public pure returns (uint256) {
        return i;
    }
}
