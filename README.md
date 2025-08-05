<!--
 * @Author: Mr.Car
 * @Date: 2025-07-26 17:58:16
-->
## NftMarket 合约升级
代理合约的地址：`https://sepolia.etherscan.io/address/0x970446f599b51ccfdfa9833a98c01aa6aaad2d76`

nftMarketupgradeableV2通过本地测试：
```Shell
(base) ➜  final_token_bank git:(featrue/nft-market-proxy) ✗ forge test --match-contract NftMarketUpgradeableV2Test
 -vv
[⠊] Compiling...
No files changed, compilation skipped

Ran 9 tests for test/NftMarketUpgradeableV2.t.sol:NftMarketUpgradeableV2Test
[PASS] testBackwardCompatibility() (gas: 78737)
[PASS] testBatchListNFTWithSignature() (gas: 376071)
[PASS] testBuyNFTAfterSignatureListing() (gas: 178570)
[PASS] testDomainSeparator() (gas: 16490)
[PASS] testListNFTWithExpiredSignature() (gas: 23464)
[PASS] testListNFTWithInvalidSignature() (gas: 35685)
[PASS] testListNFTWithSignature() (gas: 114532)
[PASS] testListNFTWithUsedSignature() (gas: 90477)
[PASS] testVersion() (gas: 15102)
Suite result: ok. 9 passed; 0 failed; 0 skipped; finished in 3.23ms (6.11ms CPU time)

Ran 1 test suite in 576.63ms (3.23ms CPU time): 9 tests passed, 0 failed, 0 skipped (9 total tests)
```

```Shell
(base) ➜  final_token_bank git:(featrue/nft-market-proxy) ✗ forge script script/DeployUpgradeable.s.sol:DeployUpgradeable --rpc-url $SEPOLIA_RPC --account NFT --broadcast --verify
[⠊] Compiling...
No files changed, compilation skipped
Enter keystore password:
Script ran successfully.

== Logs ==
  Token deployed at: 0xCF977698c46160c397AC53F5688C8093cCf74c60
  NFT deployed at: 0x6B13e2eD203e04a3Ab9E737d14e38017D7c75dAB
  Implementation deployed at: 0xBD5451C73F8D90a3E4526E58034be4485d4AF7E3
  Proxy deployed at: 0x970446F599b51ccfDFA9833a98c01aa6aaaD2D76
  === Deployment Summary ===
  Token Contract: 0xCF977698c46160c397AC53F5688C8093cCf74c60
  NFT Contract: 0x6B13e2eD203e04a3Ab9E737d14e38017D7c75dAB
  Market Implementation: 0xBD5451C73F8D90a3E4526E58034be4485d4AF7E3
  Market Proxy: 0x970446F599b51ccfDFA9833a98c01aa6aaaD2D76
  Market Owner: 0xE991bC71A371055B3f02aa79b79E4b714A3D04c0
  Market NFT Contract: 0x6B13e2eD203e04a3Ab9E737d14e38017D7c75dAB
  Market Token Contract: 0xCF977698c46160c397AC53F5688C8093cCf74c60
  === Contract Info ===
  Token Name: FinalCarToken
  Token Symbol: FCAR
  Token Total Supply: 100000000000000000000
  NFT Name: FinalCarNft
  NFT Symbol: FCNFT

## Setting up 1 EVM.

==========================

Chain 11155111

Estimated gas price: 2.23531328 gwei

Estimated total gas used for script: 10057155

Estimated amount required: 0.0224808921305184 ETH

==========================

##### sepolia
✅  [Success] Hash: 0x64c5eb2dd92b3c9c92d8d1064ae644bef3c1ce2bcdfd96cb5d4f74c92a5f4794
Contract Address: 0xCF977698c46160c397AC53F5688C8093cCf74c60
Block: 8917521
Paid: 0.002029587015392932 ETH (1870172 gas * 1.085240831 gwei)


##### sepolia
✅  [Success] Hash: 0x8c05590ed869a0e7ec9a791f1e4dfa3f7a7ca87435d506d812a46c566f08f805
Contract Address: 0x6B13e2eD203e04a3Ab9E737d14e38017D7c75dAB
Block: 8917521
Paid: 0.003035546662725058 ETH (2797118 gas * 1.085240831 gwei)


##### sepolia
✅  [Success] Hash: 0x936b0f22fe476dbc653a9b987f8fb3fb1c6b834f0605d168b61df138c7d33725
Contract Address: 0xBD5451C73F8D90a3E4526E58034be4485d4AF7E3
Block: 8917521
Paid: 0.00303974871522269 ETH (2800990 gas * 1.085240831 gwei)


##### sepolia
✅  [Success] Hash: 0x12101e674b8f021fcf9db750a65c554690b6f0af7cd71752206e5164e9898b80
Contract Address: 0x970446F599b51ccfDFA9833a98c01aa6aaaD2D76
Block: 8917521
Paid: 0.000290838031263014 ETH (267994 gas * 1.085240831 gwei)

✅ Sequence #1 on sepolia | Total Paid: 0.008395720424603694 ETH (7736274 gas * avg 1.085240831 gwei)
                                                          

==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.
##
Start verification for (4) contracts
Start verifying contract `0xCF977698c46160c397AC53F5688C8093cCf74c60` deployed on sepolia
EVM version: cancun
Compiler version: 0.8.30

Submitting verification for [contracts/Token.sol:FinalCarToken] 0xCF977698c46160c397AC53F5688C8093cCf74c60.
Warning: Could not detect the deployment.; waiting 5 seconds before trying again (4 tries remaining)

Submitting verification for [contracts/Token.sol:FinalCarToken] 0xCF977698c46160c397AC53F5688C8093cCf74c60.
Warning: Could not detect the deployment.; waiting 5 seconds before trying again (3 tries remaining)

Submitting verification for [contracts/Token.sol:FinalCarToken] 0xCF977698c46160c397AC53F5688C8093cCf74c60.
Warning: Could not detect the deployment.; waiting 5 seconds before trying again (2 tries remaining)

Submitting verification for [contracts/Token.sol:FinalCarToken] 0xCF977698c46160c397AC53F5688C8093cCf74c60.
Warning: Could not detect the deployment.; waiting 5 seconds before trying again (1 tries remaining)

Submitting verification for [contracts/Token.sol:FinalCarToken] 0xCF977698c46160c397AC53F5688C8093cCf74c60.
Warning: Could not detect the deployment.; waiting 5 seconds before trying again (0 tries remaining)

Submitting verification for [contracts/Token.sol:FinalCarToken] 0xCF977698c46160c397AC53F5688C8093cCf74c60.
Submitted contract for verification:
        Response: `OK`
        GUID: `xarpkj6fe5w7r3djl514vxd3mtvyb3afk7fbdjjd2ub553caev`
        URL: https://sepolia.etherscan.io/address/0xcf977698c46160c397ac53f5688c8093ccf74c60
Contract verification status:
Response: `NOTOK`
Details: `Pending in queue`
Warning: Verification is still pending...; waiting 15 seconds before trying again (7 tries remaining)
Contract verification status:
Response: `OK`
Details: `Pass - Verified`
Contract successfully verified
Start verifying contract `0x6B13e2eD203e04a3Ab9E737d14e38017D7c75dAB` deployed on sepolia
EVM version: cancun
Compiler version: 0.8.30
Constructor args: 0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003b626166796265696878726c736d6c706162357868756e77697a356d773635376767336c6e3664357a6e73336e6f797061363479336e37776e7563340000000000

Submitting verification for [contracts/Nft.sol:Nft] 0x6B13e2eD203e04a3Ab9E737d14e38017D7c75dAB.
Submitted contract for verification:
        Response: `OK`
        GUID: `xnpyvzxn3idzwbuelkp2gsmm2bn8yjgvif6nsmc6ephrztrqbq`
        URL: https://sepolia.etherscan.io/address/0x6b13e2ed203e04a3ab9e737d14e38017d7c75dab
Contract verification status:
Response: `NOTOK`
Details: `Pending in queue`
Warning: Verification is still pending...; waiting 15 seconds before trying again (7 tries remaining)
Contract verification status:
Response: `NOTOK`
Details: `Already Verified`
Contract source code already verified
Start verifying contract `0xBD5451C73F8D90a3E4526E58034be4485d4AF7E3` deployed on sepolia
EVM version: cancun
Compiler version: 0.8.30

Submitting verification for [contracts/NftMarketUpgradeable.sol:NftMarketUpgradeable] 0xBD5451C73F8D90a3E4526E58034be4485d4AF7E3.
Submitted contract for verification:
        Response: `OK`
        GUID: `gsbdevs2wjcqqi2ige6xnrzipravnabxw83pj61awqqstpzzqh`
        URL: https://sepolia.etherscan.io/address/0xbd5451c73f8d90a3e4526e58034be4485d4af7e3
Contract verification status:
Response: `NOTOK`
Details: `Pending in queue`
Warning: Verification is still pending...; waiting 15 seconds before trying again (7 tries remaining)
Contract verification status:
Response: `OK`
Details: `Pass - Verified`
Contract successfully verified
Start verifying contract `0x970446F599b51ccfDFA9833a98c01aa6aaaD2D76` deployed on sepolia
EVM version: cancun
Compiler version: 0.8.30
Constructor args: 000000000000000000000000bd5451c73f8d90a3e4526e58034be4485d4af7e300000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000044485cc9550000000000000000000000006b13e2ed203e04a3ab9e737d14e38017d7c75dab000000000000000000000000cf977698c46160c397ac53f5688c8093ccf74c6000000000000000000000000000000000000000000000000000000000

Submitting verification for [contracts/NftMarketProxy.sol:NftMarketProxy] 0x970446F599b51ccfDFA9833a98c01aa6aaaD2D76.
Submitted contract for verification:
        Response: `OK`
        GUID: `ccjf3rttppkven9fthgczbdvbp1gqascx6nzeh6cwrgdfrb3jd`
        URL: https://sepolia.etherscan.io/address/0x970446f599b51ccfdfa9833a98c01aa6aaad2d76
Contract verification status:
Response: `NOTOK`
Details: `Pending in queue`
Warning: Verification is still pending...; waiting 15 seconds before trying again (7 tries remaining)
Contract verification status:
Response: `OK`
Details: `Pass - Verified`
Contract successfully verified
All (4) contracts were verified!

Transactions saved to: /Users/car/Work/2025beginAgain/final_token_bank/broadcast/DeployUpgradeable.s.sol/11155111/run-latest.json

Sensitive values saved to: /Users/car/Work/2025beginAgain/final_token_bank/cache/DeployUpgradeable.s.sol/11155111/run-latest.json

```

## TOKENBANK
1. 连接钱包
![alt text](image-1.png)
2. 合约余额
![alt text](image-2.png)
3. 签名存款
![alt text](image-3.png)
4. 提取资金
![alt text](image-4.png)

## NFTMARKET
1. 合约上架
![alt text](image-7.png)

2. 智能购买（白名单 + permit 授权）
![alt text](image-8.png)

## PERMIT2

1. Permit2 购买
![alt text](image-9.png)
![alt text](image-10.png)
![alt text](image-11.png)


## Merkle Tree 白名单 / multicall
测试结果

```Bash
(base) ➜  final_token_bank git:(main) ✗ forge test test/NftMarket.t.sol 
[⠊] Compiling...
No files changed, compilation skipped

Ran 9 tests for test/NftMarket.t.sol:NftMarketTest
[PASS] testBuyNFT() (gas: 126482)
[PASS] testClaimNFT() (gas: 134778)
[PASS] testClaimNFTFailsForNonWhitelistUser() (gas: 59150)
[PASS] testMultiCall() (gas: 37284)
[PASS] testPermitPrePayAndClaimWithMultiCall() (gas: 189362)
[PASS] testPermitPrePayOnly() (gas: 112381)
[PASS] testSetup() (gas: 47922)
[PASS] testUpdateMerkleRoot() (gas: 18550)
[PASS] testUpdateMerkleRootFailsForNonOwner() (gas: 13899)
Suite result: ok. 9 passed; 0 failed; 0 skipped; finished in 12.27ms (23.26ms CPU time)

Ran 1 test suite in 573.10ms (12.27ms CPU time): 9 tests passed, 0 failed, 0 skipped (9 total tests)
(base) ➜  final_token_bank git:(main) ✗ forge test test/NftMarket.t.sol -vvv
[⠊] Compiling...
No files changed, compilation skipped

Ran 9 tests for test/NftMarket.t.sol:NftMarketTest
[PASS] testBuyNFT() (gas: 126482)
Logs:
  NFT contract deployed, checking token count...
  Token deployer (owner): 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
  Owner token balance: 100000000000000000000
  Seller NFT ID: 2
  NFT owner: 0x0000000000000000000000000000000000000002

[PASS] testClaimNFT() (gas: 134778)
Logs:
  NFT contract deployed, checking token count...
  Token deployer (owner): 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
  Owner token balance: 100000000000000000000
  Seller NFT ID: 2
  NFT owner: 0x0000000000000000000000000000000000000002

[PASS] testClaimNFTFailsForNonWhitelistUser() (gas: 59150)
Logs:
  NFT contract deployed, checking token count...
  Token deployer (owner): 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
  Owner token balance: 100000000000000000000
  Seller NFT ID: 2
  NFT owner: 0x0000000000000000000000000000000000000002

[PASS] testMultiCall() (gas: 37284)
Logs:
  NFT contract deployed, checking token count...
  Token deployer (owner): 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
  Owner token balance: 100000000000000000000
  Seller NFT ID: 2
  NFT owner: 0x0000000000000000000000000000000000000002

[PASS] testPermitPrePayAndClaimWithMultiCall() (gas: 189362)
Logs:
  NFT contract deployed, checking token count...
  Token deployer (owner): 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
  Owner token balance: 100000000000000000000
  Seller NFT ID: 2
  NFT owner: 0x0000000000000000000000000000000000000002

[PASS] testPermitPrePayOnly() (gas: 112381)
Logs:
  NFT contract deployed, checking token count...
  Token deployer (owner): 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
  Owner token balance: 100000000000000000000
  Seller NFT ID: 2
  NFT owner: 0x0000000000000000000000000000000000000002

[PASS] testSetup() (gas: 47922)
Logs:
  NFT contract deployed, checking token count...
  Token deployer (owner): 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
  Owner token balance: 100000000000000000000
  Seller NFT ID: 2
  NFT owner: 0x0000000000000000000000000000000000000002

[PASS] testUpdateMerkleRoot() (gas: 18550)
Logs:
  NFT contract deployed, checking token count...
  Token deployer (owner): 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
  Owner token balance: 100000000000000000000
  Seller NFT ID: 2
  NFT owner: 0x0000000000000000000000000000000000000002

[PASS] testUpdateMerkleRootFailsForNonOwner() (gas: 13899)
Logs:
  NFT contract deployed, checking token count...
  Token deployer (owner): 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
  Owner token balance: 100000000000000000000
  Seller NFT ID: 2
  NFT owner: 0x0000000000000000000000000000000000000002

Suite result: ok. 9 passed; 0 failed; 0 skipped; finished in 5.24ms (4.92ms CPU time)

Ran 1 test suite in 623.67ms (5.24ms CPU time): 9 tests passed, 0 failed, 0 skipped (9 total tests)
(base) ➜  final_token_bank git:(main) ✗ 
```