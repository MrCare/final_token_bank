/*
 * @Author: Mr.Car
 * @Date: 2025-07-27 16:50:00
 */
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { NFT_ADDRESS, NFT_ABI } from '@/lib/contracts';
import { useRefreshStore } from '@/lib/store';
import { 
  PageContainer, 
  PageHeader, 
  InfoCard, 
  StatsCard, 
  StatusCard, 
  FeatureList,
  DataRow,
  ActionButton,
  InputField
} from './ui/base-components';

export function NftNew() {
  const { address, isConnected } = useAccount();
  const [tokenId, setTokenId] = useState('');
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const triggerRefresh = useRefreshStore((state) => state.triggerRefresh);

  // 读取 NFT 合约基本信息
  const { data: name } = useReadContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'name',
  });

  const { data: symbol } = useReadContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'symbol',
  });

  const { data: totalAmount, refetch: refetchTotalAmount } = useReadContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'totalAmount',
  });

  // 读取用户 NFT 余额
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // 读取特定 Token 的拥有者
  const { data: tokenOwner, refetch: refetchTokenOwner } = useReadContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'ownerOf',
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: !!tokenId && tokenId !== '0',
    },
  });

  // 交易确认后刷新数据
  useEffect(() => {
    if (isConfirmed) {
      refetchTotalAmount();
      refetchBalance();
      refetchTokenOwner();
      triggerRefresh();
      console.log('NFT 交易已确认，数据已更新');
    }
  }, [isConfirmed, refetchTotalAmount, refetchBalance, refetchTokenOwner, triggerRefresh]);

  // 铸造 NFT
  const handleMint = async () => {

    try {
      writeContract({
        address: NFT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [address as `0x${string}`],
        value: totalAmount as bigint < 3 ? parseEther('0.01') : parseEther('0.001'), // 0.01 ETH mint fee
      });

    } catch (error) {
      console.error('铸造 NFT 失败:', error);
    }
  };

  if (!isConnected) {
    return (
      <PageContainer gradient="bg-gradient-to-br from-pink-50 via-white to-rose-50">
        <PageHeader
          icon="🎨"
          title="Car NFT 藏品室"
          subtitle="独特的数字艺术收藏"
          iconColor="bg-gradient-to-br from-pink-500 to-rose-600"
          titleColor="bg-gradient-to-r from-pink-600 to-rose-600"
        />

        <StatsCard
          icon="🏆"
          title="NFT 发行总量"
          subtitle="Total NFTs Minted"
          value={totalAmount ? String(totalAmount) : '0'}
          unit="NFTs"
          bgColor="bg-gradient-to-br from-purple-500 to-pink-600"
          iconColor="bg-white/20"
        />

        <InfoCard
          icon="📋"
          title="合约信息"
          subtitle="Contract Information"
          iconColor="bg-gradient-to-br from-gray-500 to-gray-700"
        >
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <span className="text-gray-600 font-medium text-sm">NFT 信息</span>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <DataRow label="集合名称" value={name || '加载中...'} />
                <DataRow label="代币符号" value={symbol || '加载中...'} />
                <DataRow label="铸造费用" value="0.01 ETH" isLast />
              </div>
            </div>
            
            <div className="space-y-2">
              <span className="text-gray-600 font-medium text-sm">合约地址</span>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="font-mono text-xs text-gray-800 bg-white px-3 py-2 rounded-lg break-all shadow-sm">
                  {NFT_ADDRESS}
                </div>
              </div>
            </div>
          </div>
        </InfoCard>

        <FeatureList
          title="连接钱包解锁功能"
          subtitle="Connect wallet to unlock features"
          icon="🎭"
          bgColor="bg-gradient-to-br from-purple-50 to-pink-50"
          iconBgColor="bg-gradient-to-br from-purple-500 to-pink-500"
          features={[
            { icon: '🎨', text: '铸造 NFT' },
            { icon: '👑', text: '查看收藏' },
            { icon: '🔍', text: '查询拥有者' },
            { icon: '📈', text: '收藏统计' }
          ]}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer gradient="bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <PageHeader
        icon="🎭"
        title="NFT 收藏馆"
        subtitle="创造和探索独特的数字艺术"
        iconColor="bg-gradient-to-br from-purple-500 to-pink-600"
        titleColor="bg-gradient-to-r from-purple-600 to-pink-600"
      />
      
      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsCard
          icon="🏆"
          title="总发行量"
          subtitle="Total Minted"
          value={totalAmount ? String(totalAmount) : '0'}
          unit="NFTs"
          bgColor="bg-gradient-to-br from-indigo-500 to-purple-600"
          iconColor="bg-white/20"
        />

        <StatsCard
          icon="💎"
          title="我的收藏"
          subtitle="My Collection"
          value={balance ? String(balance) : '0'}
          unit="NFTs"
          bgColor="bg-gradient-to-br from-pink-500 to-rose-600"
          iconColor="bg-white/20"
        />
      </div>

      {/* 操作区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 铸造 NFT */}
        <InfoCard
          icon="🎨"
          title="铸造 NFT"
          subtitle="创建独特的数字收藏"
          iconColor="bg-gradient-to-br from-emerald-500 to-green-600"
        >
          <div className="space-y-4">
    
            <ActionButton
              icon="✨"
              label="铸造 NFT (特殊 0.01 ETH / 普通 0.001 ETH)"
              onClick={handleMint}
              disabled={!address}
              loading={isConfirming}
              variant="primary"
            />
            
            <StatusCard
              icon="💰"
              title=""
              message="铸造费用: (0.01 ETH or 0.001 ETH) + Gas 费"
              type="info"
            />
          </div>
        </InfoCard>

        {/* 查询 NFT */}
        <InfoCard
          icon="🔍"
          title="查询 NFT"
          subtitle="查看 NFT 详细信息"
          iconColor="bg-gradient-to-br from-blue-500 to-cyan-600"
        >
          <div className="space-y-4">
            <InputField
              placeholder="输入 Token ID"
              value={tokenId}
              onChange={setTokenId}
              type="number"
            />
            
            {tokenOwner && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="space-y-2">
                  <span className="text-gray-600 font-medium text-sm">拥有者地址</span>
                  <div className="font-mono text-xs text-gray-800 bg-white px-3 py-2 rounded-lg break-all shadow-sm">
                    {tokenOwner}
                  </div>
                </div>
              </div>
            )}
            
            <StatusCard
              icon="🎯"
              title=""
              message={`当前最新 Token ID: ${totalAmount ? String(totalAmount)  : '0'}`}
              type="warning"
            />
          </div>
        </InfoCard>
      </div>

      {/* 交易状态 */}
      {hash && (
        <InfoCard
          icon={isConfirmed ? "✅" : "⏳"}
          title={isConfirmed ? "铸造成功" : "铸造进行中"}
          subtitle={isConfirmed ? "Minting Confirmed" : "Minting Pending"}
          iconColor={isConfirmed ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-amber-500 to-yellow-600"}
        >
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">交易哈希</p>
              <p className="font-mono text-xs text-gray-800 break-all">{hash}</p>
            </div>
            <StatusCard
              icon={isConfirmed ? "🎉" : "⌛"}
              title=""
              message={isConfirmed ? "您的 NFT 已成功铸造！" : "请稍候，NFT 正在铸造中"}
              type={isConfirmed ? "success" : "info"}
            />
          </div>
        </InfoCard>
      )}
    </PageContainer>
  );
}