//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Wrapper} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Wrapper.sol";

import {Router} from "../core/Router.sol";


/**
 * This contract is an reward distributor example. It receive user
 * rewards and just give it to the user.
 *
 * To use this reward distributor you need to specify this contract
 * ethereum address when you stake your tokens
 */
contract BasicCollector is Ownable {

    ERC20Wrapper public WETH;
    Router public router;

    constructor(address _weth, address _router) {
        WETH = ERC20Wrapper(_weth);
        router = Router(_router);
    }

    function claim() external {
        uint256 claimable = router.claimable(_msgSender());
        router.claim(_msgSender(), claimable);
        WETH.withdrawTo(_msgSender(), claimable);
    }
}
