/*
 * @Author: Mr.Car
 * @Date: 2025-07-27 16:55:00
 */
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignTypedData } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { NFTMARKET_ADDRESS, NFTMARKET_ABI, NFT_ADDRESS, NFT_ABI, TOKEN_ADDRESS, TOKEN_ABI } from '@/lib/contracts';
import { useRefreshStore } from '@/lib/store';
import { 
  PageContainer, 
  PageHeader, 
  InfoCard, 
  StatsCard, 
  StatusCard, 
  DataRow,
  ActionButton,
  InputField
} from './ui/base-components';

export function NftMarketNew() {
  const { address, isConnected } = useAccount();
  const [tokenId, setTokenId] = useState('');
  const [price, setPrice] = useState('');
  const [buyTokenId, setBuyTokenId] = useState('');
  const [whitelistSignature, setWhitelistSignature] = useState('');
  const [usePermitBuy, setUsePermitBuy] = useState(false);
  
  const { writeContract, data: hash, error: writeError, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Token permit 签名
  const { signTypedData, data: permitSignatureData, isPending: isSigningPermit } = useSignTypedData();

  // 获取 Token 余额
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // 获取 Token 授权额度
  const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, NFTMARKET_ADDRESS] : undefined,
  });

  // 获取 Token nonces (用于 permit)
  const { data: tokenNonces } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'nonces',
    args: address ? [address] : undefined,
  });

  // 读取挂单信息 (上架时使用)
  const { data: listing, refetch: refetchListing } = useReadContract({
    address: NFTMARKET_ADDRESS,
    abi: NFTMARKET_ABI,
    functionName: 'listings',
    args: tokenId ? [BigInt(tokenId)] : undefined,
  });

  // 读取购买 NFT 的挂单信息
  const { data: buyListing, refetch: refetchBuyListing } = useReadContract({
    address: NFTMARKET_ADDRESS,
    abi: NFTMARKET_ABI,
    functionName: 'listings',
    args: buyTokenId ? [BigInt(buyTokenId)] : undefined,
  });

  // 检查 NFT 授权
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'isApprovedForAll',
    args: address ? [address, NFTMARKET_ADDRESS] : undefined,
  });

  // 检查 NFT 拥有者 (上架时使用)
  const { data: nftOwner } = useReadContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'ownerOf',
    args: tokenId ? [BigInt(tokenId)] : undefined,
  });

  const triggerRefresh = useRefreshStore((state) => state.triggerRefresh);

  // 交易确认后刷新数据
  useEffect(() => {
    if (isConfirmed) {
      refetchListing();
      refetchBuyListing();
      refetchApproval();
      refetchTokenBalance();
      refetchTokenAllowance();
      triggerRefresh();
      console.log('NFT 市场交易已确认，数据已更新');
    }
  }, [isConfirmed, refetchListing, refetchBuyListing, refetchApproval, refetchTokenBalance, refetchTokenAllowance, triggerRefresh]);

  // 授权 NFT
  const handleApproveNFT = async () => {
    try {
      await writeContract({
        address: NFT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'setApprovalForAll',
        args: [NFTMARKET_ADDRESS, true],
      });
    } catch (error) {
      console.error('NFT授权失败:', error);
    }
  };

  // 上架 NFT
  const handleListNFT = async () => {
    if (!tokenId || !price) {
      alert('请填写 Token ID 和价格');
      return;
    }

    // 检查是否拥有此 NFT
    if (nftOwner && address && nftOwner.toLowerCase() !== address.toLowerCase()) {
      alert('您不拥有此 NFT！');
      return;
    }

    try {
      await writeContract({
        address: NFTMARKET_ADDRESS,
        abi: NFTMARKET_ABI,
        functionName: 'listNFT',
        args: [BigInt(tokenId), parseUnits(price, 18)], // 18位小数的Token
      });

      setTokenId('');
      setPrice('');
    } catch (error: any) {
      console.error('上架失败:', error);
      alert(`上架失败: ${error?.message || '未知错误'}`);
    }
  };

  // 使用 permit 购买 NFT (自动生成 token permit 签名)
  const handlePermitBuy = async () => {
    if (!buyTokenId || !buyListing || !whitelistSignature) {
      alert('请填写完整信息：Token ID 和白名单授权签名');
      return;
    }

    if (!address || !tokenNonces) {
      alert('无法获取账户信息或 nonce');
      return;
    }

    try {
      // 设置 permit 过期时间 (24小时后)
      const deadline = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

      // 构建 EIP-712 类型化数据用于 Token permit
      const domain = {
        name: 'FinalCarToken', // 需要与你的 Token 合约名称匹配
        version: '1',
        chainId: 31337, // Anvil 本地链 ID
        verifyingContract: TOKEN_ADDRESS,
      };

      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      };

      const message = {
        owner: address,
        spender: NFTMARKET_ADDRESS,
        value: buyListing[1],
        nonce: tokenNonces,
        deadline: BigInt(deadline),
      };

      console.log('🔐 开始签名 Token permit...');
      console.log('Domain:', domain);
      console.log('Message:', message);

      // 签名 Token permit
      await signTypedData({
        domain,
        types,
        primaryType: 'Permit',
        message,
      });

      // 等待签名完成
      if (!permitSignatureData) {
        console.log('等待用户签名...');
        return;
      }

    } catch (error: any) {
      console.error('签名失败:', error);
      alert(`签名失败: ${error?.message || '未知错误'}`);
    }
  };

  // 当 permit 签名完成后，执行购买
  useEffect(() => {
    const executePurchase = async () => {
      if (permitSignatureData && buyTokenId && buyListing && whitelistSignature && address && tokenNonces) {
        try {
          console.log('🚀 执行 permit 购买...');
          
          // 解析签名
          const signature = permitSignatureData.slice(2); // 移除 0x
          const r = `0x${signature.slice(0, 64)}`;
          const s = `0x${signature.slice(64, 128)}`;
          const v = parseInt(signature.slice(128, 130), 16);
          
          // 重新计算 deadline
          const deadline = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

          console.log('📝 Permit 参数:');
          console.log('- deadline:', deadline);
          console.log('- v:', v);
          console.log('- r:', r);
          console.log('- s:', s);

          await writeContract({
            address: NFTMARKET_ADDRESS,
            abi: NFTMARKET_ABI,
            functionName: 'permitBuy',
            args: [
              BigInt(buyTokenId), 
              whitelistSignature as `0x${string}`, 
              BigInt(deadline), 
              v, 
              r as `0x${string}`, 
              s as `0x${string}`
            ],
          });

          // 清空表单
          setBuyTokenId('');
          setWhitelistSignature('');

        } catch (error: any) {
          console.error('Permit购买失败:', error);
          alert(`交易失败: ${error?.message || '未知错误'}`);
        }
      }
    };

    executePurchase();
  }, [permitSignatureData, buyTokenId, buyListing, whitelistSignature, address, tokenNonces, writeContract]);

  // 直接购买 NFT (需要预先授权)
  const handleDirectBuy = async () => {
    if (!buyTokenId || !buyListing) {
      alert('请输入要购买的 Token ID');
      return;
    }

    // 检查 Token 余额
    if (tokenBalance && buyListing[1]) {
      if (tokenBalance < buyListing[1]) {
        alert(`Token 余额不足！需要 ${formatUnits(buyListing[1], 18)} Token，当前有 ${formatUnits(tokenBalance, 18)} Token`);
        return;
      }
    }

    // 检查 Token 授权
    if (tokenAllowance && buyListing[1]) {
      if (tokenAllowance < buyListing[1]) {
        alert('需要先授权足够的 Token 给市场合约');
        return;
      }
    }

    try {
      await writeContract({
        address: NFTMARKET_ADDRESS,
        abi: NFTMARKET_ABI,
        functionName: 'buyNFT',
        args: [BigInt(buyTokenId)],
      });

      setBuyTokenId('');
    } catch (error: any) {
      console.error('直接购买失败:', error);
      alert(`交易失败: ${error?.message || '未知错误'}`);
    }
  };

  // 授权 Token
  const handleApproveToken = async () => {
    if (!buyListing) {
      alert('请先输入要购买的 NFT Token ID');
      return;
    }

    try {
      await writeContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'approve',
        args: [NFTMARKET_ADDRESS, buyListing[1]],
      });
    } catch (error: any) {
      console.error('Token 授权失败:', error);
      alert(`Token 授权失败: ${error?.message || '未知错误'}`);
    }
  };

  // 无限授权 Token
  const handleApproveTokenMax = async () => {
    try {
      const maxUint256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');
      await writeContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'approve',
        args: [NFTMARKET_ADDRESS, maxUint256],
      });
    } catch (error: any) {
      console.error('Token 无限授权失败:', error);
      alert(`Token 授权失败: ${error?.message || '未知错误'}`);
    }
  };

  if (!isConnected) {
    return (
      <PageContainer gradient="bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <StatusCard
          icon="🔌"
          title="请连接钱包"
          message="需要连接钱包才能使用 NFT 市场功能"
          type="warning"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer gradient="bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <PageHeader
        icon="🏪"
        title="NFT Token 市场"
        subtitle="使用 Token 买卖您的数字收藏品"
        iconColor="bg-gradient-to-br from-amber-500 to-orange-600"
        titleColor="bg-gradient-to-r from-amber-600 to-orange-600"
      />

      {/* 余额和授权状态 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatsCard
          icon="🪙"
          title="Token 余额"
          subtitle="Token Balance"
          value={tokenBalance ? formatUnits(tokenBalance, 18) : '0'}
          unit="TOKEN"
          bgColor="bg-gradient-to-br from-green-500 to-emerald-600"
          iconColor="bg-white/20"
        />
        
        <StatsCard
          icon={isApproved ? "✅" : "⚠️"}
          title="NFT 授权"
          subtitle="NFT Authorization"
          value={isApproved ? "已授权" : "未授权"}
          unit=""
          bgColor={isApproved ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-amber-500 to-yellow-600"}
          iconColor="bg-white/20"
        />

        <StatsCard
          icon="🔓"
          title="Token 授权"
          subtitle="Token Allowance"
          value={tokenAllowance ? formatUnits(tokenAllowance, 18) : '0'}
          unit="TOKEN"
          bgColor="bg-gradient-to-br from-purple-500 to-pink-600"
          iconColor="bg-white/20"
        />
      </div>

      {/* NFT 授权 */}
      {!isApproved && (
        <InfoCard
          icon="🔐"
          title="NFT 授权"
          subtitle="授权市场合约操作您的 NFT"
          iconColor="bg-gradient-to-br from-blue-500 to-indigo-600"
        >
          <ActionButton
            icon="🔓"
            label="授权 NFT"
            onClick={handleApproveNFT}
            disabled={isWritePending || isConfirming}
            loading={isWritePending || isConfirming}
            variant="primary"
          />
        </InfoCard>
      )}

      {/* 操作区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 上架 NFT */}
        <InfoCard
          icon="📤"
          title="上架 NFT"
          subtitle="出售您的数字收藏品"
          iconColor="bg-gradient-to-br from-emerald-500 to-green-600"
        >
          <div className="space-y-4">
            <InputField
              placeholder="输入 NFT Token ID"
              value={tokenId}
              onChange={setTokenId}
              type="number"
            />
            
            <InputField
              placeholder="输入价格 (Token)"
              value={price}
              onChange={setPrice}
              type="number"
            />

            {/* 显示NFT拥有者信息 */}
            {tokenId && nftOwner && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <DataRow 
                  label="NFT拥有者" 
                  value={`${nftOwner.slice(0, 8)}...${nftOwner.slice(-6)}`} 
                />
                <DataRow 
                  label="是否为您" 
                  value={address && nftOwner.toLowerCase() === address.toLowerCase() ? "是" : "否"} 
                  isLast
                />
              </div>
            )}
            
            {/* 显示当前挂单信息 */}
            {listing && listing[0] !== '0x0000000000000000000000000000000000000000' && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <DataRow label="当前卖家" value={`${(listing[0] as string).slice(0, 8)}...${(listing[0] as string).slice(-6)}`} />
                <DataRow label="当前价格" value={`${formatUnits(listing[1], 18)} Token`} />
                <DataRow label="状态" value="已上架" isLast />
              </div>
            )}
            
            <ActionButton
              icon="📤"
              label={listing && listing[0] !== '0x0000000000000000000000000000000000000000' 
                     ? "更新价格" : "上架 NFT"}
              onClick={handleListNFT}
              disabled={
                !tokenId || 
                !price || 
                !isApproved || 
                (nftOwner && address && nftOwner.toLowerCase() !== address.toLowerCase()) ||
                isWritePending || 
                isConfirming
              }
              loading={isWritePending || isConfirming}
              variant="primary"
            />
          </div>
        </InfoCard>

        {/* 购买 NFT */}
        <InfoCard
          icon="💰"
          title="购买 NFT"
          subtitle="收藏心仪的作品"
          iconColor="bg-gradient-to-br from-purple-500 to-pink-600"
        >
          <div className="space-y-4">
            <InputField
              placeholder="输入要购买的 Token ID"
              value={buyTokenId}
              onChange={setBuyTokenId}
              type="number"
            />
            
            {/* 显示NFT挂单信息 */}
            {buyListing && buyListing[0] !== '0x0000000000000000000000000000000000000000' && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <DataRow label="卖家地址" value={`${(buyListing[0] as string).slice(0, 8)}...${(buyListing[0] as string).slice(-6)}`} />
                <DataRow label="NFT价格" value={`${formatUnits(buyListing[1], 18)} Token`} />
                <DataRow label="您的Token余额" value={tokenBalance ? formatUnits(tokenBalance, 18) : '0'} />
                <DataRow label="当前Nonce" value={tokenNonces ? tokenNonces.toString() : '0'} />
                <DataRow 
                  label="余额是否足够" 
                  value={tokenBalance && buyListing[1] && tokenBalance >= buyListing[1] ? "是" : "否"} 
                  isLast 
                />
              </div>
            )}

            {/* 购买方式选择 */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <div className="text-sm font-medium text-blue-800">选择购买方式</div>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!usePermitBuy}
                    onChange={() => setUsePermitBuy(false)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">直接购买 (需预授权)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={usePermitBuy}
                    onChange={() => setUsePermitBuy(true)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">智能购买 (一键签名)</span>
                </label>
              </div>
            </div>

            {/* 直接购买方式 */}
            {!usePermitBuy && (
              <div className="space-y-3">
                {/* Token 授权按钮 */}
                {buyListing && tokenAllowance && buyListing[1] > tokenAllowance && (
                  <div className="space-y-2">
                    <ActionButton
                      icon="🔓"
                      label={`授权 ${formatUnits(buyListing[1], 18)} Token`}
                      onClick={handleApproveToken}
                      disabled={isWritePending || isConfirming}
                      loading={isWritePending || isConfirming}
                      variant="secondary"
                    />
                    <ActionButton
                      icon="♾️"
                      label="无限授权 Token"
                      onClick={handleApproveTokenMax}
                      disabled={isWritePending || isConfirming}
                      loading={isWritePending || isConfirming}
                      variant="secondary"
                    />
                  </div>
                )}
                
                <ActionButton
                  icon="🛒"
                  label={buyListing && buyListing[0] !== '0x0000000000000000000000000000000000000000' 
                         ? `直接购买 (${formatUnits(buyListing[1] || BigInt(0), 18)} Token)` 
                         : "请输入 Token ID"}
                  onClick={handleDirectBuy}
                  disabled={
                    !buyTokenId || 
                    !buyListing || 
                    buyListing[0] === '0x0000000000000000000000000000000000000000' ||
                    !tokenBalance ||
                    !tokenAllowance ||
                    (buyListing[1] && tokenBalance < buyListing[1]) ||
                    (buyListing[1] && tokenAllowance < buyListing[1]) ||
                    (buyListing[0] && address && buyListing[0].toLowerCase() === address.toLowerCase()) ||
                    isWritePending ||
                    isConfirming
                  }
                  loading={isWritePending || isConfirming}
                  variant="primary"
                />
              </div>
            )}

            {/* 智能购买方式 (自动 permit) */}
            {usePermitBuy && (
              <div className="space-y-3">
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <div className="text-sm font-medium text-green-800">智能购买说明</div>
                  <div className="text-xs text-green-600">
                    • 只需输入白名单授权签名<br/>
                    • 系统自动完成 Token permit 签名<br/>
                    • 一次操作完成购买，无需预授权
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    白名单授权签名 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="粘贴合约拥有者的白名单授权签名&#10;例如: 0x2b5322e4d270fbe08b70894e0a5a4e66f4ebbdb7..."
                    value={whitelistSignature}
                    onChange={(e) => setWhitelistSignature(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none font-mono text-xs"
                  />
                  {whitelistSignature && (
                    <div className="text-xs text-gray-500">
                      签名长度: {whitelistSignature.length} 字符
                      {whitelistSignature.length === 132 ? " ✅" : " ⚠️ (应为132字符)"}
                    </div>
                  )}
                </div>
                
                <ActionButton
                  icon="🔐"
                  label={
                    isSigningPermit ? "正在签名..." :
                    permitSignatureData ? "执行购买中..." :
                    (buyListing && buyListing[0] !== '0x0000000000000000000000000000000000000000' && whitelistSignature
                     ? `智能购买 (${formatUnits(buyListing[1] || BigInt(0), 18)} Token)` 
                     : "请输入白名单签名")
                  }
                  onClick={handlePermitBuy}
                  disabled={
                    (!buyTokenId || 
                    !buyListing || 
                    !whitelistSignature ||
                    buyListing[0] === '0x0000000000000000000000000000000000000000' ||
                    (buyListing[0] && address && buyListing[0].toLowerCase() === address.toLowerCase()) ||
                    isSigningPermit ||
                    isWritePending ||
                    isConfirming ||
                    !tokenBalance ||
                    (buyListing[1] && tokenBalance < buyListing[1])) as boolean
                  }
                  loading={isSigningPermit || isWritePending || isConfirming}
                  variant="primary"
                />

                {/* 签名状态提示 */}
                {isSigningPermit && (
                  <StatusCard
                    icon="✍️"
                    title=""
                    message="请在钱包中签名 Token permit 授权..."
                    type="info"
                  />
                )}

                {permitSignatureData && (
                  <StatusCard
                    icon="✅"
                    title=""
                    message="Token permit 签名完成，正在执行购买..."
                    type="success"
                  />
                )}
              </div>
            )}
            
            {/* 状态提示 */}
            {buyTokenId && buyListing && buyListing[0] === '0x0000000000000000000000000000000000000000' && (
              <StatusCard
                icon="❌"
                title=""
                message="此 NFT 未在市场上架"
                type="warning"
              />
            )}

            {buyListing && address && buyListing[0] && buyListing[0].toLowerCase() === address.toLowerCase() && (
              <StatusCard
                icon="⚠️"
                title=""
                message="不能购买自己的 NFT"
                type="warning"
              />
            )}

            {tokenBalance && buyListing && buyListing[1] && tokenBalance < buyListing[1] && (
              <StatusCard
                icon="💰"
                title=""
                message={`Token 余额不足！需要 ${formatUnits(buyListing[1], 18)} Token`}
                type="warning"
              />
            )}
            
            {writeError && (
              <StatusCard
                icon="❌"
                title=""
                message={`交易失败: ${writeError.message}`}
                type="error"
              />
            )}
          </div>
        </InfoCard>
      </div>

      {/* 交易状态 */}
      {hash && (
        <InfoCard
          icon={isConfirmed ? "✅" : "⏳"}
          title={isConfirmed ? "交易成功" : "交易处理中"}
          subtitle={isConfirmed ? "Transaction Confirmed" : "Transaction Pending"}
          iconColor={isConfirmed ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-amber-500 to-yellow-600"}
        >
          <div className="space-y-2">
            <DataRow label="交易哈希" value={`${hash.slice(0, 10)}...${hash.slice(-8)}`} />
            {isConfirmed && (
              <StatusCard
                icon="🎉"
                title=""
                message="NFT 交易成功完成！"
                type="success"
              />
            )}
          </div>
        </InfoCard>
      )}

      {/* 当前账户信息 */}
      {address && (
        <InfoCard
          icon="👤"
          title="当前连接账户"
          subtitle="Current Connected Account"
          iconColor="bg-gradient-to-br from-indigo-500 to-purple-600"
        >
          <div className="space-y-2">
            <DataRow label="账户地址" value={`${address.slice(0, 8)}...${address.slice(-6)}`} />
            <DataRow label="Token Nonce" value={tokenNonces ? tokenNonces.toString() : '0'} />
            <DataRow label="生成白名单签名" value={`./signature.sh ${address}`} isLast />
          </div>
        </InfoCard>
      )}
    </PageContainer>
  );
}
