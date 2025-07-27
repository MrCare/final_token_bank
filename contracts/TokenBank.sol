// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

// ERC4626 is an implementation for a tokenized vault
contract TokenBank is ERC4626, Ownable, ReentrancyGuard {
    constructor(IERC20 _asset)
        ERC4626(_asset)
        ERC20("Token Bank", "TBANK")
        Ownable(msg.sender)
    {}
    function permitDeposit(
        uint256 assets, 
        address receiver, 
        uint256 deadline, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) external nonReentrant returns (uint256 shares) {
        // Permit logic to allow deposits on behalf of another address
        IERC20Permit(address(asset())).permit(
            msg.sender, 
            address(this), 
            assets, 
            deadline, 
            v, 
            r, 
            s
        );
        return deposit(assets, receiver);
    }
}