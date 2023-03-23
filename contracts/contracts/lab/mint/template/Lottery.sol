// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.17;

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {GBCLab} from "../../../lab/Lab.sol";
import {Auth, Authority, RolesAuthority} from "@rari-capital/solmate/src/auth/authorities/RolesAuthority.sol";
import {IRandomizer} from "./interfaces/IRandomizer.sol";
import {ReentrancyGuard} from "@rari-capital/solmate/src/utils/ReentrancyGuard.sol";

struct LotteryEvent {
    // static setting by admin
    address markToken; // The address of the ERC721 token that participants must mark to participate in the event.
    address rewardToken; // The address of the ERC1155 token that will be distributed to winners.
    uint256 rewardTokenId; // The ID of the ERC1155 token that will be distributed to winners.
    uint256 supply; // The number of reward tokens to distribute in the event; also == number of winners.
    uint256 price; // The price in wei that a participant must pay to participate.
    uint256 endTime; // The block.timestamp after which participants cannot participate.
    // dynamic data during event
    address[] participantsArr; // An array of addresses of participants in the event.
    mapping(address => bool) participantsMap; // A mapping of participants to whether they have participated or not, so we can prevent someone from participating twice.
    mapping(uint256 => bool) marks; // A mapping of marked token IDs to track which tokens have been used for participation.
    // data after event
    uint256 randomizerId; // The ID of the randomizer request; used to prevent spamming randomizer requests.
    address[] winners; // An array of winners of the event.
    mapping(address => bool) withdrawn; // A mapping of participants to whether they have withdrawn their deposit/reward or not.
}

enum State {
    DOES_NOT_EXIST,
    OPEN,
    CLOSED,
    DECIDED,
    FAILED
}



contract Lottery is Auth, ReentrancyGuard {
    IRandomizer public randomizer;
    uint256 public randomizerCallbackGas = 2000000;

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

    event Withdrawal(bytes32 indexed eventId, address indexed participant);

    mapping(bytes32 => LotteryEvent) public events;
    mapping(uint256 => bytes32) public randomizerIdToEventsId;

    constructor(RolesAuthority _authority, address _randomizerAddress) Auth(_authority.owner(), _authority) {
        randomizer = IRandomizer(_randomizerAddress);
    }

    // function that allows the contract owner to create a new event with the given parameters
    function createEvent(
        address _markToken,
        address _rewardToken,
        uint256 _rewardTokenId,
        uint256 _supply,
        uint256 _price,
        uint256 _endTime
    ) external requiresAuth {
        require(_supply > 0, "Event supply must be greater than zero.");
        require(
            _endTime > block.timestamp,
            "Event end time must be in the future."
        );

        bytes32 eventId = keccak256(
            abi.encodePacked(
                _markToken,
                _rewardToken,
                _rewardTokenId,
                _supply,
                _price,
                _endTime
            )
        );

        LotteryEvent storage ev = events[eventId];
        require(
            getState(eventId) == State.DOES_NOT_EXIST,
            "Event already exists."
        );

        ev.markToken = _markToken;
        ev.rewardToken = _rewardToken;
        ev.rewardTokenId = _rewardTokenId;
        ev.supply = _supply;
        ev.price = _price;
        ev.endTime = _endTime;

        emit EventCreation(
            eventId,
            _markToken,
            _rewardToken,
            _rewardTokenId,
            _supply,
            _price,
            _endTime
        );
    }

    function participate(bytes32 _eventId, uint256 _markTokenId)
        external
        payable
    {
        LotteryEvent storage ev = events[_eventId];

        require(getState(_eventId) == State.OPEN, "Event is not active.");

        require(
            ev.price == msg.value,
            "Incorrect deposit amount. Please provide the correct deposit amount."
        );

        require(
            !ev.participantsMap[msg.sender],
            "You have already participated in this event."
        );

        require(
            ERC721(ev.markToken).ownerOf(_markTokenId) == msg.sender,
            "You do not own the marked token."
        );
        require(
            !ev.marks[_markTokenId],
            "Marked token has already been used to participate in this event."
        );

        ev.participantsArr.push(msg.sender);
        ev.participantsMap[msg.sender] = true;
        ev.marks[_markTokenId] = true;

        emit Participation(_eventId, msg.sender, _markTokenId);
    }

    // can be poked by anyone to start the end process of the lottery
    function getRandomNumber(bytes32 _eventId) external nonReentrant {
        LotteryEvent storage ev = events[_eventId];
        require(getState(_eventId) == State.CLOSED, "Event is not closed.");
        require(ev.randomizerId == 0, "Already requested random nubmer"); // so we can only execute once per event, else could be drained in an attack

        ev.randomizerId = randomizer.request(randomizerCallbackGas);
        randomizerIdToEventsId[ev.randomizerId] = _eventId;
    }

    // Callback function called by the randomizer contract when the random value is generated
    // Picks the winners
    function randomizerCallback(uint256 _id, bytes32 _value)
        external
        nonReentrant
    {
        require(msg.sender == address(randomizer), "Caller not Randomizer");
        bytes32 eventId = randomizerIdToEventsId[_id];
        LotteryEvent storage ev = events[eventId];
        require(ev.randomizerId == _id, "Invalid randomizer id"); // overzealous check

        uint256 randomNumber = uint256(_value);

        if (ev.supply >= ev.participantsArr.length) {
            // everyone is a winner
            ev.supply = ev.participantsArr.length;
            for (uint256 i = 0; i < ev.supply; i++) {
                ev.winners.push(ev.participantsArr[i]);
            }
        } else {
            // pick a winner from the participants array - i
            // move the winner to the start of the array
            for (uint256 i = 0; i < ev.supply; i++) {
                // Use a cryptographic hash to generate a random index to select a winner from the participants array.
                uint256 winnerIndex = (uint256(
                    keccak256(abi.encodePacked(randomNumber, i))
                ) % (ev.participantsArr.length - i)) + i;
                address winner = ev.participantsArr[winnerIndex];
                ev.winners.push(winner);

                // swap the winner to the front of the array
                address iParticipant = ev.participantsArr[i];
                ev.participantsArr[i] = winner;
                ev.participantsArr[winnerIndex] = iParticipant;
            }
        }

        payable(owner).transfer(ev.price * ev.supply);
    }

    function withdraw(bytes32 _eventId, address _participant)
        external
        nonReentrant
    {
        _withdraw(_eventId, _participant);
    }

    function getState(bytes32 eventId) public view returns (State) {
        LotteryEvent storage ev = events[eventId];

        if (ev.endTime == 0) {
            return State.DOES_NOT_EXIST;
        } else {
            if (block.timestamp < ev.endTime) {
                // New participants can still enter
                return State.OPEN;
            } else {
                // New participants can't enter
                if (ev.winners.length > 0) {
                    // randomizerCallback() called properly
                    return State.DECIDED;
                } else {
                    if (block.timestamp > ev.endTime + 30 days) {
                        return State.FAILED;
                    } else {
                        return State.CLOSED;
                    }
                }
            }
        }
    }

    /* -------------- Events getter functions for frontend -------------- */

    function getParticipants(bytes32 eventId)
        external
        view
        returns (address[] memory)
    {
        return events[eventId].participantsArr;
    }

    function getWinners(bytes32 eventId)
        external
        view
        returns (address[] memory)
    {
        return events[eventId].winners;
    }

    /* -------------- Convenience functions -------------- */

    function withdrawMulti(bytes32 _eventId, address[] calldata _participants)
        external
        nonReentrant
    {
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
    function executeAirdropForWinnersAndRefundForLosers(bytes32 _eventId)
        external
        nonReentrant
    {
        _executeAirdropForWinners(_eventId);
        _executeRefundForLosers(_eventId);
    }

    // gas optimized version of withdrawMulti(allParticipants) on failed event
    function executeRefundAllOnFailedEvent(bytes32 _eventId)
        external
        nonReentrant
    {
        require(getState(_eventId) == State.FAILED, "State != Failed");

        LotteryEvent storage ev = events[_eventId];

        // transfer the deposits back to everyone
        for (uint256 i = 0; i < ev.participantsArr.length; i++) {
            address participant = ev.participantsArr[i];
            if (ev.withdrawn[participant]) {
                // loser might have already withdrawn before airdrop
                continue;
            } else {
                ev.withdrawn[participant] = true;
                _refund(_eventId, participant, ev.price);
            }
        }
    }

    /* -------------- Internal functions -------------- */

    function _refund(
        bytes32 _eventId,
        address _participant,
        uint256 _price
    ) internal {
        // DANGER: VALIDATE LOSER BEFORE CALLING THIS FUNCTION
        if (_price > 0) {
            emit Withdrawal(_eventId, _participant);
            // explanation:
            // reentrancy guard is in place, no problem to send ETH here.
            // if the send fails, the transaction will revert and the state will be unchanged.
            // all other participants should still be able to withdraw
            // slither-disable-next-line arbitrary-send
            bool success = payable(_participant).send(_price);
            require(success, "Failed to send refund");
        }
    }

    function _airdrop(
        bytes32 _eventId,
        address _winner,
        address _rewardToken,
        uint256 _rewardTokenId
    ) internal {
        // DANGER: VALIDATE WINNER BEFORE CALLING THIS FUNCTION
        emit Withdrawal(_eventId, _winner);
        GBCLab(_rewardToken).mint(_winner, _rewardTokenId, 1, "");
    }

    function _withdraw(bytes32 _eventId, address _participant) internal {
        LotteryEvent storage ev = events[_eventId];

        require(
            ev.participantsMap[_participant],
            "participant not in this event."
        );

        require(!ev.withdrawn[_participant], "Already withdrawn.");

        ev.withdrawn[_participant] = true;

        if (getState(_eventId) == State.DECIDED) {
            // run through winners to see if participant is a winner
            for (uint256 i = 0; i < ev.supply; i++) {
                if (ev.winners[i] == _participant) {
                    _airdrop(
                        _eventId,
                        _participant,
                        ev.rewardToken,
                        ev.rewardTokenId
                    );
                    return;
                }
            }

            // if the code reached here, must be a loser
            _refund(_eventId, _participant, ev.price);
        } else if (getState(_eventId) == State.FAILED) {
            /* === failsafe === */
            _refund(_eventId, _participant, ev.price);
        } else {
            revert("Event not yet decided / failed");
        }
    }

    function _executeAirdropForWinners(bytes32 _eventId) internal {
        require(getState(_eventId) == State.DECIDED, "State != Decided");

        LotteryEvent storage ev = events[_eventId];

        // transfer the reward tokens to the winners
        for (uint256 i = 0; i < ev.supply; i++) {
            address winner = ev.winners[i];
            if (ev.withdrawn[winner]) {
                // winner might have already withdrawn before airdrop
                continue;
            } else {
                ev.withdrawn[winner] = true;
                _airdrop(_eventId, winner, ev.rewardToken, ev.rewardTokenId);
            }
        }
    }

    function _executeRefundForLosers(bytes32 _eventId) internal {
        require(getState(_eventId) == State.DECIDED, "State != Decided");

        LotteryEvent storage ev = events[_eventId];

        // transfer the deposits back to the losers
        for (uint256 i = ev.supply; i < ev.participantsArr.length; i++) {
            address loser = ev.participantsArr[i];
            if (ev.withdrawn[loser]) {
                // loser might have already withdrawn before airdrop
                continue;
            } else {
                ev.withdrawn[loser] = true;
                _refund(_eventId, loser, ev.price);
            }
        }
    }


    // ----------- DAO Maintanance ------------ //
    function fundRandomizer() external payable nonReentrant {
        randomizer.clientDeposit{value: msg.value}(address(this));
    }

    function withdrawRandomizer(uint256 amount)
        external
        requiresAuth
        nonReentrant
    {
        
        randomizer.clientWithdrawTo(address(this), amount);
        payable(owner).transfer(amount);
    }

    function modifyRandomizerCallbackGas(uint256 newLimit)
        external
        requiresAuth
    {
        randomizerCallbackGas = newLimit;
    }


    function changeRandomizerAddr(address newAddr) external requiresAuth {
        randomizer = IRandomizer(newAddr);
    }


}