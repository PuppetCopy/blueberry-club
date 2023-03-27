// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Auth, Authority, RolesAuthority} from "@rari-capital/solmate/src/auth/authorities/RolesAuthority.sol";
import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {ReentrancyGuard} from "@rari-capital/solmate/src/utils/ReentrancyGuard.sol";

import {GBCLab} from "../../../lab/Lab.sol";
import {IRandomizer} from "./interfaces/IRandomizer.sol";

enum State {
    DOES_NOT_EXIST,
    OPEN,
    CLOSED,
    DECIDED,
    FAILED
}

struct LotteryEvent {
    EventSettings settings;
    BeforeEvent beforeEventData;
    AfterEvent afterEventData;
}

struct EventSettings {
    /// @notice The address of the ERC721 token that participants must mark to participate in the event
    address markToken;
    /// @notice The address of the ERC1155 token that will be distributed to winners
    address rewardToken;
    /// @notice The ID of the ERC1155 token that will be distributed to winners
    uint256 rewardTokenId;
    /// @notice The number of reward tokens to distribute in the event; also == number of winners
    uint256 supply;
    /// @notice The price in wei that a participant must pay to participate
    uint256 price;
    /// @notice The block.timestamp after which participants cannot participate
    uint256 endTime;
}
 
struct BeforeEvent {
    /// @notice An array of addresses of participants in the event
    address[] participantsArr;
    /// @notice 
    mapping(address => bool) participantsMap; // A mapping of participants to whether they have participated or not, so we can prevent someone from participating twice.
    /// @notice 
    mapping(uint256 => bool) marks; // A mapping of marked token IDs to track which tokens have been used for participation.
}

struct AfterEvent {
    /// @notice The ID of the randomizer request; used to prevent spamming randomizer requests
    uint256 randomizerId;
    /// @notice An array of winners of the event
    address[] winners;
    /// @notice A mapping of participants to whether they have withdrawn their deposit/reward or not
    mapping(address => bool) withdrawn;
}

contract Lottery is Auth, ReentrancyGuard {

    IRandomizer public randomizer;
    uint256 public randomizerCallbackGas = 2000000;

    mapping(uint256 => bytes32) public randomizerIdToEventsId;
    mapping(bytes32 => LotteryEvent) private events;

    /********************************** Constructor **********************************/

    constructor(RolesAuthority _authority, address _randomizerAddress) Auth(_authority.owner(), _authority) {
        randomizer = IRandomizer(_randomizerAddress);
    }

    /********************************** View functions **********************************/

    function getState(bytes32 eventId) public view returns (State) {
        LotteryEvent storage _event = events[eventId];

        if (_event.settings.endTime == 0) {
            return State.DOES_NOT_EXIST;
        } else {
            if (block.timestamp < _event.settings.endTime) {
                // New participants can still enter
                return State.OPEN;
            } else {
                // New participants can't enter
                if (_event.afterEventData.winners.length > 0) {
                    // randomizerCallback() called properly
                    return State.DECIDED;
                } else {
                    if (block.timestamp > _event.settings.endTime + 30 days) {
                        return State.FAILED;
                    } else {
                        return State.CLOSED;
                    }
                }
            }
        }
    }

    function getParticipants(bytes32 eventId) external view returns (address[] memory) {
        return events[eventId].beforeEventData.participantsArr;
    }

    function getWinners(bytes32 eventId) external view returns (address[] memory) {
        return events[eventId].afterEventData.winners;
    }

    function getEventSettings(bytes32 eventId) external view returns (EventSettings memory) {
        return events[eventId].settings;
    }

    /********************************** External functions **********************************/

    // function that allows the contract owner to create a new event with the given parameters
    function createEvent(address _markToken, address _rewardToken, uint256 _rewardTokenId, uint256 _supply, uint256 _price, uint256 _endTime) external requiresAuth nonReentrant {
        if (_supply <= 0) revert SupplyMustBeGreaterThanZero();
        if (_endTime <= block.timestamp) revert EndTimeMustBeInFuture();

        bytes32 _eventId = keccak256(abi.encodePacked(_markToken, _rewardToken, _rewardTokenId, _supply, _price, _endTime));

        EventSettings storage _eventSettings = events[_eventId].settings;
        if (getState(_eventId) != State.DOES_NOT_EXIST) revert EventAlreadyExists();

        _eventSettings.markToken = _markToken;
        _eventSettings.rewardToken = _rewardToken;
        _eventSettings.rewardTokenId = _rewardTokenId;
        _eventSettings.supply = _supply;
        _eventSettings.price = _price;
        _eventSettings.endTime = _endTime;

        emit EventCreation(_eventId, _markToken, _rewardToken, _rewardTokenId, _supply, _price, _endTime);
    }

    function participate(bytes32 _eventId, uint256 _markTokenId) external payable nonReentrant {
        LotteryEvent storage _event = events[_eventId];
        BeforeEvent storage _beforeEventData = _event.beforeEventData;

        if (getState(_eventId) != State.OPEN) revert EventNotActive();
        if (_event.settings.price != msg.value) revert IncorrectDepositAmount();
        if (ERC721(_event.settings.markToken).ownerOf(_markTokenId) != msg.sender) revert NotMarkOwner();
        if (_beforeEventData.participantsMap[msg.sender]) revert AlreadyParticipated();
        if (_beforeEventData.marks[_markTokenId]) revert MarkedTokenAlreadyUsed();

        _beforeEventData.participantsArr.push(msg.sender);
        _beforeEventData.participantsMap[msg.sender] = true;
        _beforeEventData.marks[_markTokenId] = true;

        emit Participation(_eventId, msg.sender, _markTokenId);
    }

    // can be poked by anyone to start the end process of the lottery
    function getRandomNumber(bytes32 _eventId) external nonReentrant {
        AfterEvent storage _afterEventData = events[_eventId].afterEventData;

        if (getState(_eventId) != State.CLOSED) revert EventNotClosed();
        if (_afterEventData.randomizerId != 0) revert RandomNumberAlreadyRequested();

        _afterEventData.randomizerId = randomizer.request(randomizerCallbackGas);
        randomizerIdToEventsId[_afterEventData.randomizerId] = _eventId;
    }

    // Callback function called by the randomizer contract when the random value is generated
    // Picks the winners
    function randomizerCallback(uint256 _id, bytes32 _value) external nonReentrant {
        if (msg.sender != address(randomizer)) revert CallerNotRandomizer();

        LotteryEvent storage _event = events[randomizerIdToEventsId[_id]];

        if (_event.afterEventData.randomizerId != _id) revert InvalidRandomizerId(); // overzealous check

        if (_event.settings.supply >= _event.beforeEventData.participantsArr.length) {
            // everyone is a winner
            _event.settings.supply = _event.beforeEventData.participantsArr.length;
            for (uint256 i = 0; i < _event.settings.supply; i++) {
                _event.afterEventData.winners.push(_event.beforeEventData.participantsArr[i]);
            }
        } else {
            // pick a winner from the participants array - i
            // move the winner to the start of the array
            for (uint256 i = 0; i < _event.settings.supply; i++) {
                // Use a cryptographic hash to generate a random index to select a winner from the participants array
                uint256 winnerIndex = (uint256(
                    keccak256(abi.encodePacked(uint256(_value), i))
                ) % (_event.beforeEventData.participantsArr.length - i)) + i;
                address winner = _event.beforeEventData.participantsArr[winnerIndex];
                _event.afterEventData.winners.push(winner);

                // swap the winner to the front of the array
                address iParticipant = _event.beforeEventData.participantsArr[i];
                _event.beforeEventData.participantsArr[i] = winner;
                _event.beforeEventData.participantsArr[winnerIndex] = iParticipant;
            }
        }
        // TODO - send value
        payable(owner).transfer(_event.settings.price * _event.settings.supply);
    }

    function withdraw(bytes32 _eventId, address _participant) external nonReentrant {
        _withdraw(_eventId, _participant);
    }

    /********************************** Convenience functions **********************************/

    function withdrawMulti(bytes32 _eventId, address[] calldata _participants) external nonReentrant {
        for (uint256 i = 0; i < _participants.length; i++) {
            _withdraw(_eventId, _participants[i]);
        }
    }

    // gas optimized version of withdrawMulti(winners)
    function executeAirdropForWinners(bytes32 _eventId) external nonReentrant {
        _executeAirdropForWinners(_eventId);
    }

    // gas optimized version of withdrawMulti(losers)
    function executeRefundForLosers(bytes32 _eventId) external nonReentrant {
        _executeRefundForLosers(_eventId);
    }

    // gas optimized version of withdrawMulti(winners) + withdrawMulti(losers)
    function executeAirdropForWinnersAndRefundForLosers(bytes32 _eventId) external nonReentrant {
        _executeAirdropForWinners(_eventId);
        _executeRefundForLosers(_eventId);
    }

    // gas optimized version of withdrawMulti(allParticipants) on failed event
    function executeRefundAllOnFailedEvent(bytes32 _eventId) external nonReentrant {
        if (getState(_eventId) != State.FAILED) revert EventNotFailed();

        LotteryEvent storage _event = events[_eventId];

        uint256 _participantsLength = _event.beforeEventData.participantsArr.length;
        // transfer the deposits back to everyone
        for (uint256 i = 0; i < _participantsLength; i++) {
            address participant = _event.beforeEventData.participantsArr[i];
            if (_event.afterEventData.withdrawn[participant]) {
                // loser might have already withdrawn before airdrop
                continue;
            } else {
                _event.afterEventData.withdrawn[participant] = true;
                _refund(_eventId, participant, _event.settings.price);
            }
        }
    }

    /********************************** Internal functions **********************************/

    function _refund(bytes32 _eventId, address _participant, uint256 _price) internal {
        // DANGER: VALIDATE LOSER BEFORE CALLING THIS FUNCTION
        if (_price > 0) {
            emit Withdrawal(_eventId, _participant);
            // explanation:
            // reentrancy guard is in place, no problem to send ETH here.
            // if the send fails, the transaction will revert and the state will be unchanged.
            // all other participants should still be able to withdraw
            // TODO - send value
            // slither-disable-next-line arbitrary-send
            bool success = payable(_participant).send(_price);
            require(success, "Failed to send refund");
        }
    }

    function _airdrop(bytes32 _eventId, address _winner, address _rewardToken, uint256 _rewardTokenId) internal {
        // DANGER: VALIDATE WINNER BEFORE CALLING THIS FUNCTION
        emit Withdrawal(_eventId, _winner);
        GBCLab(_rewardToken).mint(_winner, _rewardTokenId, 1, "");
    }

    function _withdraw(bytes32 _eventId, address _participant) internal {
        LotteryEvent storage _event = events[_eventId];

        if (!_event.beforeEventData.participantsMap[_participant]) revert ParticipantNotInEvent();
        if (_event.afterEventData.withdrawn[_participant]) revert AlreadyWithdrawn();

        _event.afterEventData.withdrawn[_participant] = true;

        if (getState(_eventId) == State.DECIDED) {
            // run through winners to see if participant is a winner
            for (uint256 i = 0; i < _event.settings.supply; i++) {
                if (_event.afterEventData.winners[i] == _participant) {
                    _airdrop(_eventId, _participant, _event.settings.rewardToken, _event.settings.rewardTokenId);
                    return;
                }
            }
            // if the code reached here, must be a loser
            _refund(_eventId, _participant, _event.settings.price);
        } else if (getState(_eventId) == State.FAILED) {
            /* === failsafe === */
            _refund(_eventId, _participant, _event.settings.price);
        } else {
            revert EventNotDecidedOrFailed();
        }
    }

    function _executeAirdropForWinners(bytes32 _eventId) internal {
        if (getState(_eventId) != State.DECIDED) revert EventNotDecided();

        LotteryEvent storage _event = events[_eventId];

        // transfer the reward tokens to the winners
        for (uint256 i = 0; i < _event.settings.supply; i++) {
            address winner = _event.afterEventData.winners[i];
            if (_event.afterEventData.withdrawn[winner]) {
                // winner might have already withdrawn before airdrop
                continue;
            } else {
                _event.afterEventData.withdrawn[winner] = true;
                _airdrop(_eventId, winner, _event.settings.rewardToken, _event.settings.rewardTokenId);
            }
        }
    }

    function _executeRefundForLosers(bytes32 _eventId) internal {
        if (getState(_eventId) != State.DECIDED) revert EventNotDecided();

        LotteryEvent storage _event = events[_eventId];

        // transfer the deposits back to the losers
        for (uint256 i = _event.settings.supply; i < _event.beforeEventData.participantsArr.length; i++) {
            address loser = _event.beforeEventData.participantsArr[i];
            if (_event.afterEventData.withdrawn[loser]) {
                // loser might have already withdrawn before airdrop
                continue;
            } else {
                _event.afterEventData.withdrawn[loser] = true;
                _refund(_eventId, loser, _event.settings.price);
            }
        }
    }

    /********************************** DAO Maintanance **********************************/

    function fundRandomizer() external payable nonReentrant {
        // TODO - send value
        randomizer.clientDeposit{value: msg.value}(address(this));
    }

    function withdrawRandomizer(uint256 _amount) external requiresAuth nonReentrant {
        randomizer.clientWithdrawTo(address(this), _amount);
        // TODO - send value
        payable(owner).transfer(_amount);
    }

    function updateRandomizerCallbackGas(uint256 _limit) external requiresAuth {
        randomizerCallbackGas = _limit;
    }

    function updateRandomizer(address _randomizer) external requiresAuth {
        randomizer = IRandomizer(_randomizer);
    }

    /********************************** Events **********************************/

    event Participation(
        bytes32 indexed eventId,
        address indexed participant,
        uint256 markTokenId
    );

    event EventCreation(
        bytes32 indexed eventId,
        address markToken,
        address rewardToken,
        uint256 rewardTokenId,
        uint256 supply,
        uint256 price,
        uint256 endTime
    );

    event Withdrawal(
        bytes32 indexed eventId,
        address indexed participant
    );

    /********************************** Errors **********************************/

    error SupplyMustBeGreaterThanZero();
    error EndTimeMustBeInFuture();
    error EventAlreadyExists();
    error EventNotActive();
    error IncorrectDepositAmount();
    error AlreadyParticipated();
    error NotMarkOwner();
    error MarkedTokenAlreadyUsed();
    error EventNotClosed();
    error RandomNumberAlreadyRequested();
    error CallerNotRandomizer();
    error InvalidRandomizerId();
    error EventNotFailed();
    error ParticipantNotInEvent();
    error AlreadyWithdrawn();
    error EventNotDecidedOrFailed();
    error EventNotDecided();
}