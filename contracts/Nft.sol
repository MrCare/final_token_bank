// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Nft is ERC721, Ownable {
    string public ipfsHash;
    uint256 public totalAmount = 1;

    constructor(string memory ipfsHash_) ERC721("FinalCarNft", "FCNFT") Ownable(msg.sender) {
        ipfsHash = ipfsHash_;
        _safeMint(msg.sender, 1);
    }
    function _baseURI() internal view virtual override returns (string memory) {
        return string(abi.encodePacked("ipfs://", ipfsHash, "/"));
    }
        // 重写 tokenURI 函数，只返回 IPFS 格式
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        require(bytes(ipfsHash).length > 0, "IPFS hash not set");
        if (tokenId < 1 || tokenId > totalAmount) {
            revert("Token ID does not exist");
        } else if (tokenId < 3) {
            return string(abi.encodePacked(
                "ipfs://",
                ipfsHash,
                "/",
                Strings.toString(tokenId),
                ".json"
            ));
        } else {
            return string(abi.encodePacked(
                "ipfs://",
                ipfsHash,
                "/common.json"
            ));
        }
    }
    // 管理员可以后期修改IPFS文件夹地址
    function setIpfsHash(string memory ipfsHash_) public onlyOwner {
        ipfsHash = ipfsHash_;
    }
    // 付费铸造,第一个
    function mint(address to) external payable {
        require(to != address(0), "Cannot mint to the zero address");
        if (totalAmount + 1 == 2){
            require(msg.value >= 0.01 ether, "Minting special nft requires at least 0.01 ether");
        } else {
            require(msg.value >= 0.001 ether, "Minting requires at least 0.001 ether");
        }
        _safeMint(to, totalAmount + 1);
        totalAmount += 1;
    }
    // 管理员销毁
    function burn(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
    }
    // 提现合约余额
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}