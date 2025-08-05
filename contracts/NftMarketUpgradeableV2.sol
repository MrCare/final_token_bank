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
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract NftMarketUpgradeableV2 is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

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
    
    // V2 新增：签名上架相关
    mapping(bytes32 => bool) public usedSignatures; // 防止签名重放
    
    // EIP-712 域分隔符相关常量
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    
    bytes32 public constant LIST_NFT_TYPEHASH = keccak256(
        "ListNFT(uint256 tokenId,uint256 price,uint256 nonce,uint256 deadline)"
    );
    
    string public constant DOMAIN_NAME = "NftMarketV2";
    string public constant DOMAIN_VERSION = "2";
    
    // Events
    event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event NFTSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    event MerkleRootUpdated(bytes32 newMerkleRoot);
    event NFTListedWithSignature(uint256 indexed tokenId, address indexed seller, uint256 price, bytes32 signatureHash);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address _nftContract, address _tokenContract) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        nftContract = IERC721(_nftContract);
        tokenContract = IERC20(_tokenContract);
    }
    
    // V2 新增：获取域分隔符
    function getDomainSeparator() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(DOMAIN_NAME)),
                keccak256(bytes(DOMAIN_VERSION)),
                block.chainid,
                address(this)
            )
        );
    }
    
    // V2 新增：离线签名上架NFT
    function listNFTWithSignature(
        uint256 tokenId,
        uint256 price,
        uint256 nonce,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        _listNFTWithSignature(tokenId, price, nonce, deadline, v, r, s);
    }
    
    // V2 新增：批量签名上架多个NFT
    function batchListNFTWithSignature(
        uint256[] calldata tokenIds,
        uint256[] calldata prices,
        uint256[] calldata nonces,
        uint256[] calldata deadlines,
        uint8[] calldata vs,
        bytes32[] calldata rs,
        bytes32[] calldata ss
    ) external {
        require(
            tokenIds.length == prices.length &&
            prices.length == nonces.length &&
            nonces.length == deadlines.length &&
            deadlines.length == vs.length &&
            vs.length == rs.length &&
            rs.length == ss.length,
            "Arrays length mismatch"
        );
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _listNFTWithSignature(
                tokenIds[i],
                prices[i],
                nonces[i],
                deadlines[i],
                vs[i],
                rs[i],
                ss[i]
            );
        }
    }
    
    // 内部函数，用于批量调用
    function _listNFTWithSignature(
        uint256 tokenId,
        uint256 price,
        uint256 nonce,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal {
        require(block.timestamp <= deadline, "Signature expired");
        require(price > 0, "Price must be greater than 0");
        
        // 构造并验证签名
        bytes32 digest = _buildDigest(tokenId, price, nonce, deadline);
        
        // 检查签名是否已使用
        require(!usedSignatures[digest], "Signature already used");
        
        // 验证签名
        address signer = digest.recover(v, r, s);
        require(signer == nftContract.ownerOf(tokenId), "Invalid signature or not token owner");
        
        // 检查合约是否被授权
        require(
            nftContract.isApprovedForAll(signer, address(this)),
            "Contract not approved for all tokens"
        );
        
        // 标记签名为已使用
        usedSignatures[digest] = true;
        
        // 上架NFT
        listings[tokenId] = Listing(signer, price);
        
        emit NFTListed(tokenId, signer, price);
        emit NFTListedWithSignature(tokenId, signer, price, digest);
    }
    
    // 辅助函数：构建签名摘要
    function _buildDigest(
        uint256 tokenId,
        uint256 price,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                LIST_NFT_TYPEHASH,
                tokenId,
                price,
                nonce,
                deadline
            )
        );
        
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                getDomainSeparator(),
                structHash
            )
        );
    }
    
    // 原有的 multiCall 函数
    function multiCall(bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            require(success, "MultiCall: call failed");
            results[i] = result;
        }
        return results;
    }
    
    // 原有的 permitPrePay 函数
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
    
    // 原有的 buyNFT 函数
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
    
    // 原有的 claimNFT 函数
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
    
    // 原有的直接上架函数（保持向后兼容）
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
    
    // V2 新增：检查签名是否已使用
    function isSignatureUsed(bytes32 signatureHash) external view returns (bool) {
        return usedSignatures[signatureHash];
    }
    
    // V2 新增：获取签名哈希（用于前端预览）
    function getListNFTHash(
        uint256 tokenId,
        uint256 price,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32) {
        return _buildDigest(tokenId, price, nonce, deadline);
    }
    
    // UUPS升级授权函数 - 只有owner可以升级
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    // V2 版本标识
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
