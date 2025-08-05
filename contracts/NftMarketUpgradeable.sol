// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract NftMarketUpgradeable is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
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
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address _nftContract, address _tokenContract) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();

        nftContract = IERC721(_nftContract);
        tokenContract = IERC20(_tokenContract);
    }
    
    // 1. multiCall 函数
    function multiCall(bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            require(success, "MultiCall: call failed");
            results[i] = result;
        }
        return results;
    }
    
    // 2. permitPrePay 函数
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
    
    // 3. buyNFT 函数
    function buyNFT(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller != address(0), "NFT not listed");
        require(listing.seller != msg.sender, "Cannot buy your own NFT");
        
        require(
            tokenContract.transferFrom(msg.sender, listing.seller, listing.price),
            "Token transfer failed"
        );
        
        nftContract.transferFrom(listing.seller, msg.sender, tokenId);
        
        delete listings[tokenId];
        
        emit NFTSold(tokenId, msg.sender, listing.seller, listing.price);
    }
    
    // 4. claimNFT 函数
    function claimNFT(uint256 tokenId, bytes32[] calldata merkleProof) external nonReentrant {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(merkleProof, merkleRoot, leaf),
            "Invalid whitelist proof"
        );
        
        Listing memory listing = listings[tokenId];
        require(listing.seller != address(0), "NFT not listed");
        require(listing.seller != msg.sender, "Cannot buy your own NFT");
        
        require(
            tokenContract.transferFrom(msg.sender, listing.seller, listing.price),
            "Token transfer failed"
        );
        
        nftContract.transferFrom(listing.seller, msg.sender, tokenId);
        
        delete listings[tokenId];
        
        emit NFTSold(tokenId, msg.sender, listing.seller, listing.price);
    }
    
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
    
    function delistNFT(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not the seller");
        delete listings[tokenId];
    }
    
    function updateMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }
    
    function getListing(uint256 tokenId) external view returns (address seller, uint256 price) {
        Listing memory listing = listings[tokenId];
        return (listing.seller, listing.price);
    }
    
    // UUPS升级授权函数 - 只有owner可以升级
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}