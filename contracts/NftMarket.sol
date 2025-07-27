// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract NFTMarket is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    // NFT 合约接口
    IERC721 public immutable nftContract;
    // Token 合约接口 - 分别声明两个接口
    IERC20 public immutable tokenContract;
    IERC20Permit public immutable tokenPermitContract;
    
    // 挂单结构体
    struct Listing {
        address seller;     // 卖家地址
        uint256 price;      // 价格 (以 token 为单位)
        bool active;        // 是否激活
    }
    
    // 存储所有挂单信息
    mapping(uint256 => Listing) public listings;
    
    // 事件
    event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event NFTSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    
    constructor(address _nftContract, address _tokenContract) Ownable(msg.sender) {
        require(_nftContract != address(0), "Invalid NFT contract address");
        require(_tokenContract != address(0), "Invalid Token contract address");
        nftContract = IERC721(_nftContract);
        tokenContract = IERC20(_tokenContract);
        tokenPermitContract = IERC20Permit(_tokenContract);
    }
    
    /**
     * @dev 上架 NFT
     * @param tokenId NFT Token ID
     * @param price NFT 价格 (以 token 为单位)
     */
    function listNFT(uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be greater than zero");
        require(nftContract.ownerOf(tokenId) == msg.sender, "You don't own this NFT");
        require(
            nftContract.isApprovedForAll(msg.sender, address(this)) || 
            nftContract.getApproved(tokenId) == address(this),
            "Market not approved to transfer NFT"
        );
        require(!listings[tokenId].active, "NFT already listed");
        
        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });
        
        emit NFTListed(tokenId, msg.sender, price);
    }
    
    /**
     * @dev 使用签名授权购买 NFT (内置 Token permit)
     * @param tokenId NFT Token ID
     * @param signature 合约拥有者对买家地址的签名
     * @param deadline permit 过期时间
     * @param v permit 签名参数
     * @param r permit 签名参数
     * @param s permit 签名参数
     */
    function permitBuy(
        uint256 tokenId, 
        bytes calldata signature,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        Listing storage listing = listings[tokenId];
        
        require(listing.active, "NFT not listed for sale");
        require(msg.sender != listing.seller, "Cannot buy your own NFT");
        require(nftContract.ownerOf(tokenId) == listing.seller, "Seller no longer owns this NFT");
        
        // 验证 NFT 购买签名
        bytes32 messageHash = _getMessage(msg.sender);
        address signer = messageHash.toEthSignedMessageHash().recover(signature);
        require(signer == owner(), "Invalid signature: not signed by contract owner");
        
        // 使用 permit 授权 token
        tokenPermitContract.permit(
            msg.sender,
            address(this),
            listing.price,
            deadline,
            v,
            r,
            s
        );
        
        // 保存数据
        address seller = listing.seller;
        uint256 price = listing.price;
        
        // 删除挂单
        delete listings[tokenId];
        
        // 转移 NFT
        nftContract.transferFrom(seller, msg.sender, tokenId);
        
        // 转移 Token 给卖家 (使用 IERC20 接口)
        bool success = tokenContract.transferFrom(msg.sender, seller, price);
        require(success, "Token transfer to seller failed");
        
        emit NFTSold(tokenId, seller, msg.sender, price);
    }
    
    /**
     * @dev 直接购买 NFT (需要预先授权 Token)
     * @param tokenId NFT Token ID
     */
    function buyNFT(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        
        require(listing.active, "NFT not listed for sale");
        require(msg.sender != listing.seller, "Cannot buy your own NFT");
        require(nftContract.ownerOf(tokenId) == listing.seller, "Seller no longer owns this NFT");
        
        // 检查买家 Token 余额和授权
        require(tokenContract.balanceOf(msg.sender) >= listing.price, "Insufficient token balance");
        require(tokenContract.allowance(msg.sender, address(this)) >= listing.price, 
                "Insufficient token allowance");
        
        // 保存数据
        address seller = listing.seller;
        uint256 price = listing.price;
        
        // 删除挂单
        delete listings[tokenId];
        
        // 转移 NFT
        nftContract.transferFrom(seller, msg.sender, tokenId);
        
        // 转移 Token 给卖家
        bool success = tokenContract.transferFrom(msg.sender, seller, price);
        require(success, "Token transfer to seller failed");
        
        emit NFTSold(tokenId, seller, msg.sender, price);
    }
    
    /**
     * @dev 生成用于签名的消息哈希
     * @param buyer 买家地址
     * @return 消息哈希
     */
    function _getMessage(address buyer) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(buyer)));
    }
    
    /**
     * @dev 取消挂单
     */
    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        
        require(listing.active, "NFT not listed");
        require(listing.seller == msg.sender || owner() == msg.sender, "Only seller or owner can cancel");
        
        address seller = listing.seller;
        delete listings[tokenId];
        
        emit ListingCancelled(tokenId, seller);
    }
    
    /**
     * @dev 获取挂单信息
     */
    function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active) {
        Listing memory listing = listings[tokenId];
        return (listing.seller, listing.price, listing.active);
    }
    
    /**
     * @dev 检查 NFT 是否已上架
     */
    function isListed(uint256 tokenId) external view returns (bool) {
        return listings[tokenId].active;
    }
    
    /**
     * @dev 获取 Token 合约地址
     */
    function getTokenContract() external view returns (address) {
        return address(tokenContract);
    }
}