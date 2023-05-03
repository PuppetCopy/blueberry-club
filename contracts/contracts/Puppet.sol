// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface IPuppetOrchestrator {
    function distributeCollateralIncrease(address token, uint256 amount) external;
    function distributeCollateralDecrease(address token, uint256 amount) external;
}

contract Puppet {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public WETH;
    IPuppetOrchestrator public puppetOrchestrator;

    struct RouteInfo {
        address collateralToken;
        uint256 totalCollateralAmount;
        uint256 totalPuppetCollateralAmount;
    }

    mapping(uint256 => RouteInfo) public routeInfo;

    constructor(address _WETH, address _puppetOrchestrator) {
        WETH = _WETH;
        puppetOrchestrator = IPuppetOrchestrator(_puppetOrchestrator);
    }

    function adjustPosition(
        uint256 routeId,
        uint256 collateralAmount,
        bool increase
    ) external payable {
        RouteInfo storage route = routeInfo[routeId];

        if (route.collateralToken == address(0)) {
            require(msg.value > 0, "No collateral provided");
            route.collateralToken = WETH;
        } else {
            require(msg.value == 0, "Unexpected ETH value");
            IERC20(route.collateralToken).safeTransferFrom(msg.sender, address(this), collateralAmount);
        }

        uint256 puppetAmount = _calculatePuppetAmount(collateralAmount, route.totalCollateralAmount, route.totalPuppetCollateralAmount);
        route.totalCollateralAmount = route.totalCollateralAmount + collateralAmount;
        route.totalPuppetCollateralAmount = route.totalPuppetCollateralAmount + puppetAmount;

        puppetOrchestrator.distributeCollateralIncrease(route.collateralToken, puppetAmount);
    }

    function _calculatePuppetAmount(uint256 collateralAmount, uint256 totalCollateral, uint256 totalPuppetCollateral) internal pure returns (uint256) {
        uint256 traderCollateral = totalCollateral.sub(totalPuppetCollateral);
        uint256 collateralRatio = collateralAmount.mul(1e18).div(traderCollateral);
        return totalPuppetCollateral.mul(collateralRatio).div(1e18);
    }

    function _distributeCollateralDecrease(address token, uint256 traderAmount, uint256 puppetAmount) internal {
        IERC20(token).safeTransfer(msg.sender, traderAmount);
        puppetOrchestrator.distributeCollateralDecrease(token, puppetAmount);
    }
}
