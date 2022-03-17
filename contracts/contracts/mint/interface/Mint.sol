// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


interface IMint {
    function mint(address to, uint id, uint amount) external;
}
