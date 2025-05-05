// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function transfer(address to, uint256 amount) external returns (bool);
}

contract AudioStaking {
    IERC20 public immutable token;
    address public immutable owner;

    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    mapping(uint256 => mapping(address => StakeInfo)) public stakes;
    mapping(uint256 => uint256) public totalStaked;
    mapping(uint256 => uint256) public performanceScore;
    mapping(uint256 => address[]) public stakersPerContent;
    mapping(uint256 => mapping(address => bool)) public hasStakedBefore;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    event Staked(
        address indexed user,
        uint256 indexed contentId,
        uint256 amount
    );
    event Unstaked(
        address indexed user,
        uint256 indexed contentId,
        uint256 amount
    );
    event RewardClaimed(
        address indexed user,
        uint256 indexed contentId,
        uint256 amount
    );
    event PerformanceUpdated(uint256 indexed contentId, uint256 newScore);

    constructor(address _token) {
        require(_token != address(0), "Token address is zero");
        token = IERC20(_token);
        owner = msg.sender;
    }

    function stake(uint256 contentId, uint256 amount) external {
        require(amount > 0, "Nothing to stake");

        StakeInfo storage stakeInfo = stakes[contentId][msg.sender];
        token.transferFrom(msg.sender, address(this), amount);

        stakeInfo.amount += amount;
        totalStaked[contentId] += amount;

        if (!hasStakedBefore[contentId][msg.sender]) {
            stakersPerContent[contentId].push(msg.sender);
            hasStakedBefore[contentId][msg.sender] = true;
        }

        emit Staked(msg.sender, contentId, amount);
    }

    function updatePerformance(uint256 contentId, uint256 newScore)
        external
        onlyOwner
    {
        performanceScore[contentId] = newScore;
        emit PerformanceUpdated(contentId, newScore);
    }

    function calculateReward(uint256 contentId, address user)
        public
        view
        returns (uint256)
    {
        StakeInfo storage stakeInfo = stakes[contentId][user];
        uint256 score = performanceScore[contentId];
        uint256 rawReward = (stakeInfo.amount * score) / 1e18;

        // Subtract already claimed rewards
        if (rawReward <= stakeInfo.rewardDebt) {
            return 0;
        }

        return rawReward - stakeInfo.rewardDebt;
    }

    function claimReward(uint256 contentId) internal {
        uint256 reward = calculateReward(contentId, msg.sender);
        // require(reward > 0, "No reward available");

        if(reward > 0) {
            stakes[contentId][msg.sender].rewardDebt += reward;
            require(token.transfer(msg.sender, reward), "Reward transfer failed");
            emit RewardClaimed(msg.sender, contentId, reward);
        }
        
    }

    function unstake(uint256 contentId) external {
        StakeInfo storage stakeInfo = stakes[contentId][msg.sender];
        uint256 amount = stakeInfo.amount;
        require(amount > 0, "No unstake available");
        // Claim reward before unstaking
        claimReward(contentId);

        stakeInfo.amount = 0;
        totalStaked[contentId] -= amount;
        require(token.transfer(msg.sender, amount), "Unstake transfer failed");
        // Remove from stakersPerContent
        if (hasStakedBefore[contentId][msg.sender]) {
            address[] storage stakers = stakersPerContent[contentId];
            uint256 len = stakers.length;
            for (uint256 i = 0; i < len; i++) {
                if (stakers[i] == msg.sender) {
                    stakers[i] = stakers[len - 1]; // Replace with last
                    stakers.pop();                 // Remove last
                    break;
                }
            }
            hasStakedBefore[contentId][msg.sender] = false;
        }

        emit Unstaked(msg.sender, contentId, amount);
    }

    function totalStakers(uint256 contentId) external view returns (uint256) {
        return stakersPerContent[contentId].length;
    }
}
