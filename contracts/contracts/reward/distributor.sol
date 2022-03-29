//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


import {ERC20} from "../libs/solmate/ERC20.sol";
import {ERC721, ERC721TokenReceiver} from "../libs/solmate/ERC721.sol";
import {SafeTransferLib} from "../libs/solmate/SafeTransferLib.sol";

import {Ownable} from "../libs/Ownable.sol";
import {FullMath} from "../libs/FullMath.sol";

contract RewardDistributor is Ownable, ERC721TokenReceiver {
    /// -----------------------------------------------------------------------
    /// Library usage
    /// -----------------------------------------------------------------------

    using SafeTransferLib for ERC20;

    /// -----------------------------------------------------------------------
    /// Errors
    /// -----------------------------------------------------------------------

    error Error_ZeroOwner();
    error Error_AlreadyInitialized();
    error Error_NotRewardDistributor();
    error Error_AmountTooLarge();
    error Error_NotTokenOwner();
    error Error_NotStakeToken();
    error Error_NotApproved();

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256[] idList);
    event Withdrawn(address indexed user, uint256[] idList);
    event RewardPaid(address indexed user, uint256 reward);

    /// -----------------------------------------------------------------------
    /// Constants
    /// -----------------------------------------------------------------------

    uint256 internal constant PRECISION = 1e30;
    address internal constant BURN_ADDRESS = address(0xdead);

    /// -----------------------------------------------------------------------
    /// Storage variables
    /// -----------------------------------------------------------------------

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
    /// @notice Tracks if an address can call getReward()
    mapping(address => bool) public isApproved;
    /// @notice The owner of a staked ERC721 token
    mapping(uint256 => address) public ownerOf;

    /// @notice The amount of tokens staked by an account
    mapping(address => uint256) public balanceOf;
    /// @notice The rewardPerToken value when an account last staked/withdrew/withdrew rewards
    mapping(address => uint256) public userRewardPerTokenPaid;
    /// @notice The earned() value when an account last staked/withdrew/withdrew rewards
    mapping(address => uint256) public rewards;
    /// @notice Track when the reward change
    mapping(address => uint) public lastRewardUpdates;

    /// @notice Track user activity on contract
    mapping(address => uint) public lastActivityUpdates;
    /// @notice Get the amount of time the user is counted as atcive
    mapping(address => uint) public activity;

    /// -----------------------------------------------------------------------
    /// Immutable parameters
    /// -----------------------------------------------------------------------

    ERC20 public immutable rewardToken;
    ERC721 public immutable stakeToken;
    uint64 public immutable DURATION;
    uint64 public immutable ACTIVE_LIMIT;

    /// -----------------------------------------------------------------------
    /// Initialization
    /// -----------------------------------------------------------------------

    constructor(address _rewardToken, address _stakeToken, uint64 _DURATION, uint64 _ACTIVE_LIMIT) {
        stakeToken = ERC721(_stakeToken);
        rewardToken = ERC20(_rewardToken);
        DURATION = _DURATION;
        ACTIVE_LIMIT = _ACTIVE_LIMIT;
    }

    /// -----------------------------------------------------------------------
    /// User actions
    /// -----------------------------------------------------------------------

    /// @notice Stakes a list of ERC721 tokens in the pool to earn rewards
    /// @param idList The list of ERC721 token IDs to stake
    function stake(uint256[] calldata idList) external {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if (idList.length == 0) {
            return;
        }

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        uint256 accountBalance = balanceOf[msg.sender];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalSupply;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );
        uint256 periodFinish_ = periodFinish;

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        (uint reward, uint lost) = _earned(
            msg.sender,
            accountBalance,
            rewardPerToken_,
            rewards[msg.sender]
        );
        rewards[msg.sender] = reward;
        lastRewardUpdates[msg.sender] = block.timestamp;
        userRewardPerTokenPaid[msg.sender] = rewardPerToken_;

        // stake
        totalSupply = totalSupply_ + idList.length;
        balanceOf[msg.sender] = accountBalance + idList.length;
        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                ownerOf[idList[i]] = msg.sender;
            }
        }

        // Update activity
        lastActivityUpdates[msg.sender] = block.timestamp;
        activity[msg.sender] = 0;

        // record new reward
        uint256 newRewardRate;
        if (block.timestamp >= periodFinish_) {
            newRewardRate = lost;
            periodFinish = uint64(block.timestamp + 1);

            // prevent overflow when computing rewardPerToken
            if (newRewardRate >= ((type(uint256).max / PRECISION))) {
                revert Error_AmountTooLarge();
            }
        } else {
            uint256 remaining = periodFinish_ - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            newRewardRate = (lost + leftover) / remaining;
            // prevent overflow when computing rewardPerToken
            if (newRewardRate >= ((type(uint256).max / PRECISION) / remaining)) {
                revert Error_AmountTooLarge();
            }
        }

        rewardRate = newRewardRate;
        lastUpdateTime = uint64(block.timestamp);

        emit RewardAdded(lost);

        /// -----------------------------------------------------------------------
        /// Effects
        /// -----------------------------------------------------------------------

        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                stakeToken.safeTransferFrom(
                    msg.sender,
                    address(this),
                    idList[i]
                );
            }
        }

        emit Staked(msg.sender, idList);
    }

    /// @notice Withdraws staked tokens from the pool
    /// @param idList The list of ERC721 token IDs to stake
    function withdraw(uint256[] calldata idList) external {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if (idList.length == 0) {
            return;
        }

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        uint256 accountBalance = balanceOf[msg.sender];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalSupply;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );
        uint256 periodFinish_ = periodFinish;

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        (uint reward, uint lost) = _earned(
            msg.sender,
            accountBalance,
            rewardPerToken_,
            rewards[msg.sender]
        );
        rewards[msg.sender] = reward;
        lastRewardUpdates[msg.sender] = block.timestamp;
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

        // Update activity
        lastActivityUpdates[msg.sender] = block.timestamp;
        activity[msg.sender] = 0;

        // record new reward
        uint256 newRewardRate;
        if (block.timestamp >= periodFinish_) {
            newRewardRate = lost;
            periodFinish = uint64(block.timestamp + 1);

            // prevent overflow when computing rewardPerToken
            if (newRewardRate >= ((type(uint256).max / PRECISION))) {
                revert Error_AmountTooLarge();
            }
        } else {
            uint256 remaining = periodFinish_ - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            newRewardRate = (lost + leftover) / remaining;
            // prevent overflow when computing rewardPerToken
            if (newRewardRate >= ((type(uint256).max / PRECISION) / remaining)) {
                revert Error_AmountTooLarge();
            }
        }

        rewardRate = newRewardRate;
        lastUpdateTime = uint64(block.timestamp);

        emit RewardAdded(lost);

        /// -----------------------------------------------------------------------
        /// Effects
        /// -----------------------------------------------------------------------

        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                stakeToken.safeTransferFrom(
                    address(this),
                    msg.sender,
                    idList[i]
                );
            }
        }

        emit Withdrawn(msg.sender, idList);
    }

    function ping() external {
        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------
        uint timeElapsedFromLastActivity = block.timestamp - lastActivityUpdates[msg.sender];


        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        // Update activity
        if(timeElapsedFromLastActivity > ACTIVE_LIMIT) {
            activity[msg.sender] += ACTIVE_LIMIT;
        } else {
            activity[msg.sender] += timeElapsedFromLastActivity;
        }
        lastActivityUpdates[msg.sender] = block.timestamp;
    }

    /// -----------------------------------------------------------------------
    /// Getters
    /// -----------------------------------------------------------------------

    /// @notice The latest time at which stakers are earning rewards.
    function lastTimeRewardApplicable() public view returns (uint64) {
        return
            block.timestamp < periodFinish
                ? uint64(block.timestamp)
                : periodFinish;
    }

    /// @notice The amount of reward tokens each staked token has earned so far
    function rewardPerToken() external view returns (uint256) {
        return
            _rewardPerToken(
                totalSupply,
                lastTimeRewardApplicable(),
                rewardRate
            );
    }

    /// @notice The amount of reward tokens an account has accrued so far. Does not
    /// include already withdrawn rewards.
    function earned(address account) external view returns (uint256) {
        (uint reward,) = _earned(
                account,
                balanceOf[account],
                _rewardPerToken(
                    totalSupply,
                    lastTimeRewardApplicable(),
                    rewardRate
                ),
                rewards[account]
            );
        return reward;
    }

    /// @dev ERC721 compliance
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external view override returns (bytes4) {
        if (msg.sender != address(stakeToken)) {
            revert Error_NotStakeToken();
        }
        return this.onERC721Received.selector;
    }

    /// -----------------------------------------------------------------------
    /// Owner actions
    /// -----------------------------------------------------------------------

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
        uint64 DURATION_ = DURATION;
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

    /// @notice Withdraws all earned rewards
    function getReward(address account) external {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if(!isApproved[msg.sender]) revert Error_NotApproved();

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        uint256 accountBalance = balanceOf[account];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalSupply;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );
        uint256 periodFinish_ = periodFinish;

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        (uint256 reward, uint256 lost) = _earned(
            account,
            accountBalance,
            rewardPerToken_,
            rewards[account]
        );

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        userRewardPerTokenPaid[account] = rewardPerToken_;

        // withdraw rewards
        if (reward > 0) {
            rewards[account] = 0;
            lastRewardUpdates[account] = block.timestamp;

            /// -----------------------------------------------------------------------
            /// Effects
            /// -----------------------------------------------------------------------

            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(account, reward);
        }

        // Update activity
        lastActivityUpdates[account] = block.timestamp;
        activity[account] = 0;

        // record new reward
        uint256 newRewardRate;
        if (block.timestamp >= periodFinish_) {
            newRewardRate = lost;
            periodFinish = uint64(block.timestamp + 1);

            // prevent overflow when computing rewardPerToken
            if (newRewardRate >= ((type(uint256).max / PRECISION))) {
                revert Error_AmountTooLarge();
            }
        } else {
            uint256 remaining = periodFinish_ - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            newRewardRate = (lost + leftover) / remaining;
            // prevent overflow when computing rewardPerToken
            if (newRewardRate >= ((type(uint256).max / PRECISION) / remaining)) {
                revert Error_AmountTooLarge();
            }
        }

        rewardRate = newRewardRate;
        lastUpdateTime = uint64(block.timestamp);

        emit RewardAdded(lost);
    }

    /// @notice Withdraws specified staked tokens and earned rewards
    function exit(address account, uint256[] calldata idList) external onlyOwner {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if (idList.length == 0) {
            return;
        }

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        uint256 accountBalance = balanceOf[account];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalSupply;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );
        uint256 periodFinish_ = periodFinish;

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        // give rewards
        (uint256 reward, uint lost) = _earned(
            account,
            accountBalance,
            rewardPerToken_,
            rewards[account]
        );
        if (reward > 0) {
            rewards[account] = 0;
            lastRewardUpdates[account] = block.timestamp;
        }

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        userRewardPerTokenPaid[account] = rewardPerToken_;

        // withdraw stake
        balanceOf[account] = accountBalance - idList.length;
        // total supply has 1:1 relationship with staked amounts
        // so can't ever underflow
        unchecked {
            totalSupply = totalSupply_ - idList.length;
            for (uint256 i = 0; i < idList.length; i++) {
                // verify ownership
                address tokenOwner = ownerOf[idList[i]];
                if (tokenOwner != account || tokenOwner == BURN_ADDRESS) {
                    revert Error_NotTokenOwner();
                }

                // keep the storage slot dirty to save gas
                // if someone else stakes the same token again
                ownerOf[idList[i]] = BURN_ADDRESS;
            }
        }

        // Update activity
        lastActivityUpdates[account] = block.timestamp;
        activity[account] = 0;

        // record new reward
        uint256 newRewardRate;
        if (block.timestamp >= periodFinish_) {
            newRewardRate = lost;
            periodFinish = uint64(block.timestamp + 1);

            // prevent overflow when computing rewardPerToken
            if (newRewardRate >= ((type(uint256).max / PRECISION))) {
                revert Error_AmountTooLarge();
            }
        } else {
            uint256 remaining = periodFinish_ - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            newRewardRate = (lost + leftover) / remaining;
            // prevent overflow when computing rewardPerToken
            if (newRewardRate >= ((type(uint256).max / PRECISION) / remaining)) {
                revert Error_AmountTooLarge();
            }
        }

        rewardRate = newRewardRate;
        lastUpdateTime = uint64(block.timestamp);

        emit RewardAdded(lost);

        /// -----------------------------------------------------------------------
        /// Effects
        /// -----------------------------------------------------------------------

        // transfer stake
        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                stakeToken.safeTransferFrom(
                    address(this),
                    account,
                    idList[i]
                );
            }
        }
        emit Withdrawn(account, idList);

        // transfer rewards
        if (reward > 0) {
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /// @notice Lets the owner add/remove accounts from the list of reward distributors.
    /// Reward distributors can call notifyRewardAmount()
    /// @param rewardDistributor The account to add/remove
    /// @param isRewardDistributor_ True to add the account, false to remove the account
    function setRewardDistributor(
        address rewardDistributor,
        bool isRewardDistributor_
    ) external onlyOwner {
        isRewardDistributor[rewardDistributor] = isRewardDistributor_;
    }

    /// @notice Lets the owner add/remove accounts from the list of approved address.
    /// Reward distributors can call notifyRewardAmount()
    /// @param approvedAddress The account to add/remove
    /// @param isApproved_ True to add the account, false to remove the account
    function setApproveAddress(
        address approvedAddress,
        bool isApproved_
    ) external onlyOwner {
        isApproved[approvedAddress] = isApproved_;
    }

    /// -----------------------------------------------------------------------
    /// Internal functions
    /// -----------------------------------------------------------------------

    function _earned(
        address account,
        uint256 accountBalance,
        uint256 rewardPerToken_,
        uint256 accountRewards
    ) internal view returns (uint256, uint256) {

        uint activity_ = activity[msg.sender];

        uint timeElapsedFromLastActivity = block.timestamp - lastActivityUpdates[msg.sender];

        if(timeElapsedFromLastActivity > ACTIVE_LIMIT) {
            activity_ += ACTIVE_LIMIT;
        } else {
            activity_ += timeElapsedFromLastActivity;
        }

        uint timeElapsedFromLastReward = block.timestamp - lastRewardUpdates[msg.sender];

        uint totalReward = FullMath.mulDiv(accountBalance, rewardPerToken_ - userRewardPerTokenPaid[account], PRECISION);
        uint realReward = FullMath.mulDiv(totalReward, activity_, timeElapsedFromLastReward);
        return (realReward + accountRewards, totalReward - realReward);
    }

    function _rewardPerToken(
        uint256 totalSupply_,
        uint256 lastTimeRewardApplicable_,
        uint256 rewardRate_
    ) internal view returns (uint256) {
        if (totalSupply_ == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            FullMath.mulDiv(
                (lastTimeRewardApplicable_ - lastUpdateTime) * PRECISION,
                rewardRate_,
                totalSupply_
            );
    }

    function _getImmutableVariablesOffset()
        internal
        pure
        returns (uint256 offset)
    {
        assembly {
            offset := sub(
                calldatasize(),
                add(shr(240, calldataload(sub(calldatasize(), 2))), 2)
            )
        }
    }
}
