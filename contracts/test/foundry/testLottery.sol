// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "test/foundry/BaseTest.sol";
import "contracts/lab/mint/template/Airdrop.sol";
import "test/foundry/utils/RandomizerMock.sol";

contract testAirdrop is BaseTest {

    // https://arbiscan.io/token/0x17f4BAa9D35Ee54fFbCb2608e20786473c7aa49f#readContract#F11
    address gbcOwner1 = address(0xa435530d50d7D17Fd9fc6E1c897Dbf7C08E12d35);
    address gbcOwner2 = address(0x7054cA242E23C8bf4E4a6f10F177E4342E60B1f1);

    Airdrop airdrop;
    RandomizerMock randomizerMock;

    function setUp() public {
        
        _setUp();   
        
        address _randomizer = address(0x5b8bB80f2d72D0C85caB8fB169e8170A05C94bAF);
        airdrop = new Airdrop(rolesAuthority, _randomizer);
        vm.deal(address(airdrop), 100 ether);

        vm.startPrank(owner);
        rolesAuthority.setUserRole(address(airdrop), 0, true);
        vm.stopPrank();
    }

    function testCorrectFlow() public {

        bytes32 _eventId = _createEvent();

        _participate(_eventId);

        _getRandomNumber(_eventId);

        _withdraw(_eventId);
    }

    function testWithdrawMulti() public {

        bytes32 _eventId = _createEvent();

        _participate(_eventId);

        _getRandomNumber(_eventId);

        _withdrawMulti(_eventId);
    }

    function testExecuteAirdropForWinnersAndRefundForLosers() public {

        bytes32 _eventId = _createEvent();

        _participate(_eventId);

        _getRandomNumber(_eventId);

        _executeAirdropForWinnersAndRefundForLosers(_eventId);
    }

    function testRefundOnFailedEvent() public {
        
        bytes32 _eventId = _createEvent();

        _participate(_eventId);

        _executeRefundAllOnFailedEvent(_eventId);
    }

    /********************************** Internal functions **********************************/

    function _createEvent() internal returns (bytes32 _eventId) {
        address _rewardToken = address(0xF4f935F4272e6FD9C779cF0036589A63b48d77A7);
        uint256 _rewardTokenId = 1;
        uint256 _supply = 100;
        uint256 _price = 0.1 ether;
        uint256 _endTime = block.timestamp + 1 days;

        vm.startPrank(alice);
        vm.expectRevert("UNAUTHORIZED");
        airdrop.createEvent(GBC, _rewardToken, _rewardTokenId, _supply, _price, _endTime);
        vm.stopPrank();

        vm.startPrank(owner);
        _eventId = airdrop.createEvent(GBC, _rewardToken, _rewardTokenId, _supply, _price, _endTime);
        vm.stopPrank();

        EventSettings memory _eventSettings = airdrop.getEventSettings(_eventId);
        
        assertEq(_eventSettings.markToken, GBC, "ERROR - _createEvent: E0");
        assertEq(_eventSettings.rewardToken, _rewardToken, "ERROR - _createEvent: E1");
        assertEq(_eventSettings.rewardTokenId, _rewardTokenId, "ERROR - _createEvent: E2");
        assertEq(_eventSettings.supply, _supply, "ERROR - _createEvent: E3");
        assertEq(_eventSettings.price, _price, "ERROR - _createEvent: E4");
        assertEq(_eventSettings.endTime, _endTime, "ERROR - _createEvent: E5");
        if (airdrop.getState(_eventId) != State.OPEN) revert("ERROR - _createEvent: E6");
    }

    function _participate(bytes32 _eventId) internal {
        uint256 _price = airdrop.getEventSettings(_eventId).price;
        uint256 _markTokenId1 = 1;
        uint256 _markTokenId2 = 2;

        vm.deal(gbcOwner1, _price);
        vm.startPrank(gbcOwner1);

        vm.expectRevert(IncorrectDepositAmount.selector);
        airdrop.participate(_eventId, _markTokenId1);

        airdrop.participate{value: _price}(_eventId, _markTokenId1);

        vm.deal(gbcOwner1, _price);
        vm.expectRevert(AlreadyParticipated.selector);
        airdrop.participate{value: _price}(_eventId, _markTokenId1);

        vm.stopPrank();

        assertEq(airdrop.getParticipants(_eventId).length, 1, "ERROR - _participate: E0");
        assertEq(airdrop.isParticipant(_eventId, gbcOwner1), true, "ERROR - _participate: E1");
        assertEq(airdrop.isMarked(_eventId, _markTokenId1), true, "ERROR - _participate: E2");

        vm.deal(gbcOwner2, _price);
        vm.startPrank(gbcOwner2);
        airdrop.participate{value: _price}(_eventId, _markTokenId2);
        vm.stopPrank();

        assertEq(airdrop.getParticipants(_eventId).length, 2, "ERROR - _participate: E3");
        assertEq(airdrop.isParticipant(_eventId, gbcOwner2), true, "ERROR - _participate: E4");
        assertEq(airdrop.isMarked(_eventId, _markTokenId2), true, "ERROR - _participate: E5");
    }

    function _getRandomNumber(bytes32 _eventId) internal {
        if (airdrop.getState(_eventId) == State.CLOSED) revert("ERROR - _getRandomNumber: E0");

        _fundRandomizer();

        vm.startPrank(owner);
        vm.expectRevert(EventNotClosed.selector);
        airdrop.getRandomNumber(_eventId);

        if (airdrop.getState(_eventId) != State.OPEN) revert("ERROR - _getRandomNumber: E0");
        skip(airdrop.getEventSettings(_eventId).endTime - block.timestamp);
        if (airdrop.getState(_eventId) != State.CLOSED) revert("ERROR - _getRandomNumber: E1");

        randomizerMock = new RandomizerMock();
        airdrop.updateRandomizer(address(randomizerMock));

        airdrop.getRandomNumber(_eventId);
        vm.stopPrank();

        if (airdrop.getState(_eventId) != State.DECIDED) revert("ERROR - _getRandomNumber: E2");
    }

    function _fundRandomizer() internal {
        vm.startPrank(owner);
        airdrop.fundRandomizer{value: 10 ether}();

        vm.expectRevert();
        airdrop.withdrawRandomizer(11 ether);

        airdrop.withdrawRandomizer(10 ether);

        airdrop.fundRandomizer{value: 1 ether}();
        vm.stopPrank();
    }

    function _withdraw(bytes32 _eventId) internal {
        if (airdrop.getState(_eventId) != State.DECIDED) revert("ERROR - _withdraw: E0");
 
        vm.startPrank(alice);
        vm.expectRevert(ParticipantNotInEvent.selector);
        airdrop.withdraw(_eventId, address(alice));
        vm.stopPrank();

        vm.startPrank(gbcOwner1);
        airdrop.withdraw(_eventId, address(gbcOwner1));

        vm.expectRevert(AlreadyWithdrawn.selector);
        airdrop.withdraw(_eventId, address(gbcOwner1));

        vm.stopPrank();

        vm.startPrank(gbcOwner2);
        airdrop.withdraw(_eventId, address(gbcOwner2));
        vm.stopPrank();
    }

    function _withdrawMulti(bytes32 _eventId) internal {
        if (airdrop.getState(_eventId) != State.DECIDED) revert("ERROR - _withdrawMulti: E0");

        address[] memory _participants = airdrop.getParticipants(_eventId);

        vm.startPrank(alice);
        airdrop.withdrawMulti(_eventId, _participants);
        vm.stopPrank();

        vm.startPrank(gbcOwner1);
        vm.expectRevert(AlreadyWithdrawn.selector);
        airdrop.withdraw(_eventId, address(gbcOwner2));
        vm.stopPrank();
    }

    function _executeAirdropForWinnersAndRefundForLosers(bytes32 _eventId) internal {
        if (airdrop.getState(_eventId) != State.DECIDED) revert("ERROR - _executeAirdropForWinnersAndRefundForLosers: E0");

        vm.startPrank(alice);
        airdrop.executeAirdropForWinnersAndRefundForLosers(_eventId);
        vm.stopPrank();

        vm.startPrank(gbcOwner1);
        vm.expectRevert(AlreadyWithdrawn.selector);
        airdrop.withdraw(_eventId, address(gbcOwner2));
        vm.stopPrank();
    }

    function _executeRefundAllOnFailedEvent(bytes32 _eventId) internal {
        if (airdrop.getState(_eventId) != State.OPEN) revert("ERROR - _executeRefundAllOnFailedEvent: E0");
        
        vm.startPrank(alice);
        vm.expectRevert(EventNotFailed.selector);
        airdrop.executeRefundAllOnFailedEvent(_eventId);
        vm.stopPrank();

        skip(airdrop.getEventSettings(_eventId).endTime - block.timestamp);
        if (airdrop.getState(_eventId) != State.CLOSED) revert("ERROR - _executeRefundAllOnFailedEvent: E1");
        
        vm.startPrank(alice);
        vm.expectRevert(EventNotFailed.selector);
        airdrop.executeRefundAllOnFailedEvent(_eventId);
        vm.stopPrank();
        
        skip(35 days);
        if (airdrop.getState(_eventId) != State.FAILED) revert("ERROR - _executeRefundAllOnFailedEvent: E2");

        uint256 _participate1Balance = address(gbcOwner1).balance;
        uint256 _participate2Balance = address(gbcOwner2).balance;
        
        vm.startPrank(alice);
        airdrop.executeRefundAllOnFailedEvent(_eventId);
        vm.stopPrank();

        vm.startPrank(gbcOwner1);
        vm.expectRevert(AlreadyWithdrawn.selector);
        airdrop.withdraw(_eventId, address(gbcOwner2));
        vm.stopPrank();

        assertTrue(address(gbcOwner1).balance > _participate1Balance, "ERROR - _executeRefundAllOnFailedEvent: E3");
        assertTrue(address(gbcOwner2).balance > _participate2Balance, "ERROR - _executeRefundAllOnFailedEvent: E4");
    }

    /********************************** Errors **********************************/

    error IncorrectDepositAmount();
    error AlreadyParticipated();
    error EventNotClosed();
    error ParticipantNotInEvent();
    error AlreadyWithdrawn();
    error EventNotFailed();
}