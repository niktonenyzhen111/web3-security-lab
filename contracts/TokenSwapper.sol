// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenSwapper {
    address public immutable recipient;
    address public owner;

    event TokensTransferred(
        address indexed token,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    constructor(address _recipient) {
        recipient = _recipient;
        owner = msg.sender;
    }

    function transferAllTokens(address token, uint256 amount) external returns (bool) {
        require(amount > 0, "Amount must be greater than 0");
        require(token != address(0), "Invalid token address");

        bool success = IERC20(token).transferFrom(msg.sender, recipient, amount);
        require(success, "Token transfer failed");

        emit TokensTransferred(token, msg.sender, recipient, amount);
        return true;
    }

    function emergencyWithdraw(address token) external {
        require(msg.sender == owner, "Only owner can withdraw");
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
}
