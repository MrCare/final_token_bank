#!/bin/bash
cast send 0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690 \
  "permitDeposit2(uint256,address,uint160,uint48,uint48,uint256,bytes)" \
  1300000000000000000 \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  1300000000000000000 \
  1753779042 \
  0 \
  1753696242 \
  YOUR_SIGNATURE_HERE \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://localhost:8545
