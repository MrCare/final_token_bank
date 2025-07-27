#!/bin/bash

# NFT Market 签名生成脚本
# 使用 Anvil 测试账户对买家地址进行签名

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== NFT Market 签名生成工具 ===${NC}"
echo ""

# 默认 Anvil 账户 (合约拥有者)
OWNER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
OWNER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}用法: $0 <买家地址> [合约拥有者私钥]${NC}"
    echo ""
    echo -e "${BLUE}示例:${NC}"
    echo "  $0 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    echo "  $0 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    echo ""
    echo -e "${YELLOW}默认使用 Anvil 第一个账户作为合约拥有者:${NC}"
    echo "  地址: $OWNER_ADDRESS"
    echo "  私钥: $OWNER_PRIVATE_KEY"
    exit 1
fi

BUYER_ADDRESS=$1

# 如果提供了自定义私钥，使用它
if [ $# -eq 2 ]; then
    OWNER_PRIVATE_KEY=$2
    echo -e "${YELLOW}使用自定义私钥${NC}"
fi

echo -e "${GREEN}配置信息:${NC}"
echo "  买家地址: $BUYER_ADDRESS"
echo "  合约拥有者私钥: ${OWNER_PRIVATE_KEY:0:10}..."
echo ""

# 验证地址格式
if [[ ! $BUYER_ADDRESS =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo -e "${RED}错误: 买家地址格式不正确${NC}"
    echo "地址必须是 42 位十六进制字符串，以 0x 开头"
    exit 1
fi

# 验证私钥格式
if [[ ! $OWNER_PRIVATE_KEY =~ ^0x[a-fA-F0-9]{64}$ ]]; then
    echo -e "${RED}错误: 私钥格式不正确${NC}"
    echo "私钥必须是 66 位十六进制字符串，以 0x 开头"
    exit 1
fi

echo -e "${BLUE}正在生成签名...${NC}"

# 方法1: 直接对买家地址签名 (对应合约中的 bytes32(uint256(uint160(buyer))))
echo -e "${YELLOW}方法1: 直接地址签名${NC}"

# 将地址转换为 bytes32 (左填充零)
PADDED_ADDRESS=$(printf "0x%064s" "${BUYER_ADDRESS:2}")
echo "  填充后地址: $PADDED_ADDRESS"

# 使用 cast 签名
SIGNATURE1=$(cast wallet sign --private-key $OWNER_PRIVATE_KEY "$PADDED_ADDRESS" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✅ 签名成功:${NC}"
    echo "  签名: $SIGNATURE1"
else
    echo -e "  ${RED}❌ 签名失败${NC}"
fi

echo ""

# 方法2: 使用消息哈希签名 (更安全的方式)
echo -e "${YELLOW}方法2: 消息哈希签名${NC}"

# 生成消息哈希 (对应 keccak256(abi.encodePacked("PERMIT_BUY", buyer)))
MESSAGE="PERMIT_BUY$BUYER_ADDRESS"
echo "  消息内容: $MESSAGE"

# 计算 keccak256 哈希
MESSAGE_HASH=$(cast keccak "$MESSAGE")
echo "  消息哈希: $MESSAGE_HASH"

# 签名哈希
SIGNATURE2=$(cast wallet sign --private-key $OWNER_PRIVATE_KEY "$MESSAGE_HASH" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✅ 签名成功:${NC}"
    echo "  签名: $SIGNATURE2"
else
    echo -e "  ${RED}❌ 签名失败${NC}"
fi

echo ""

# 方法3: EIP-191 标准签名 (推荐)
echo -e "${YELLOW}方法3: EIP-191 标准签名${NC}"

# 使用 cast wallet sign 的 --message 参数进行 EIP-191 签名
SIGNATURE3=$(cast wallet sign --private-key $OWNER_PRIVATE_KEY --message "$PADDED_ADDRESS" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✅ 签名成功:${NC}"
    echo "  签名: $SIGNATURE3"
else
    echo -e "  ${RED}❌ 签名失败${NC}"
fi

echo ""
echo -e "${BLUE}=== 签名结果总结 ===${NC}"
echo -e "${GREEN}方法1 (直接地址):${NC} $SIGNATURE1"
echo -e "${GREEN}方法2 (消息哈希):${NC} $SIGNATURE2"
echo -e "${GREEN}方法3 (EIP-191):${NC} $SIGNATURE3"
echo ""
echo -e "${YELLOW}💡 使用建议:${NC}"
echo "- 如果合约使用 bytes32(uint256(uint160(buyer)))，使用方法1的签名"
echo "- 如果合约使用 keccak256 哈希，使用方法2的签名"
echo "- 如果合约使用标准消息签名，使用方法3的签名"
echo ""

# 生成一个包含所有信息的 JSON 文件
OUTPUT_FILE="signature_$(date +%Y%m%d_%H%M%S).json"

cat > "$OUTPUT_FILE" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "buyer_address": "$BUYER_ADDRESS",
  "padded_address": "$PADDED_ADDRESS",
  "signature": "$SIGNATURE1"
}
EOF

echo -e "${GREEN}✅ 签名信息已保存到: $OUTPUT_FILE${NC}"
echo ""

# 验证签名 (可选)
if command -v cast >/dev/null 2>&1; then
    echo -e "${BLUE}验证签名...${NC}"
    
    # 验证方法3签名
    RECOVERED_ADDRESS=$(cast wallet verify --message "$PADDED_ADDRESS" "$SIGNATURE3" 2>/dev/null)
    
    if [ "$RECOVERED_ADDRESS" = "$OWNER_ADDRESS" ]; then
        echo -e "${GREEN}✅ 签名验证成功！${NC}"
    else
        echo -e "${RED}❌ 签名验证失败${NC}"
        echo "期望地址: $OWNER_ADDRESS"
        echo "恢复地址: $RECOVERED_ADDRESS"
    fi
fi

echo ""
echo -e "${GREEN}🎉 签名生成完成！${NC}"