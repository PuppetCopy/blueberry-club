// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "@rari-capital/solmate/src/auth/authorities/RolesAuthority.sol";

import "./utils/Addresses.sol";

contract BaseTest is Test, Addresses {

    address alice;
    address bob;
    address charlie;

    address owner = address(0x9E7f78EafAEBaf1094202FFA0835157fC5C3ADe0);

    uint256 arbitrumFork;

    RolesAuthority rolesAuthority = RolesAuthority(0x575F40E8422EfA696108dAFD12cD8d6366982416);
    
    function _setUp() internal {

        string memory ARBITRUM_RPC_URL = vm.envString("ARBITRUM_RPC_URL");
        arbitrumFork = vm.createFork(ARBITRUM_RPC_URL);
        vm.selectFork(arbitrumFork);

        alice = address(0xFa0C696bC56AE0d256D34a307c447E80bf92Dd41);
        bob = address(0x864e4b0c28dF7E2f317FF339CebDB5224F47220e);
        charlie = address(0xe81557e0a10f59b5FA9CE6d3e128b5667D847FBc);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
        vm.deal(owner, 100 ether);
    }
}