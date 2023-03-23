pragma solidity ^0.8.17;

import {IRandomizer} from "./interfaces/IRandomizer.sol";

contract MockRandomizer is IRandomizer {
    function request(uint256 callbackGasLimit)
        external
        pure
        override
        returns (uint256)
    {
        return 429;
    }

    function request(uint256 callbackGasLimit, uint256 confirmations)
        external
        pure
        override
        returns (uint256)
    {
        return 429;
    }

    function clientWithdrawTo(address _to, uint256 _amount) external override {}

    function clientDeposit(address _for) external payable override {}
}
