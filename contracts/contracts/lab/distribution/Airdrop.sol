//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";
import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";

error InvalidDeposit();
error InvalidRescueAmount();

error NotOwner();

/**
 * @title Aridrop
 * @author IrvingDevPro
 * @notice Let the owner distribute tokens or natives to holders of a collection
 */
contract Airdrop is Auth {
    using SafeTransferLib for ERC20;

    uint256 private constant NFT_SUPPLY = 10000;

    ERC721 public immutable GBC;

    /// @notice Track the total amount deposited at specifique epoch for a token
    mapping(address => mapping(uint256 => uint256)) private deposits;

    /// @notice Track the total amount claimed at specifique epoch for a token
    mapping(address => mapping(uint256 => uint256)) public epochTotalClaimed;

    /// @notice Track the claimed by an NFT
    mapping(uint256 => mapping(uint256 => uint256)) public epochClaimed;

    uint256 public actualEpoch = 0;

    constructor(address _owner, ERC721 _gbc)
        Auth(_owner, Authority(address(0)))
    {
        GBC = _gbc;
    }

    function epochDeposit(address token, uint256 epoch)
        external
        view
        returns (uint256 deposited)
    {
        uint256 actual = deposits[token][epoch];
        deposited = actual;
        while (epoch > 0 && actual > 0) {
            epoch--;
            actual = deposits[token][epoch];
            deposited += actual;
        }
    }

    function claim(
        address owner,
        address receiver,
        address token,
        uint256[] memory tokensId
    ) external requiresAuth returns (uint256 claimable) {
        uint256 epoch = actualEpoch;
        uint256 deposited = _deposit(token, epoch);
        uint256 rewardPerToken = deposited / NFT_SUPPLY;

        uint256 amount = tokensId.length;

        uint256 claimed;

        for (uint256 i = 0; i < amount; ) {
            uint256 id = tokensId[i];
            if (GBC.ownerOf(id) != owner) revert NotOwner();

            claimed += epochClaimed[id][epoch];
            epochClaimed[id][epoch] = rewardPerToken;

            unchecked {
                i++;
            }
        }

        claimable = amount * rewardPerToken - claimed;

        epochTotalClaimed[token][epoch] += claimable;

        if (token == address(0)) {
            payable(receiver).transfer(claimable);
        } else {
            ERC20(token).safeTransfer(receiver, claimable);
        }
    }

    function rescue(
        ERC20 token,
        address to,
        uint256 amount
    ) external requiresAuth {
        uint256 rest = token.balanceOf(address(this));
        uint256 epoch = actualEpoch;
        rest += epochTotalClaimed[address(token)][epoch];
        rest -= _deposit(address(token), epoch);
        if (amount > rest) revert InvalidRescueAmount();
        token.transfer(to, amount);
    }

    function deposit(address token, uint256 amount)
        external
        payable
        requiresAuth
    {
        if (token == address(0)) {
            if (msg.value != amount) revert InvalidDeposit();
        } else {
            ERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        uint256 epoch = actualEpoch;
        deposits[token][epoch] += amount;
    }

    function nextEpoch() external requiresAuth {
        actualEpoch++;
    }

    function _deposit(address token, uint256 epoch)
        internal
        returns (uint256 deposited)
    {
        uint256 epoch_ = epoch;
        uint256 actual = deposits[token][epoch];
        deposited = actual;
        while (epoch > 0 && actual > 0) {
            epoch--;
            actual = deposits[token][epoch];
            delete deposits[token][epoch];
            deposited += actual;
        }

        if (deposited > actual) {
            deposits[token][epoch_] = deposited;
        }
    }
}
