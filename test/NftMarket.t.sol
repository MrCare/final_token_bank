// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/NftMarket.sol";
import "../contracts/Token.sol";
import "../contracts/Nft.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract NftMarketTest is Test, IERC721Receiver {
    NftMarket public nftMarket;
    FinalCarToken public token;
    Nft public nft;
    
    // 使用 Foundry 的标准测试地址
    address public owner;
    address public seller = address(0x2);
    address public buyer = address(0x3);
    address public whitelistUser = address(0x4);
    
    uint256 public constant TOKEN_PRICE = 10 * 10**18; // 10 tokens
    uint256 public NFT_ID; // 动态设置 NFT ID
    
    // Merkle Tree 数据
    bytes32[] public merkleProof;
    bytes32 public merkleRoot;
    
    // 实现 IERC721Receiver 接口
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
    
    function setUp() public {
        // 使用 address(this) 作为 owner
        owner = address(this);
        
        // 部署合约
        token = new FinalCarToken();
        nft = new Nft("QmTest123");
        nftMarket = new NftMarket(address(nft), address(token));
        
        // 检查当前 NFT 状态
        console.log("NFT contract deployed, checking token count...");
        
        // 检查 token 合约的真实 owner
        uint256 ownerBalance = token.balanceOf(owner);
        console.log("Token deployer (owner):", owner);
        console.log("Owner token balance:", ownerBalance);
        
        // 确认有足够的代币
        require(ownerBalance >= 60 * 10**18, "Owner doesn't have enough tokens");
        
        // 给用户分发代币
        token.transfer(buyer, 30 * 10**18);
        token.transfer(whitelistUser, 30 * 10**18);
        
        // 设置 Merkle Tree
        setupMerkleTree();
        
        // 给 seller 一些 ETH 用于 mint NFT
        vm.deal(seller, 1 ether);
        
        // seller 获得 NFT
        vm.prank(seller);
        nft.mint{value: 0.01 ether}(seller);
        
        // 获取 seller 刚刚 mint 的 NFT ID
        // 如果部署时已经有一个 NFT，那么 seller 的是第二个
        try nft.ownerOf(2) returns (address nftOwner) {
            if (nftOwner == seller) {
                NFT_ID = 2;
            }
        } catch {
            // 如果没有 NFT ID 2，检查 NFT ID 1
            if (nft.ownerOf(1) == seller) {
                NFT_ID = 1;
            }
        }
        
        console.log("Seller NFT ID:", NFT_ID);
        console.log("NFT owner:", nft.ownerOf(NFT_ID));
        
        // 验证 NFT 是否 mint 成功
        assertEq(nft.ownerOf(NFT_ID), seller);
        
        // seller 授权 NFT 给市场
        vm.prank(seller);
        nft.setApprovalForAll(address(nftMarket), true);
        
        // seller 上架 NFT
        vm.prank(seller);
        nftMarket.listNFT(NFT_ID, TOKEN_PRICE);
    }
    
    function setupMerkleTree() internal {
        // 创建白名单地址数组
        address[] memory whitelist = new address[](2);
        whitelist[0] = whitelistUser;
        whitelist[1] = address(0x5); // 另一个白名单地址
        
        // 生成叶子节点
        bytes32[] memory leaves = new bytes32[](whitelist.length);
        for (uint i = 0; i < whitelist.length; i++) {
            leaves[i] = keccak256(abi.encodePacked(whitelist[i]));
        }
        
        // 计算 Merkle Root (简单的两层树)
        if (leaves[0] < leaves[1]) {
            merkleRoot = keccak256(abi.encodePacked(leaves[0], leaves[1]));
            merkleProof = new bytes32[](1);
            merkleProof[0] = leaves[1];
        } else {
            merkleRoot = keccak256(abi.encodePacked(leaves[1], leaves[0]));
            merkleProof = new bytes32[](1);
            merkleProof[0] = leaves[1];
        }
        
        // 设置 Merkle Root
        nftMarket.updateMerkleRoot(merkleRoot);
    }
    
    // 测试基本设置
    function testSetup() public view {
        // 验证合约地址
        assertTrue(address(nftMarket) != address(0));
        assertTrue(address(token) != address(0));
        assertTrue(address(nft) != address(0));
        
        // 验证代币余额
        assertEq(token.balanceOf(buyer), 30 * 10**18);
        assertEq(token.balanceOf(whitelistUser), 30 * 10**18);
        
        // 验证 NFT 所有权
        assertEq(nft.ownerOf(NFT_ID), seller);
        
        // 验证挂单
        (address listingSeller, uint256 listingPrice) = nftMarket.getListing(NFT_ID);
        assertEq(listingSeller, seller);
        assertEq(listingPrice, TOKEN_PRICE);
    }
    
    // 测试 1: multiCall 函数
    function testMultiCall() public {
        bytes[] memory calls = new bytes[](2);
        
        calls[0] = abi.encodeWithSelector(
            nftMarket.getListing.selector,
            NFT_ID
        );
        
        calls[1] = abi.encodeWithSelector(
            nftMarket.merkleRoot.selector
        );
        
        vm.prank(buyer);
        bytes[] memory results = nftMarket.multiCall(calls);
        
        assertEq(results.length, 2);
        
        (address resultSeller, uint256 resultPrice) = abi.decode(results[0], (address, uint256));
        assertEq(resultSeller, seller);
        assertEq(resultPrice, TOKEN_PRICE);
        
        bytes32 resultMerkleRoot = abi.decode(results[1], (bytes32));
        assertEq(resultMerkleRoot, merkleRoot);
    }
    
    // 测试 2: buyNFT 函数
    function testBuyNFT() public {
        vm.prank(buyer);
        token.approve(address(nftMarket), TOKEN_PRICE);
        
        uint256 sellerBalanceBefore = token.balanceOf(seller);
        uint256 buyerBalanceBefore = token.balanceOf(buyer);
        
        vm.prank(buyer);
        nftMarket.buyNFT(NFT_ID);
        
        assertEq(nft.ownerOf(NFT_ID), buyer);
        assertEq(token.balanceOf(seller), sellerBalanceBefore + TOKEN_PRICE);
        assertEq(token.balanceOf(buyer), buyerBalanceBefore - TOKEN_PRICE);
        
        (address listingSeller, uint256 listingPrice) = nftMarket.getListing(NFT_ID);
        assertEq(listingSeller, address(0));
        assertEq(listingPrice, 0);
    }
    
    // 测试 3: claimNFT 函数
    function testClaimNFT() public {
        vm.prank(whitelistUser);
        token.approve(address(nftMarket), TOKEN_PRICE);
        
        uint256 sellerBalanceBefore = token.balanceOf(seller);
        uint256 whitelistUserBalanceBefore = token.balanceOf(whitelistUser);
        
        vm.prank(whitelistUser);
        nftMarket.claimNFT(NFT_ID, merkleProof);
        
        assertEq(nft.ownerOf(NFT_ID), whitelistUser);
        assertEq(token.balanceOf(seller), sellerBalanceBefore + TOKEN_PRICE);
        assertEq(token.balanceOf(whitelistUser), whitelistUserBalanceBefore - TOKEN_PRICE);
        
        (address listingSeller, uint256 listingPrice) = nftMarket.getListing(NFT_ID);
        assertEq(listingSeller, address(0));
        assertEq(listingPrice, 0);
    }
    
    // 测试 4: claimNFT 失败 - 非白名单用户
    function testClaimNFTFailsForNonWhitelistUser() public {
        vm.prank(buyer);
        token.approve(address(nftMarket), TOKEN_PRICE);
        
        vm.expectRevert("Invalid whitelist proof");
        vm.prank(buyer);
        nftMarket.claimNFT(NFT_ID, merkleProof);
    }
    
    // 测试 5: 更新 Merkle Root
    function testUpdateMerkleRoot() public {
        bytes32 newRoot = keccak256("new root");
        
        nftMarket.updateMerkleRoot(newRoot);
        
        assertEq(nftMarket.merkleRoot(), newRoot);
    }
    
    // 测试 6: 非 owner 无法更新 Merkle Root
    function testUpdateMerkleRootFailsForNonOwner() public {
        bytes32 newRoot = keccak256("new root");
        
        vm.expectRevert();
        vm.prank(buyer);
        nftMarket.updateMerkleRoot(newRoot);
    }
    
    // 测试 7: permitPrePay 与 claimNFT 的 multiCall 组合
    function testPermitPrePayAndClaimWithMultiCall() public {
        uint256 amount = TOKEN_PRICE;
        uint256 deadline = block.timestamp + 1 hours;
        
        // 为了测试 permit，我们需要使用有私钥的地址
        uint256 privateKey = 0x1234567890123456789012345678901234567890123456789012345678901234;
        address testUser = vm.addr(privateKey);
        
        // 给测试用户分发代币
        token.transfer(testUser, amount);
        
        // 构建 permit 签名
        bytes32 structHash = keccak256(abi.encode(
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
            testUser,
            address(nftMarket),
            amount,
            token.nonces(testUser),
            deadline
        ));
        
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            token.DOMAIN_SEPARATOR(),
            structHash
        ));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        
        // 将测试用户添加到白名单
        address[] memory newWhitelist = new address[](1);
        newWhitelist[0] = testUser;
        bytes32 newLeaf = keccak256(abi.encodePacked(testUser));
        bytes32 newRoot = newLeaf; // 单节点树
        bytes32[] memory newProof = new bytes32[](0); // 单节点不需要proof
        
        nftMarket.updateMerkleRoot(newRoot);
        
        // 准备 multiCall 数据：permitPrePay + claimNFT
        bytes[] memory calls = new bytes[](2);
        calls[0] = abi.encodeWithSelector(
            nftMarket.permitPrePay.selector,
            amount, deadline, v, r, s
        );
        calls[1] = abi.encodeWithSelector(
            nftMarket.claimNFT.selector,
            NFT_ID, newProof
        );
        
        uint256 sellerBalanceBefore = token.balanceOf(seller);
        
        // 执行 multiCall
        vm.prank(testUser);
        nftMarket.multiCall(calls);
        
        // 验证结果
        assertEq(nft.ownerOf(NFT_ID), testUser);
        assertEq(token.balanceOf(seller), sellerBalanceBefore + TOKEN_PRICE);
        assertEq(token.balanceOf(testUser), 0);
        
        // 验证授权已生效
        assertEq(token.allowance(testUser, address(nftMarket)), 0); // 应该已被使用
    }

    // 测试 8: 单独的 permitPrePay 函数
    function testPermitPrePayOnly() public {
        uint256 amount = TOKEN_PRICE;
        uint256 deadline = block.timestamp + 1 hours;
        
        uint256 privateKey = 0x1234567890123456789012345678901234567890123456789012345678901234;
        address testUser = vm.addr(privateKey);
        
        token.transfer(testUser, amount);
        
        // 构建 permit 签名
        bytes32 structHash = keccak256(abi.encode(
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
            testUser,
            address(nftMarket),
            amount,
            token.nonces(testUser),
            deadline
        ));
        
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            token.DOMAIN_SEPARATOR(),
            structHash
        ));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        
        // 执行 permitPrePay
        vm.prank(testUser);
        nftMarket.permitPrePay(amount, deadline, v, r, s);
        
        // 验证授权成功
        assertEq(token.allowance(testUser, address(nftMarket)), amount);
    }
}