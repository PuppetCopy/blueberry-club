// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import "contracts/lab/mint/template/Airdrop.sol";

import {RolesAuthority} from "@rari-capital/solmate/src/auth/authorities/RolesAuthority.sol";

contract Deploy is Script {

    function run() public {
        
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.envAddress("DEPLOYER");
        
        vm.startBroadcast(deployerPrivateKey);

        address _randomizer = address(0x5b8bB80f2d72D0C85caB8fB169e8170A05C94bAF);
        RolesAuthority _rolesAuthority = RolesAuthority(0x575F40E8422EfA696108dAFD12cD8d6366982416);
        Airdrop _airdrop = new Airdrop(_rolesAuthority, _randomizer);

        console.log("------------------------------");
        console.log("Airdrop deployed at: ", address(_airdrop));
        console.log("Randomizer address: ", _randomizer);
        console.log("RolesAuthority address: ", address(_rolesAuthority));
        console.log("------------------------------");

        vm.stopBroadcast();
    }
}