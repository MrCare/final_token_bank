// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NftMarket is Ownable, ReentrancyGuard {
    IERC721 public nftContract;
    IERC20 public tokenContract;
    
    // Merkle Root for whitelist
    bytes32 public merkleRoot;
    
    // NFT listings
    struct Listing {
        address seller;
        uint256 price;
    }
    
    mapping(uint256 => Listing) public listings;
    
    // Events
    event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event NFTSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    event MerkleRootUpdated(bytes32 newMerkleRoot);
    
    constructor(address _nftContract, address _tokenContract) Ownable(msg.sender) {
        nftContract = IERC721(_nftContract);
        tokenContract = IERC20(_tokenContract);
    }
    
    // 1. 新增 multiCall 函数
    function multiCall(bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            require(success, "MultiCall: call failed");
            results[i] = result;
        }
        return results;
    }
    
    // 2. 新增 permitPrePay 函数
    function permitPrePay(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        IERC20Permit(address(tokenContract)).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );
    }
    
    // 3. 修改后的 buyNFT - 去掉白名单验证
    function buyNFT(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller != address(0), "NFT not listed");
        require(listing.seller != msg.sender, "Cannot buy your own NFT");
        
        // 转移 Token
        require(
            tokenContract.transferFrom(msg.sender, listing.seller, listing.price),
            "Token transfer failed"
        );
        
        // 转移 NFT
        nftContract.transferFrom(listing.seller, msg.sender, tokenId);
        
        // 清除挂单
        delete listings[tokenId];
        
        emit NFTSold(tokenId, msg.sender, listing.seller, listing.price);
    }
    
    // 4. 新增 claimNFT 函数 - 通过 Merkle Proof 验证白名单
    function claimNFT(uint256 tokenId, bytes32[] calldata merkleProof) external nonReentrant {
        // 验证白名单
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(merkleProof, merkleRoot, leaf),
            "Invalid whitelist proof"
        );
        
        Listing memory listing = listings[tokenId];
        require(listing.seller != address(0), "NFT not listed");
        require(listing.seller != msg.sender, "Cannot buy your own NFT");
        
        // 转移 Token
        require(
            tokenContract.transferFrom(msg.sender, listing.seller, listing.price),
            "Token transfer failed"
        );
        
        // 转移 NFT
        nftContract.transferFrom(listing.seller, msg.sender, tokenId);
        
        // 清除挂单
        delete listings[tokenId];
        
        emit NFTSold(tokenId, msg.sender, listing.seller, listing.price);
    }
    
    // 上架 NFT
    function listNFT(uint256 tokenId, uint256 price) external {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nftContract.isApprovedForAll(msg.sender, address(this)) ||
            nftContract.getApproved(tokenId) == address(this),
            "Contract not approved"
        );
        require(price > 0, "Price must be greater than 0");
        
        listings[tokenId] = Listing(msg.sender, price);
        
        emit NFTListed(tokenId, msg.sender, price);
    }
    
    // 下架 NFT
    function delistNFT(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not the seller");
        delete listings[tokenId];
    }
    
    // 更新 Merkle Root (仅管理员)
    function updateMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }
    
    // 获取挂单信息
    function getListing(uint256 tokenId) external view returns (address seller, uint256 price) {
        Listing memory listing = listings[tokenId];
        return (listing.seller, listing.price);
    }
}