const { ethers } = require('ethers');

async function main() {
    console.log('🔑 Permit2 签名参数生成器 (ethers v6)');
    
    // 配置参数
    const config = {
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        tokenAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        tokenbankAddress: '0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690',
        receiverAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
        amount: '1300000000000000000',
        chainId: 31337
    };

    // 初始化钱包 (ethers v6 语法)
    const wallet = new ethers.Wallet(config.privateKey);
    console.log(`🔑 签名者: ${wallet.address}`);

    // 计算时间戳
    const currentTime = Math.floor(Date.now() / 1000);
    const deadline = currentTime + 3600;
    const expiration = currentTime + 86400;
    const nonce = 0;

    console.log(`⏰ Deadline: ${deadline}`);
    console.log(`⏰ Expiration: ${expiration}`);

    // EIP-712 域和类型
    const domain = {
        name: 'Permit2',
        chainId: config.chainId,
        verifyingContract: config.permit2Address
    };

    const types = {
        PermitSingle: [
            { name: 'details', type: 'PermitDetails' },
            { name: 'spender', type: 'address' },
            { name: 'sigDeadline', type: 'uint256' }
        ],
        PermitDetails: [
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint160' },
            { name: 'expiration', type: 'uint48' },
            { name: 'nonce', type: 'uint48' }
        ]
    };

    const message = {
        details: {
            token: config.tokenAddress,
            amount: config.amount,
            expiration: expiration,
            nonce: nonce
        },
        spender: config.tokenbankAddress,
        sigDeadline: deadline
    };

    try {
        // ethers v6 语法：使用 signTypedData (没有下划线)
        const signature = await wallet.signTypedData(domain, types, message);
        console.log(`✅ 签名: ${signature}`);

        // 生成 Cast 命令
        const castCommand = `cast send ${config.tokenbankAddress} \\
  "permitDeposit2(uint256,address,uint160,uint48,uint48,uint256,bytes)" \\
  ${config.amount} \\
  ${config.receiverAddress} \\
  ${config.amount} \\
  ${expiration} \\
  ${nonce} \\
  ${deadline} \\
  ${signature} \\
  --private-key ${config.privateKey} \\
  --rpc-url http://localhost:8545`;

        console.log('\n🔥 Cast 命令:');
        console.log(castCommand);

        // 保存到文件
        require('fs').writeFileSync('run_permitDeposit2.sh', `#!/bin/bash\n${castCommand}\n`);
        console.log('\n💾 命令已保存到: run_permitDeposit2.sh');

    } catch (error) {
        console.error('❌ 错误:', error.message);
        console.log('🔧 尝试备用方法...');
        
        // 备用方法：检测 ethers 版本
        console.log(`📦 ethers 版本: ${ethers.version || 'unknown'}`);
        
        // 如果是 v5，尝试 _signTypedData
        if (wallet._signTypedData) {
            console.log('🔄 使用 ethers v5 语法重试...');
            const signature = await wallet._signTypedData(domain, types, message);
            console.log(`✅ 签名: ${signature}`);
        }
    }
}

main();