// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.17;

// Randomizer protocol interface
interface IRandomizer {
    function request(uint256 callbackGasLimit) external returns (uint256);

    function request(uint256 callbackGasLimit, uint256 confirmations)
        external
        returns (uint256);

    function clientWithdrawTo(address _to, uint256 _amount) external;

    function clientDeposit(address _for) external payable;
}
