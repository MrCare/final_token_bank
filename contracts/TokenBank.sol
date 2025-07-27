// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

// token：0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
// 简化的 Permit2 接口 - 只保留 Allowance 功能 （0x5FC8d32690cc91D4c39d9d3abcBD16989F875707）
// 合约源代码：（https://github.com/Uniswap/permit2）
interface IPermit2 {
    struct PermitSingle {
        PermitDetails details;
        address spender;
        uint256 sigDeadline;
    }

    struct PermitDetails {
        address token;
        uint160 amount;
        uint48 expiration;
        uint48 nonce;
    }

    function permit(
        address owner,
        PermitSingle memory permitSingle,
        bytes calldata signature
    ) external;

    function transferFrom(
        address from,
        address to,
        uint160 amount,
        address token
    ) external;

    function allowance(
        address user,
        address token,
        address spender
    ) external view returns (uint160 amount, uint48 expiration, uint48 nonce);

    function DOMAIN_SEPARATOR() external view returns (bytes32);
}

// ERC4626 is an implementation for a tokenized vault
contract TokenBank is ERC4626, Ownable, ReentrancyGuard {
    // Permit2 合约地址
    IPermit2 public immutable PERMIT2;
    
    constructor(IERC20 _asset, address _permit2)
        ERC4626(_asset)
        ERC20("Token Bank", "TBANK")
        Ownable(msg.sender)
    {
        PERMIT2 = IPermit2(_permit2);
    }

    // 原始的 permit 版本（适用于支持 EIP-2612 的代币）
    function permitDeposit(
        uint256 assets, 
        address receiver, 
        uint256 deadline, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) external nonReentrant returns (uint256 shares) {
        // 使用原生 permit 授权
        IERC20Permit(address(asset())).permit(
            msg.sender, 
            address(this), 
            assets, 
            deadline, 
            v, 
            r, 
            s
        );
        // 统一调用 deposit
        return deposit(assets, receiver);
    }

    // 使用 Permit2 Allowance 模式
    function permitDeposit2(
        uint256 assets,
        address receiver,
        uint160 amount,
        uint48 expiration,
        uint48 nonce,
        uint256 sigDeadline,
        bytes calldata signature
    ) external nonReentrant returns (uint256 shares) {
        // 使用 Permit2 授权
        IPermit2.PermitSingle memory permitSingle = IPermit2.PermitSingle({
            details: IPermit2.PermitDetails({
                token: address(asset()),
                amount: amount,
                expiration: expiration,
                nonce: nonce
            }),
            spender: address(this),
            sigDeadline: sigDeadline
        });

        PERMIT2.permit(msg.sender, permitSingle, signature);

        // 统一调用 deposit()
        return deposit(assets, receiver);
    }

    // 重写 ERC4626 的 _deposit 函数以支持 Permit2
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        // 先尝试使用 Permit2，如果失败则使用标准 transferFrom
        try PERMIT2.transferFrom(caller, address(this), uint160(assets), address(asset())) {
            // Permit2 转移成功
        } catch {
            // 回退到标准 ERC20 transferFrom
            IERC20(asset()).transferFrom(caller, address(this), assets);
        }

        _mint(receiver, shares);
        emit Deposit(caller, receiver, assets, shares);
    }

    // 获取 Permit2 合约地址
    function getPermit2Address() external view returns (address) {
        return address(PERMIT2);
    }

    // 检查 Permit2 授权状态
    function getPermit2Allowance(address owner) external view returns (uint160 amount, uint48 expiration, uint48 nonce) {
        return PERMIT2.allowance(owner, address(asset()), address(this));
    }
}