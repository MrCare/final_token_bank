// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/NftMarketUpgradeable.sol";

contract UpgradeMarket is Script {
    function run() external {
        address proxyAddress = vm.envAddress("PROXY_ADDRESS");
        
        vm.startBroadcast();
        
        // 部署新的实现合约
        NftMarketUpgradeable newImplementation = new NftMarketUpgradeable();
        console.log("New Implementation deployed at:", address(newImplementation));
        
        // 获取代理合约实例
        NftMarketUpgradeable market = NftMarketUpgradeable(proxyAddress);
        
        // UUPS升级 - 直接调用升级函数
        market.upgradeToAndCall(address(newImplementation), "");
        
        console.log("Proxy upgraded successfully");
        console.log("Proxy:", proxyAddress);
        console.log("New Implementation:", address(newImplementation));
        
        vm.stopBroadcast();
    }
}