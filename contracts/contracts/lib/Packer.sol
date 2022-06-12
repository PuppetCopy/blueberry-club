// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library Packer {
    function pack(address _address, uint96 _uint96)
        internal
        pure
        returns (uint256 packed)
    {
        packed = uint256(uint160(_address));
        packed = _pack(packed, _uint96, 160);
    }

    function pack(uint128 _uint128, uint128 uint128_)
        internal
        pure
        returns (uint256 packed)
    {
        packed = uint256(_uint128);
        packed = _pack(packed, uint128_, 128);
    }

    function _pack(
        uint256 word,
        uint256 value,
        uint8 position
    ) internal pure returns (uint256) {
        uint256 casted;
        assembly {
            casted := value
        }
        return (word & ((1 << position) - 1)) | (casted << position);
    }
}
