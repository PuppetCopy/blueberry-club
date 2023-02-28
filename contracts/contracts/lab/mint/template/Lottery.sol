// // SPDX-License-Identifier: Unlicense
// pragma solidity ^0.8.17;

// import {ERC1155} from "@rari-capital/solmate/src/tokens/ERC1155.sol";
// import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
// import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";
// import {ReentrancyGuard} from "@rari-capital/solmate/src/utils/ReentrancyGuard.sol";
// import {RrpRequesterV0} from "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";
// import {RandomUintProvider} from "../../services/RandomUintProvider.sol";


// struct Sale {
//     uint supply; // The number of winners to be selected in the lottery.
//     uint participantCount; // The current number of participants in the sale.
//     uint price; // The price in wei that a participant must pay to participate.
//     uint endTime; // The Unix timestamp after which participants cannot participate.
//     address[] participants; // An array of addresses of participants in the sale.
//     mapping(uint => bool) stake; // A mapping of staked token IDs to track which tokens have been used for participation.
// }


// contract SaleLottery is Auth, ReentrancyGuard {
//     ERC721 public immutable stake;
//     ERC1155 public immutable reward;

//     mapping(uint => Sale) public sales;

//     event Participate(
//         address indexed participant,
//         uint rewardTokenId,
//         uint stakeTokenId,
//         uint price
//     );

//     event Distribute(
//         address[] winners,
//         uint tokenId
//     );

//     event SaleCreated(
//         uint indexed rewardTokenId,
//         uint supply,
//         uint price,
//         uint endTime
//     );

//     RandomUintProvider private immutable randomUintProvider;

//     constructor(
//         Authority _authority,
//         ERC721 _stakedToken,
//         ERC1155 _rewardToken,
//         RandomUintProvider _randomUnitProvider
//     ) Auth(address(0), _authority) {
//         stake = _stakedToken;
//         reward = _rewardToken;
//     }

//     function participate(uint _rewardTokenId, uint _stakeTokenId) external payable {
//         Sale storage sale = sales[_rewardTokenId];

//         require(sale.endTime != 0, "Sale does not exist.");
//         require(sale.endTime < block.timestamp, "Sale has ended.");
//         require(sale.price == msg.value, "Incorrect deposit amount. Please provide the correct deposit amount.");

//         require(stake.ownerOf(_stakeTokenId) == msg.sender, "You do not own the staked token.");
//         require(!sale.stake[_stakeTokenId], "Staked token has already been used to participate in this sale.");

//         sale.participantCount++;
//         sale.participants.push(msg.sender);
//         sale.stake[_stakeTokenId] = true;

//         emit Participate(msg.sender, _rewardTokenId, _stakeTokenId, msg.value);
//     }

//     // function that allows the contract owner to create a new sale with the given parameters
//     function createSale(
//         uint256 _rewardTokenId,
//         uint256 _supply,
//         uint256 _price,
//         uint256 _endTime
//     ) external requiresAuth {
//         require(_supply > 0, "Sale supply must be greater than zero.");
//         require(_price > 0, "Sale price must be greater than zero.");
//         require(_endTime > block.timestamp, "Sale end time must be in the future.");

//         Sale storage sale = sales[_rewardTokenId];
//         require(sale.endTime == 0, "Sale already exists.");

//         sale.supply = _supply;
//         sale.price = _price;
//         sale.endTime = _endTime;

//         emit SaleCreated(_rewardTokenId, _supply, _price, _endTime);
//     }

//     // Selects random winners from a pool of participants who have staked their ERC721 token, distributes a reward token to the winners. Refunds the participants who did not win the lottery if a deposit was required.
//     function scheduleAirdrop(uint _rewardTokenId) external {
//         Sale storage sale = sales[_rewardTokenId];

//         unit memory requestId = randomUintProvider.requestRandomUint(this.executeAirdrop);
//         // unit memory requestId = randomUintProvider.requestRandomUint(address(this), _rewardTokenId);

//         require(block.timestamp > sale.endTime, "Airdrop period has not yet started.");
//     }


//     function executeAirdrop(uint _rewardTokenId) external {
//         address[] memory distList = new address[](sale.supply);

//         address lastWinner = address(0); // set initial value to 0 address
//         uint winnerCount = 0;

//         for (uint256 i = 0; i < sale.supply; i++) {
//             // Use a cryptographic hash to generate a random index to select a winner from the participants array.
//             uint winnerIndex = uint(keccak256(abi.encodePacked(block.timestamp, winnerCount, lastWinner, sale.participantCount))) % winnerCount;
//             address winner = sale.participants[winnerIndex];

//             lastWinner = winner;
//             winnerCount++;
//             distList[i] = winner;

//             // Move the winner to the beginning of the participants array by swapping their position with the participant at the current index.
//             address iParticipant = sale.participants[i];
//             sale.participants[i] = winner;
//             sale.participants[winnerIndex] = iParticipant;

//             reward.safeTransferFrom(address(this), winner, _rewardTokenId, 1, "");
//         }

//         if (sale.price > 0) {
//             for (uint256 i = sale.supply - 1; i < sale.participantCount; i++) {
//                 address participant = sale.participants[i];

//                 uint256 totalFunds = sale.price * sale.participantCount;
//                 uint256 nonWinnerFunds = totalFunds - (sale.price * winnerCount);

//                 uint256 refundAmount = nonWinnerFunds / sale.price;
//                 bool success = payable(participant).send(refundAmount);
//                 require(success, "Failed to send refund");
//             }
//         }

//         emit Distribute(distList, _rewardTokenId);

//         delete sales[_rewardTokenId];
//     }

//     // Allows participants to withdraw their deposit if API3 QRNG fails to generate randomness within 30 days after the sale has ended.
//     // Participants can only withdraw their deposit once, and only if a deposit was required for the sale.
//     function withdraw(uint _rewardTokenId) external nonReentrant {
//         Sale storage sale = sales[_rewardTokenId];

//         require(sale.endTime != 0, "Sale does not exist.");
//         require(block.timestamp > sale.endTime + 30 days, "Withdrawal period has not yet started.");
//         require(sale.price > 0, "Sale did not require a deposit.");
//         require(sale.stake[_rewardTokenId], "Token already withdrawn.");

//         sale.stake[_rewardTokenId] = false;
//         bool success = payable(msg.sender).send(sale.price);
//         require(success, "Failed to send refund");
//     }

// }
