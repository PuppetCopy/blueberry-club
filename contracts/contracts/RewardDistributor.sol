// SPDX-License-Identifier: AGPL-3.0
// cloned and modified from https://github.com/ZeframLou/playpen/blob/main/src/ERC721StakingPool.sol
pragma solidity ^0.8.4;

import {Clone} from "clones-with-immutable-args/Clone.sol";

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";
import {ERC721, ERC721TokenReceiver} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

import {Ownable} from "./utils/Ownable.sol";
import {FullMath} from "./utils/FullMath.sol";

contract RewardDistributor is Ownable, Clone, ERC721TokenReceiver {

    using SafeTransferLib for ERC20;


    error Error_ZeroOwner();
    error Error_AlreadyInitialized();
    error Error_NotRewardDistributor();
    error Error_AmountTooLarge();
    error Error_NotTokenOwner();
    error Error_NotStakeToken();


    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256[] idList);
    event Withdrawn(address indexed user, uint256[] idList);
    event RewardPaid(address indexed user, uint256 reward);


    uint256 internal constant PRECISION = 1e30;
    address internal constant BURN_ADDRESS = address(0xdead);


    /// @notice The last Unix timestamp (in seconds) when rewardPerTokenStored was updated
    uint64 public lastUpdateTime;
    /// @notice The Unix timestamp (in seconds) at which the current reward period ends
    uint64 public periodFinish;

    /// @notice The per-second rate at which rewardPerToken increases
    uint256 public rewardRate;
    /// @notice The last stored rewardPerToken value
    uint256 public rewardPerTokenStored;
    /// @notice The total tokens staked in the pool
    uint256 public totalSupply;

    /// @notice Tracks if an address can call notifyReward()
    mapping(address => bool) public isRewardDistributor;

    /// @notice Tracks if an address can call claim()
    mapping(address => bool) public isRewardReceiver;
    /// @notice The owner of a staked ERC721 token
    mapping(uint256 => address) public ownerOf;

    /// @notice The amount of tokens staked by an account
    mapping(address => uint256) public balanceOf;
    /// @notice The rewardPerToken value when an account last staked/withdrew/withdrew rewards
    mapping(address => uint256) public userRewardPerTokenPaid;
    /// @notice The earned() value when an account last staked/withdrew/withdrew rewards
    mapping(address => uint256) public rewards;


    function rewardToken() public pure returns (ERC20 rewardToken_) {
        return ERC20(_getArgAddress(0));
    }

    function stakeToken() public pure returns (ERC721 stakeToken_) {
        return ERC721(_getArgAddress(0x14));
    }

    function DURATION() public pure returns (uint64 DURATION_) {
        return _getArgUint64(0x28);
    }

    function initialize(address initialOwner) external {
        if (owner() != address(0)) {
            revert Error_AlreadyInitialized();
        }
        if (initialOwner == address(0)) {
            revert Error_ZeroOwner();
        }

        _transferOwnership(initialOwner);
    }

    function stake(uint256[] calldata idList) external {
        if (idList.length == 0) {
            return;
        }

        uint256 accountBalance = balanceOf[msg.sender];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalSupply;
        uint256 rewardPerToken_ = _rewardPerToken(totalSupply_, lastTimeRewardApplicable_, rewardRate);

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        rewards[msg.sender] = _earned(
            msg.sender,
            accountBalance,
            rewardPerToken_,
            rewards[msg.sender]
        );
        userRewardPerTokenPaid[msg.sender] = rewardPerToken_;

        // stake
        totalSupply = totalSupply_ + idList.length;
        balanceOf[msg.sender] = accountBalance + idList.length;
        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                ownerOf[idList[i]] = msg.sender;
            }
        }

        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                stakeToken().safeTransferFrom(msg.sender, address(this), idList[i]);
            }
        }

        emit Staked(msg.sender, idList);
    }

    function unStake(uint256[] calldata idList) external {

        if (idList.length == 0) {
            return;
        }

        uint256 accountBalance = balanceOf[msg.sender];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalSupply;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        rewards[msg.sender] = _earned(msg.sender, accountBalance, rewardPerToken_, rewards[msg.sender]);
        userRewardPerTokenPaid[msg.sender] = rewardPerToken_;

        // withdraw stake
        balanceOf[msg.sender] = accountBalance - idList.length;
        // total supply has 1:1 relationship with staked amounts
        // so can't ever underflow
        unchecked {
            totalSupply = totalSupply_ - idList.length;
            for (uint256 i = 0; i < idList.length; i++) {
                // verify ownership
                address tokenOwner = ownerOf[idList[i]];
                if (tokenOwner != msg.sender || tokenOwner == BURN_ADDRESS) {
                    revert Error_NotTokenOwner();
                }

                // keep the storage slot dirty to save gas
                // if someone else stakes the same token again
                ownerOf[idList[i]] = BURN_ADDRESS;
            }
        }

        /// -----------------------------------------------------------------------
        /// Effects
        /// -----------------------------------------------------------------------

        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                stakeToken().safeTransferFrom(
                    address(this),
                    msg.sender,
                    idList[i]
                );
            }
        }

        emit Withdrawn(msg.sender, idList);
    }




    function lastTimeRewardApplicable() public view returns (uint64) {
        return block.timestamp < periodFinish
                ? uint64(block.timestamp)
                : periodFinish;
    }

    function rewardPerToken() external view returns (uint256) {
        return _rewardPerToken(
            totalSupply,
            lastTimeRewardApplicable(),
            rewardRate
        );
    }

    function earned(address account) external view returns (uint256) {
        return _earned(
                account,
                balanceOf[account],
                _rewardPerToken(
                    totalSupply,
                    lastTimeRewardApplicable(),
                    rewardRate
                ),
                rewards[account]
            );
    }



    function exit(uint256[] calldata idList) external {

        if (idList.length == 0) {
            return;
        }

        uint256 accountBalance = balanceOf[msg.sender];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalSupply;
        uint256 rewardPerToken_ = _rewardPerToken(totalSupply_, lastTimeRewardApplicable_, rewardRate);

        // give rewards
        uint256 reward = _earned(msg.sender, accountBalance, rewardPerToken_, rewards[msg.sender]);
        if (reward > 0) {
            rewards[msg.sender] = 0;
        }

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        userRewardPerTokenPaid[msg.sender] = rewardPerToken_;

        // withdraw stake
        balanceOf[msg.sender] = accountBalance - idList.length;
        // total supply has 1:1 relationship with staked amounts
        // so can't ever underflow
        unchecked {
            totalSupply = totalSupply_ - idList.length;
            for (uint256 i = 0; i < idList.length; i++) {
                // verify ownership
                address tokenOwner = ownerOf[idList[i]];
                if (tokenOwner != msg.sender || tokenOwner == BURN_ADDRESS) {
                    revert Error_NotTokenOwner();
                }

                // keep the storage slot dirty to save gas
                // if someone else stakes the same token again
                ownerOf[idList[i]] = BURN_ADDRESS;
            }
        }

        /// -----------------------------------------------------------------------
        /// Effects
        /// -----------------------------------------------------------------------

        // transfer stake
        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                stakeToken().safeTransferFrom(
                    address(this),
                    msg.sender,
                    idList[i]
                );
            }
        }
        emit Withdrawn(msg.sender, idList);

        // transfer rewards
        if (reward > 0) {
            rewardToken().safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function claim() external {
        uint256 accountBalance = balanceOf[msg.sender];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalSupply;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );


        uint256 reward = _earned(
            msg.sender,
            accountBalance,
            rewardPerToken_,
            rewards[msg.sender]
        );

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        userRewardPerTokenPaid[msg.sender] = rewardPerToken_;

        // withdraw rewards
        if (reward > 0) {
            rewards[msg.sender] = 0;

            rewardToken().safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /// @notice Lets a reward distributor start a new reward period. The reward tokens must have already
    /// been transferred to this contract before calling this function. If it is called
    /// when a reward period is still active, a new reward period will begin from the time
    /// of calling this function, using the leftover rewards from the old reward period plus
    /// the newly sent rewards as the reward.
    /// @dev If the reward amount will cause an overflow when computing rewardPerToken, then
    /// this function will revert.
    /// @param reward The amount of reward tokens to use in the new reward period.
    function notifyRewardAmount(uint256 reward) external {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if (reward == 0) {
            return;
        }
        if (!isRewardDistributor[msg.sender]) {
            revert Error_NotRewardDistributor();
        }

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        uint256 rewardRate_ = rewardRate;
        uint64 periodFinish_ = periodFinish;
        uint64 lastTimeRewardApplicable_ = block.timestamp < periodFinish_
            ? uint64(block.timestamp)
            : periodFinish_;
        uint64 DURATION_ = DURATION();
        uint256 totalSupply_ = totalSupply;

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        // accrue rewards
        rewardPerTokenStored = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate_
        );
        lastUpdateTime = lastTimeRewardApplicable_;

        // record new reward
        uint256 newRewardRate;
        if (block.timestamp >= periodFinish_) {
            newRewardRate = reward / DURATION_;
        } else {
            uint256 remaining = periodFinish_ - block.timestamp;
            uint256 leftover = remaining * rewardRate_;
            newRewardRate = (reward + leftover) / DURATION_;
        }
        // prevent overflow when computing rewardPerToken
        if (newRewardRate >= ((type(uint256).max / PRECISION) / DURATION_)) {
            revert Error_AmountTooLarge();
        }
        rewardRate = newRewardRate;
        lastUpdateTime = uint64(block.timestamp);
        periodFinish = uint64(block.timestamp + DURATION_);

        emit RewardAdded(reward);
    }


    function setRewardDistributor(
        address rewardDistributor,
        bool isRewardDistributor_
    ) external onlyOwner {
        isRewardDistributor[rewardDistributor] = isRewardDistributor_;
    }

    function setRewardReceiver(
        address rewardReceiver,
        bool isRewardReceiver_
    ) external onlyOwner {
        isRewardReceiver[rewardReceiver] = isRewardReceiver_;
    }


    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external view override returns (bytes4) {
        if (msg.sender != address(stakeToken())) {
            revert Error_NotStakeToken();
        }
        return this.onERC721Received.selector;
    }

    function _earned(
        address account,
        uint256 accountBalance,
        uint256 rewardPerToken_,
        uint256 accountRewards
    ) internal view returns (uint256) {
        return FullMath.mulDiv(
            accountBalance,
            rewardPerToken_ - userRewardPerTokenPaid[account],
            PRECISION
        ) + accountRewards;
    }

    function _rewardPerToken(
        uint256 totalSupply_,
        uint256 lastTimeRewardApplicable_,
        uint256 rewardRate_
    ) internal view returns (uint256) {
        if (totalSupply_ == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + FullMath.mulDiv(
            (lastTimeRewardApplicable_ - lastUpdateTime) * PRECISION,
            rewardRate_,
            totalSupply_
        );
    }

    function _getImmutableVariablesOffset() internal pure returns (uint256 offset) {
        assembly {
            offset := sub(
                calldatasize(),
                add(shr(240, calldataload(sub(calldatasize(), 2))), 2)
            )
        }
    }
}