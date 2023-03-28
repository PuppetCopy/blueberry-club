// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "test/foundry/BaseTest.sol";

import "contracts/lab/mint/template/Lottery.sol";

import "test/foundry/utils/RandomizerMock.sol";

contract testLottery is BaseTest {

    // https://arbiscan.io/token/0x17f4BAa9D35Ee54fFbCb2608e20786473c7aa49f#readContract#F11
    address gbcOwner1 = address(0xa435530d50d7D17Fd9fc6E1c897Dbf7C08E12d35);
    address gbcOwner2 = address(0x7054cA242E23C8bf4E4a6f10F177E4342E60B1f1);

    Lottery lottery;
    RandomizerMock randomizerMock;

    function setUp() public {
        
        _setUp();   
        
        address _randomizer = address(0x5b8bB80f2d72D0C85caB8fB169e8170A05C94bAF);
        lottery = new Lottery(rolesAuthority, _randomizer);
        vm.deal(address(lottery), 100 ether);
    }

    function testCorrectFlow() public {

        bytes32 _eventId = _createEvent();

        _participate(_eventId);

        _getRandomNumber(_eventId);

        // 5. withdraw (withdraws from one user)
        // 6. withdrawMulti (withdraws from all users)
    }

    // function testFailedEvent() public {
    //     // event is failed when block.timestamp > _event.settings.endTime + 30 days
    //     // 1. createEvent
    //     // 2. participate
    //     // 3. getRandomNumber (call once event is CLOSED (block.timestamp > event.endTime))
    //     // 4. make sure randomizerCallback is being called
    //     // 5. withdraw (withdraws from one user)
    //     // 6. withdrawMulti (withdraws from all users) - SKIP THIS STAKE
    //     // 7. executeRefundAllOnFailedEvent
    // }

    /********************************** Internal functions **********************************/

    function _createEvent() internal returns (bytes32 _eventId) {
        address _rewardToken = address(0x864e4b0c28dF7E2f317FF339CebDB5224F47220e);
        uint256 _rewardTokenId = 1;
        uint256 _supply = 100;
        uint256 _price = 0.1 ether;
        uint256 _endTime = block.timestamp + 1 days;

        vm.startPrank(alice);
        vm.expectRevert("UNAUTHORIZED");
        lottery.createEvent(GBC, _rewardToken, _rewardTokenId, _supply, _price, _endTime);
        vm.stopPrank();

        vm.startPrank(owner);
        _eventId = lottery.createEvent(GBC, _rewardToken, _rewardTokenId, _supply, _price, _endTime);
        vm.stopPrank();

        EventSettings memory _eventSettings = lottery.getEventSettings(_eventId);
        
        assertEq(_eventSettings.markToken, GBC, "ERROR - _createEvent: E0");
        assertEq(_eventSettings.rewardToken, _rewardToken, "ERROR - _createEvent: E1");
        assertEq(_eventSettings.rewardTokenId, _rewardTokenId, "ERROR - _createEvent: E2");
        assertEq(_eventSettings.supply, _supply, "ERROR - _createEvent: E3");
        assertEq(_eventSettings.price, _price, "ERROR - _createEvent: E4");
        assertEq(_eventSettings.endTime, _endTime, "ERROR - _createEvent: E5");
        if (lottery.getState(_eventId) != State.OPEN) revert("ERROR - _createEvent: E6");
    }

    function _participate(bytes32 _eventId) internal {
        uint256 _price = lottery.getEventSettings(_eventId).price;
        uint256 _markTokenId1 = 1;
        uint256 _markTokenId2 = 2;

        vm.deal(gbcOwner1, _price);
        vm.startPrank(gbcOwner1);

        vm.expectRevert(IncorrectDepositAmount.selector);
        lottery.participate(_eventId, _markTokenId1);

        lottery.participate{value: _price}(_eventId, _markTokenId1);

        vm.deal(gbcOwner1, _price);
        vm.expectRevert(AlreadyParticipated.selector);
        lottery.participate{value: _price}(_eventId, _markTokenId1);

        vm.stopPrank();

        assertEq(lottery.getParticipants(_eventId).length, 1, "ERROR - _participate: E0");
        assertEq(lottery.isParticipant(_eventId, gbcOwner1), true, "ERROR - _participate: E1");
        assertEq(lottery.isMarked(_eventId, _markTokenId1), true, "ERROR - _participate: E2");

        vm.deal(gbcOwner2, _price);
        vm.startPrank(gbcOwner2);
        lottery.participate{value: _price}(_eventId, _markTokenId2);
        vm.stopPrank();

        assertEq(lottery.getParticipants(_eventId).length, 2, "ERROR - _participate: E3");
        assertEq(lottery.isParticipant(_eventId, gbcOwner2), true, "ERROR - _participate: E4");
        assertEq(lottery.isMarked(_eventId, _markTokenId2), true, "ERROR - _participate: E5");
    }

    function _getRandomNumber(bytes32 _eventId) internal {
        if (lottery.getState(_eventId) == State.CLOSED) revert("ERROR - _getRandomNumber: E0");

        _fundRandomizer();

        vm.startPrank(owner);
        vm.expectRevert(EventNotClosed.selector);
        lottery.getRandomNumber(_eventId);

        skip(lottery.getEventSettings(_eventId).endTime - block.timestamp);

        randomizerMock = new RandomizerMock();
        lottery.updateRandomizer(address(randomizerMock));
        
        lottery.getRandomNumber(_eventId);
        vm.stopPrank();

        if (lottery.getState(_eventId) != State.CLOSED) revert("ERROR - _getRandomNumber: E1");
    }

    function _fundRandomizer() internal {
        vm.startPrank(owner);
        lottery.fundRandomizer{value: 10 ether}();

        vm.expectRevert();
        lottery.withdrawRandomizer(11 ether);

        lottery.withdrawRandomizer(10 ether);

        lottery.fundRandomizer{value: 1 ether}();
        vm.stopPrank();
    }

    /********************************** Errors **********************************/

    error IncorrectDepositAmount();
    error AlreadyParticipated();
    error EventNotClosed();
}