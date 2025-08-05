// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/NftMarketUpgradeableV2.sol";

contract UpgradeToV2 is Script {
    function run() external {
        // 从README中获取的代理合约地址
        address proxyAddress = 0x970446F599b51ccfDFA9833a98c01aa6aaaD2D76;
        
        vm.startBroadcast();
        
        // 部署新的V2实现合约
        NftMarketUpgradeableV2 newImplementation = new NftMarketUpgradeableV2();
        console.log("V2 Implementation deployed at:", address(newImplementation));
        
        // 获取代理合约实例
        NftMarketUpgradeableV2 market = NftMarketUpgradeableV2(proxyAddress);
        
        // 升级到V2 - 直接调用升级函数
        market.upgradeToAndCall(address(newImplementation), "");
        
        console.log("Proxy upgraded successfully to V2");
        console.log("Proxy:", proxyAddress);
        console.log("New V2 Implementation:", address(newImplementation));
        console.log("Version:", market.version());
        
        vm.stopBroadcast();
    }
}
