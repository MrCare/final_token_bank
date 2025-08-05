// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/NftMarketUpgradeableV2.sol";
import "../contracts/NftMarketProxy.sol";
import "../contracts/Token.sol";
import "../contracts/Nft.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract NftMarketUpgradeableV2Test is Test, IERC721Receiver {
    NftMarketUpgradeableV2 public nftMarket;
    NftMarketProxy public proxy;
    FinalCarToken public token;
    Nft public nft;
    
    // 测试用户
    address public owner;
    address public seller;  // 将从私钥计算得出
    address public buyer = address(0x3);
    address public whitelistUser = address(0x4);
    
    uint256 public constant TOKEN_PRICE = 10 * 10**18; // 10 tokens
    uint256 public NFT_ID;
    
    // Merkle Tree 数据
    bytes32[] public merkleProof;
    bytes32 public merkleRoot;
    
    // 签名测试用的私钥
    uint256 private sellerPrivateKey = 0xA11CE;
    
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
        owner = address(this);
        
        // 从私钥计算seller地址
        seller = vm.addr(sellerPrivateKey);
        
        // 部署合约
        token = new FinalCarToken();
        nft = new Nft("QmTest123");
        
        // 部署V2可升级合约
        NftMarketUpgradeableV2 implementation = new NftMarketUpgradeableV2();
        
        bytes memory initData = abi.encodeWithSelector(
            NftMarketUpgradeableV2.initialize.selector,
            address(nft),
            address(token)
        );
        
        proxy = new NftMarketProxy(
            address(implementation),
            initData
        );
        nftMarket = NftMarketUpgradeableV2(address(proxy));
        
        // 分发代币
        token.transfer(buyer, 30 * 10**18);
        token.transfer(whitelistUser, 30 * 10**18);
        
        // 设置Merkle Tree
        setupMerkleTree();
        
        // seller获得NFT
        vm.deal(seller, 1 ether);
        vm.prank(seller);
        nft.mint{value: 0.01 ether}(seller);
        
        NFT_ID = 2; // seller的NFT ID
        
        // seller给市场合约setApprovalForAll授权
        vm.prank(seller);
        nft.setApprovalForAll(address(nftMarket), true);
    }
    
    function setupMerkleTree() internal {
        address[] memory whitelist = new address[](2);
        whitelist[0] = whitelistUser;
        whitelist[1] = address(0x5);
        
        bytes32[] memory leaves = new bytes32[](whitelist.length);
        for (uint i = 0; i < whitelist.length; i++) {
            leaves[i] = keccak256(abi.encodePacked(whitelist[i]));
        }
        
        if (leaves[0] < leaves[1]) {
            merkleRoot = keccak256(abi.encodePacked(leaves[0], leaves[1]));
            merkleProof = new bytes32[](1);
            merkleProof[0] = leaves[1];
        } else {
            merkleRoot = keccak256(abi.encodePacked(leaves[1], leaves[0]));
            merkleProof = new bytes32[](1);
            merkleProof[0] = leaves[1];
        }
        
        nftMarket.updateMerkleRoot(merkleRoot);
    }
    
    // 测试V2版本号
    function testVersion() public view {
        assertEq(nftMarket.version(), "2.0.0");
    }
    
    // 测试域分隔符
    function testDomainSeparator() public view {
        bytes32 expected = keccak256(
            abi.encode(
                nftMarket.DOMAIN_TYPEHASH(),
                keccak256(bytes("NftMarketV2")),
                keccak256(bytes("2")),
                block.chainid,
                address(nftMarket)
            )
        );
        assertEq(nftMarket.getDomainSeparator(), expected);
    }
    
    // 测试离线签名上架NFT
    function testListNFTWithSignature() public {
        uint256 tokenId = NFT_ID;
        uint256 price = TOKEN_PRICE;
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;
        
        // 生成签名
        (uint8 v, bytes32 r, bytes32 s) = _generateListSignature(
            tokenId, price, nonce, deadline
        );
        
        // 使用签名上架NFT
        nftMarket.listNFTWithSignature(tokenId, price, nonce, deadline, v, r, s);
        
        // 验证NFT已上架
        (address listSeller, uint256 listPrice) = nftMarket.getListing(tokenId);
        assertEq(listSeller, seller);
        assertEq(listPrice, price);
    }
    
    // 测试过期签名
    function testListNFTWithExpiredSignature() public {
        uint256 tokenId = NFT_ID;
        uint256 price = TOKEN_PRICE;
        uint256 nonce = 1;
        uint256 deadline = block.timestamp - 1; // 过期的截止时间
        
        (uint8 v, bytes32 r, bytes32 s) = _generateListSignature(
            tokenId, price, nonce, deadline
        );
        
        vm.expectRevert("Signature expired");
        nftMarket.listNFTWithSignature(tokenId, price, nonce, deadline, v, r, s);
    }
    
    // 测试重复使用签名
    function testListNFTWithUsedSignature() public {
        uint256 tokenId = NFT_ID;
        uint256 price = TOKEN_PRICE;
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;
        
        (uint8 v, bytes32 r, bytes32 s) = _generateListSignature(
            tokenId, price, nonce, deadline
        );
        
        // 第一次使用签名
        nftMarket.listNFTWithSignature(tokenId, price, nonce, deadline, v, r, s);
        
        // 下架NFT
        vm.prank(seller);
        nftMarket.delistNFT(tokenId);
        
        // 尝试重复使用签名
        vm.expectRevert("Signature already used");
        nftMarket.listNFTWithSignature(tokenId, price, nonce, deadline, v, r, s);
    }
    
    // 测试无效签名
    function testListNFTWithInvalidSignature() public {
        uint256 tokenId = NFT_ID;
        uint256 price = TOKEN_PRICE;
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;
        
        // 使用错误的私钥生成签名
        (uint8 v, bytes32 r, bytes32 s) = _generateListSignatureWithKey(
            tokenId, price, nonce, deadline, 0x999 // 错误的私钥
        );
        
        vm.expectRevert("Invalid signature or not token owner");
        nftMarket.listNFTWithSignature(tokenId, price, nonce, deadline, v, r, s);
    }
    
    // 测试批量签名上架
    function testBatchListNFTWithSignature() public {
        // 给seller更多NFT
        vm.startPrank(seller);
        nft.mint{value: 0.01 ether}(seller); // 这将是ID 3
        nft.mint{value: 0.01 ether}(seller); // 这将是ID 4
        vm.stopPrank();
        
        uint256[] memory tokenIds = new uint256[](3);
        uint256[] memory prices = new uint256[](3);
        uint256[] memory nonces = new uint256[](3);
        uint256[] memory deadlines = new uint256[](3);
        uint8[] memory vs = new uint8[](3);
        bytes32[] memory rs = new bytes32[](3);
        bytes32[] memory ss = new bytes32[](3);
        
        // 使用正确的tokenId序列: 2, 3, 4
        tokenIds[0] = NFT_ID;      // 2
        tokenIds[1] = NFT_ID + 1;  // 3  
        tokenIds[2] = NFT_ID + 2;  // 4
        
        for (uint256 i = 0; i < 3; i++) {
            prices[i] = TOKEN_PRICE + i * 1e18;
            nonces[i] = i + 1;
            deadlines[i] = block.timestamp + 1 hours;
            
            (vs[i], rs[i], ss[i]) = _generateListSignature(
                tokenIds[i], prices[i], nonces[i], deadlines[i]
            );
        }
        
        // 批量上架
        nftMarket.batchListNFTWithSignature(
            tokenIds, prices, nonces, deadlines, vs, rs, ss
        );
        
        // 验证所有NFT都已上架
        for (uint256 i = 0; i < 3; i++) {
            (address listSeller, uint256 listPrice) = nftMarket.getListing(tokenIds[i]);
            assertEq(listSeller, seller);
            assertEq(listPrice, prices[i]);
        }
    }
    
    // 测试签名上架后购买NFT
    function testBuyNFTAfterSignatureListing() public {
        uint256 tokenId = NFT_ID;
        uint256 price = TOKEN_PRICE;
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;
        
        // 使用签名上架NFT
        (uint8 v, bytes32 r, bytes32 s) = _generateListSignature(
            tokenId, price, nonce, deadline
        );
        nftMarket.listNFTWithSignature(tokenId, price, nonce, deadline, v, r, s);
        
        // buyer购买NFT
        vm.startPrank(buyer);
        token.approve(address(nftMarket), price);
        nftMarket.buyNFT(tokenId);
        vm.stopPrank();
        
        // 验证NFT所有权已转移
        assertEq(nft.ownerOf(tokenId), buyer);
        
        // 验证代币已转移
        assertEq(token.balanceOf(seller), price);
    }
    
    // 辅助函数：生成签名
    function _generateListSignature(
        uint256 tokenId,
        uint256 price,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        return _generateListSignatureWithKey(tokenId, price, nonce, deadline, sellerPrivateKey);
    }
    
    function _generateListSignatureWithKey(
        uint256 tokenId,
        uint256 price,
        uint256 nonce,
        uint256 deadline,
        uint256 privateKey
    ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 structHash = keccak256(
            abi.encode(
                nftMarket.LIST_NFT_TYPEHASH(),
                tokenId,
                price,
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                nftMarket.getDomainSeparator(),
                structHash
            )
        );
        
        return vm.sign(privateKey, digest);
    }
    
    // 测试向后兼容性 - 原有的直接上架功能仍然有效
    function testBackwardCompatibility() public {
        uint256 tokenId = NFT_ID;
        uint256 price = TOKEN_PRICE;
        
        // 使用原有的直接上架方法
        vm.prank(seller);
        nftMarket.listNFT(tokenId, price);
        
        // 验证NFT已上架
        (address listSeller, uint256 listPrice) = nftMarket.getListing(tokenId);
        assertEq(listSeller, seller);
        assertEq(listPrice, price);
    }
}
