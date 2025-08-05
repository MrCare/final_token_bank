// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/NftMarketUpgradeable.sol";
import "../contracts/NftMarketProxy.sol";
import "../contracts/Token.sol";
import "../contracts/Nft.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract NftMarketUpgradeableTest is Test, IERC721Receiver {
    NftMarketUpgradeable public nftMarket;
    NftMarketProxy public proxy;
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
        
        // 部署可升级合约
        NftMarketUpgradeable implementation = new NftMarketUpgradeable();
        
        bytes memory initData = abi.encodeWithSelector(
            NftMarketUpgradeable.initialize.selector,
            address(nft),
            address(token)
        );
        
        proxy = new NftMarketProxy(
            address(implementation),
            initData
        );
        nftMarket = NftMarketUpgradeable(address(proxy));
        
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
    
    // 测试升级功能
    function testUpgrade() public {
        // 记录当前状态
        (address oldSeller, uint256 oldPrice) = nftMarket.getListing(NFT_ID);
        bytes32 oldMerkleRoot = nftMarket.merkleRoot();
        
        // 部署新的实现合约
        NftMarketUpgradeable newImplementation = new NftMarketUpgradeable();
        
        // 使用UUPS升级 - 直接调用市场合约的升级函数
        nftMarket.upgradeToAndCall(address(newImplementation), "");
        
        // 验证状态保持不变
        (address newSeller, uint256 newPrice) = nftMarket.getListing(NFT_ID);
        assertEq(newSeller, oldSeller);
        assertEq(newPrice, oldPrice);
        assertEq(nftMarket.merkleRoot(), oldMerkleRoot);
    }
    
    // 测试管理员权限
    function testAdminRights() public {
        // 验证当前合约owner
        assertEq(nftMarket.owner(), address(this));
        
        // 非owner不能升级
        NftMarketUpgradeable newImplementation = new NftMarketUpgradeable();
        
        vm.prank(buyer);
        vm.expectRevert();
        nftMarket.upgradeToAndCall(address(newImplementation), "");
        
        // owner可以升级
        nftMarket.upgradeToAndCall(address(newImplementation), "");
    }
    
    // 测试管理员转移
    function testAdminTransfer() public {
        address newAdmin = address(0x999);
        
        // 转移合约所有权
        nftMarket.transferOwnership(newAdmin);
        assertEq(nftMarket.owner(), newAdmin);
        
        // 原owner不能再升级
        NftMarketUpgradeable newImplementation = new NftMarketUpgradeable();
        vm.expectRevert();
        nftMarket.upgradeToAndCall(address(newImplementation), "");
        
        // 新owner可以升级
        vm.prank(newAdmin);
        nftMarket.upgradeToAndCall(address(newImplementation), "");
    }
}