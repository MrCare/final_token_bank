// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FinalCarToken is ERC20Permit, Ownable {
    constructor() ERC20("FinalCarToken", "FCAR") ERC20Permit("FinalCarToken") Ownable(msg.sender) {
        _mint(msg.sender, 100 * 10 ** decimals()); // Mint 100 tokens to the owner
    }
}