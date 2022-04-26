// SPDX-License-Identifier: AGPL-3.0

pragma solidity ^0.8.4;

import {ERC20} from "../libs/solmate/ERC20.sol";
import {ERC721, ERC721TokenReceiver} from "../libs/solmate/ERC721.sol";
import {SafeTransferLib} from "../libs/solmate/SafeTransferLib.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FullMath} from "../libs/FullMath.sol";

contract Distributor is Ownable, ERC721TokenReceiver {
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
    error Error_KeptOverReward();

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256[] idList);
    event Withdrawn(address indexed user, uint256[] idList);
    event RewardPaid(address indexed user, uint256 reward);
    event Disabled(address indexed user, uint256[] idList);
    event Enabled(address indexed user, uint256[] idList);

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
    /// @notice The total tokens staked and enabled in the pool
    uint256 public totalEnabled;
    /// @notice The total tokens staked and disabled in the pool
    uint256 public totalDisabled;

    /// @notice Tracks if an address can call notifyReward()
    mapping(address => bool) public isRewardDistributor;
    /// @notice The owner of a staked ERC721 token
    mapping(uint256 => address) public ownerOf;
    /// @notice The status of a staked ERC721 token
    mapping(uint256 => bool) public isDisabled;

    /// @notice The amount of tokens staked and enabled by an account
    mapping(address => uint256) public enabledOf;
    /// @notice The amount of tokens staked and enabled by an account
    mapping(address => uint256) public disabledOf;
    /// @notice The rewardPerToken value when an account last staked/withdrew/withdrew rewards
    mapping(address => uint256) public userRewardPerTokenPaid;
    /// @notice The earned() value when an account last staked/withdrew/withdrew rewards
    mapping(address => uint256) public rewards;

    /// -----------------------------------------------------------------------
    /// Immutable parameters
    /// -----------------------------------------------------------------------

    ERC20 immutable public rewardToken;
    ERC721 immutable public stakeToken;

    /// -----------------------------------------------------------------------
    /// Initialization
    /// -----------------------------------------------------------------------

    constructor(address _rewardToken, address _stakeToken) {
        rewardToken = ERC20(_rewardToken);
        stakeToken = ERC721(_stakeToken);
    }

    /// -----------------------------------------------------------------------
    /// User actions
    /// -----------------------------------------------------------------------

    /// @notice Stakes a list of ERC721 tokens in the pool to earn rewards
    /// @param holder The address which hold ERC721 tokens
    /// @param staker The address which receive the staked tokens
    /// @param idList The list of ERC721 token IDs to stake
    function stakeForAccount(address holder, address staker, uint256[] calldata idList) external {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if (idList.length == 0) {
            return;
        }
        if (!isRewardDistributor[msg.sender]) {
            revert Error_NotRewardDistributor();
        }

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        uint256 accountBalance = enabledOf[staker];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalEnabled;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        rewards[staker] = _earned(
            staker,
            accountBalance,
            rewardPerToken_,
            rewards[staker]
        );
        userRewardPerTokenPaid[staker] = rewardPerToken_;

        // stake
        totalEnabled = totalSupply_ + idList.length;
        enabledOf[staker] = accountBalance + idList.length;
        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                ownerOf[idList[i]] = staker;
            }
        }

        /// -----------------------------------------------------------------------
        /// Effects
        /// -----------------------------------------------------------------------

        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                stakeToken.safeTransferFrom(
                    holder,
                    address(this),
                    idList[i]
                );
            }
        }

        emit Staked(staker, idList);
    }

    /// @notice Withdraws staked tokens from the pool
    /// @param holder The address which receive unstaked ERC721 tokens
    /// @param staker The address which holds the staked tokens
    /// @param idList The list of ERC721 token IDs to stake
    function withdrawForAccount(address holder, address staker, uint256[] calldata idList) external {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if (idList.length == 0) {
            return;
        }
        if (!isRewardDistributor[msg.sender]) {
            revert Error_NotRewardDistributor();
        }

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        uint256 accountBalance = enabledOf[staker];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalEnabled;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        rewards[staker] = _earned(
            staker,
            accountBalance,
            rewardPerToken_,
            rewards[staker]
        );
        userRewardPerTokenPaid[staker] = rewardPerToken_;

        // withdraw stake
        uint256 enabledAmount;
        uint256 disabledAmount;
        // total supply has 1:1 relationship with staked amounts
        // so can't ever underflow
        unchecked {
            totalEnabled = totalSupply_ - idList.length;
            for (uint256 i = 0; i < idList.length; i++) {
                // verify ownership
                address tokenOwner = ownerOf[idList[i]];
                if (tokenOwner != staker || tokenOwner == BURN_ADDRESS) {
                    revert Error_NotTokenOwner();
                }

                // keep the storage slot dirty to save gas
                // if someone else stakes the same token again
                ownerOf[idList[i]] = BURN_ADDRESS;

                bool disabled = isDisabled[idList[i]];
                if (disabled) {
                    isDisabled[idList[i]] = false;
                    disabledAmount++;
                } else {
                    enabledAmount++;
                }
            }
        }
        enabledOf[staker] = accountBalance - enabledAmount;
        disabledOf[staker] -= disabledAmount;

        /// -----------------------------------------------------------------------
        /// Effects
        /// -----------------------------------------------------------------------

        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                stakeToken.safeTransferFrom(
                    address(this),
                    holder,
                    idList[i]
                );
            }
        }

        emit Withdrawn(staker, idList);
    }

    /// @notice Withdraws specified staked tokens and earned rewards
    /// @param holder The address which receive unstaked ERC721 tokens
    /// @param staker The address which holds the staked tokens
    /// @param receiver The address which receive the rewards
    /// @param idList The list of ERC721 token IDs to stake
    /// @param kept The reward kept on the contract
    function exitForAccount(
        address holder,
        address staker,
        address receiver,
        uint256[] calldata idList,
        uint256 kept
    ) external {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if (idList.length == 0) {
            return;
        }
        if (!isRewardDistributor[msg.sender]) {
            revert Error_NotRewardDistributor();
        }

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        uint256 accountBalance = enabledOf[staker];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalEnabled;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        // give rewards
        uint256 reward = _earned(
            staker,
            accountBalance,
            rewardPerToken_,
            rewards[staker]
        );
        if (reward > 0) {
            if (reward < kept) {
                revert Error_KeptOverReward();
            }
            rewards[staker] = kept;
            reward -= kept;
        }

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        userRewardPerTokenPaid[staker] = rewardPerToken_;

        // withdraw stake
        enabledOf[staker] = accountBalance - idList.length;
        // total supply has 1:1 relationship with staked amounts
        // so can't ever underflow
        unchecked {
            totalEnabled = totalSupply_ - idList.length;
            for (uint256 i = 0; i < idList.length; i++) {
                // verify ownership
                address tokenOwner = ownerOf[idList[i]];
                if (tokenOwner != staker || tokenOwner == BURN_ADDRESS) {
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
                stakeToken.safeTransferFrom(
                    address(this),
                    holder,
                    idList[i]
                );
            }
        }
        emit Withdrawn(staker, idList);

        // transfer rewards
        if (reward > 0) {
            rewardToken.safeTransfer(receiver, reward);
            emit RewardPaid(staker, reward);
        }
    }

    /// @notice Withdraws all earned rewards
    /// @param staker The address which holds the staked tokens
    /// @param receiver The address which receive the rewards
    /// @param kept The reward kept on the contract
    function getRewardForAccount(address staker, address receiver, uint256 kept) external {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if (!isRewardDistributor[msg.sender]) {
            revert Error_NotRewardDistributor();
        }

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        uint256 accountBalance = enabledOf[staker];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalEnabled;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        uint256 reward = _earned(
            staker,
            accountBalance,
            rewardPerToken_,
            rewards[staker]
        );

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        userRewardPerTokenPaid[staker] = rewardPerToken_;

        // withdraw rewards
        if (reward > 0) {
            if (reward < kept) {
                revert Error_KeptOverReward();
            }
            rewards[staker] = kept;
            reward -= kept;

            /// -----------------------------------------------------------------------
            /// Effects
            /// -----------------------------------------------------------------------

            rewardToken.safeTransfer(receiver, reward);
            emit RewardPaid(staker, reward);
        }
    }

    /// @notice Withdraws specified staked tokens and earned rewards
    /// @param staker The address which holds the staked tokens
    /// @param receiver The address which receive the rewards
    /// @param idList The list of ERC721 token IDs to stake
    /// @param kept The reward kept on the contract
    function disableForAccount(
        address staker,
        address receiver,
        uint256[] calldata idList,
        uint256 kept
    ) external {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if (idList.length == 0) {
            return;
        }
        if (!isRewardDistributor[msg.sender]) {
            revert Error_NotRewardDistributor();
        }

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        uint256 accountBalance = enabledOf[staker];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalEnabled;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        // give rewards
        uint256 reward = _earned(
            staker,
            accountBalance,
            rewardPerToken_,
            rewards[staker]
        );
        if (reward > 0) {
            if (reward < kept) {
                revert Error_KeptOverReward();
            }
            rewards[staker] = kept;
            reward -= kept;
        }

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        userRewardPerTokenPaid[staker] = rewardPerToken_;

        // withdraw stake
        enabledOf[staker] = accountBalance - idList.length;
        disabledOf[staker] += idList.length;
        totalDisabled += idList.length;
        // total supply has 1:1 relationship with staked amounts
        // so can't ever underflow
        unchecked {
            totalEnabled = totalSupply_ - idList.length;
            for (uint256 i = 0; i < idList.length; i++) {
                // verify ownership
                address tokenOwner = ownerOf[idList[i]];
                if (tokenOwner != staker || tokenOwner == BURN_ADDRESS) {
                    revert Error_NotTokenOwner();
                }

                isDisabled[idList[i]] = true;
            }
        }

        /// -----------------------------------------------------------------------
        /// Effects
        /// -----------------------------------------------------------------------

        emit Disabled(staker, idList);

        // transfer rewards
        if (reward > 0) {
            rewardToken.safeTransfer(receiver, reward);
            emit RewardPaid(staker, reward);
        }
    }

    /// @notice Stakes a list of ERC721 tokens in the pool to earn rewards
    /// @param staker The address which receive the staked tokens
    /// @param idList The list of ERC721 token IDs to stake
    function enableForAccount(address staker, uint256[] calldata idList) external {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if (idList.length == 0) {
            return;
        }
        if (!isRewardDistributor[msg.sender]) {
            revert Error_NotRewardDistributor();
        }

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        uint256 accountBalance = enabledOf[staker];
        uint64 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        uint256 totalSupply_ = totalEnabled;
        uint256 rewardPerToken_ = _rewardPerToken(
            totalSupply_,
            lastTimeRewardApplicable_,
            rewardRate
        );

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        // accrue rewards
        rewardPerTokenStored = rewardPerToken_;
        lastUpdateTime = lastTimeRewardApplicable_;
        rewards[staker] = _earned(
            staker,
            accountBalance,
            rewardPerToken_,
            rewards[staker]
        );
        userRewardPerTokenPaid[staker] = rewardPerToken_;

        // stake
        totalEnabled = totalSupply_ + idList.length;
        totalDisabled -= idList.length;
        enabledOf[staker] = accountBalance + idList.length;
        disabledOf[staker] -= idList.length;
        unchecked {
            for (uint256 i = 0; i < idList.length; i++) {
                // verify ownership
                address tokenOwner = ownerOf[idList[i]];
                if (tokenOwner != staker || stakeToken.ownerOf(idList[i]) == address(this) || tokenOwner == BURN_ADDRESS) {
                    revert Error_NotTokenOwner();
                }

                isDisabled[idList[i]] = false;
            }
        }

        /// -----------------------------------------------------------------------
        /// Effects
        /// -----------------------------------------------------------------------

        emit Enabled(staker, idList);
    }

    /// -----------------------------------------------------------------------
    /// Getters
    /// -----------------------------------------------------------------------

    /// @notice The total tokens staked in the pool
    function totalSupply() public view returns(uint256) {
        return totalEnabled + totalDisabled;
    }

    /// @notice The amount of tokens staked by an account
    function balanceOf(address account) public view returns(uint256) {
        return enabledOf[account] + disabledOf[account];
    }

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
                totalEnabled,
                lastTimeRewardApplicable(),
                rewardRate
            );
    }

    /// @notice The amount of reward tokens an account has accrued so far. Does not
    /// include already withdrawn rewards.
    function earned(address account) external view returns (uint256) {
        return
            _earned(
                account,
                enabledOf[account],
                _rewardPerToken(
                    totalEnabled,
                    lastTimeRewardApplicable(),
                    rewardRate
                ),
                rewards[account]
            );
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
    function notifyRewardAmount(uint256 reward, uint64 duration) external {
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
        uint256 totalSupply_ = totalEnabled;

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
            newRewardRate = reward / duration;
        } else {
            uint256 remaining = periodFinish_ - block.timestamp;
            uint256 leftover = remaining * rewardRate_;
            newRewardRate = (reward + leftover) / duration;
        }
        // prevent overflow when computing rewardPerToken
        if (newRewardRate >= ((type(uint256).max / PRECISION) / duration)) {
            revert Error_AmountTooLarge();
        }
        rewardRate = newRewardRate;
        lastUpdateTime = uint64(block.timestamp);
        periodFinish = uint64(block.timestamp + duration);

        emit RewardAdded(reward);
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

    /// -----------------------------------------------------------------------
    /// Internal functions
    /// -----------------------------------------------------------------------

    function _earned(
        address account,
        uint256 accountBalance,
        uint256 rewardPerToken_,
        uint256 accountRewards
    ) internal view returns (uint256) {
        return
            FullMath.mulDiv(
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
        return
            rewardPerTokenStored +
            FullMath.mulDiv(
                (lastTimeRewardApplicable_ - lastUpdateTime) * PRECISION,
                rewardRate_,
                totalSupply_
            );
    }
}
