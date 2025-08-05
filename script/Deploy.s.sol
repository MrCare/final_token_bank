// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
// import {Counter} from "../contracts/Counter.sol";
import {FinalCarToken} from "../contracts/Token.sol";
// import {TokenBank} from "../contracts/TokenBank.sol";
import {Nft} from "../contracts/Nft.sol";
// import {NFTMarket} from "../contracts/NftMarket.sol";

contract Deploy is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();
        
        // Counter counter = new Counter();
        // console.log("Counter deployed to:", address(counter));

        FinalCarToken finalCarToken = new FinalCarToken();
        console.log("FinalCarToken deployed to:", address(finalCarToken));

        // TokenBank tokenBank = new TokenBank(finalCarToken, address(0x000000000022D473030F116dDEE9F6B43aC78BA3));
        // console.log("TokenBank deployed to:", address(tokenBank));
        // console.log("TokenBank asset:", address(tokenBank.asset()));

        Nft nft = new Nft("bafybeihxrlsmlpab5xhunwiz5mw657gg3ln6d5zns3noypa64y3n7wnuc4");
        console.log("Nft deployed to:", address(nft));

        // NFTMarket nftMarket = new NFTMarket(address(nft),address(finalCarToken));
        // console.log("NftMarket deployed to:", address(nftMarket));
        vm.stopBroadcast();
    }
}
