/*
 * @Author: Mr.Car
 * @Date: 2025-07-27 16:45:00
 */
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { signTypedData } from '@wagmi/core';
import { config } from '@/lib/wagmi';
import { TOKEN_ADDRESS, TOKEN_ABI, TOKENBANK_ADDRESS, TOKENBANK_ABI } from '@/lib/contracts';
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

export function TokenBankNew() {
  const { address, isConnected, chainId } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const triggerRefresh = useRefreshStore((state) => state.triggerRefresh);

  // 读取代币名称和符号（不需要连接钱包）
  const { data: tokenName } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'name',
  });

  const { data: tokenSymbol } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'symbol',
  });

  // 读取银行总资产（不需要连接钱包）
  const { data: totalAssets, refetch: refetchTotalAssets } = useReadContract({
    address: TOKENBANK_ADDRESS,
    abi: TOKENBANK_ABI,
    functionName: 'totalAssets',
  });

  // 读取用户份额
  const { data: userShares, refetch: refetchUserShares } = useReadContract({
    address: TOKENBANK_ADDRESS,
    abi: TOKENBANK_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // 将用户份额转换为资产金额
  const { data: userAssets, refetch: refetchUserAssets } = useReadContract({
    address: TOKENBANK_ADDRESS,
    abi: TOKENBANK_ABI,
    functionName: 'convertToAssets',
    args: userShares ? [userShares] : undefined,
    query: {
      enabled: !!userShares,
    },
  });

  const { data: nonce, refetch: refetchNonce } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'nonces',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // 交易确认后刷新数据
  useEffect(() => {
    if (isConfirmed) {
      refetchTotalAssets();
      refetchUserShares();
      refetchUserAssets();
      refetchNonce();
      triggerRefresh();
      console.log('交易已确认，数据已更新');
    }
  }, [isConfirmed, refetchTotalAssets, refetchUserShares, refetchUserAssets, refetchNonce, triggerRefresh]);

  // 签名存款
  const handlePermitDeposit = async () => {
    if (!address || !depositAmount || !chainId || !tokenName || nonce === undefined) return;

    try {
      setIsLoading(true);
      const assets = parseEther(depositAmount);
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const signature = await signTypedData(config, {
        account: address,
        domain: {
          name: tokenName,
          version: '1',
          chainId,
          verifyingContract: TOKEN_ADDRESS,
        },
        types: {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        },
        primaryType: 'Permit',
        message: {
          owner: address,
          spender: TOKENBANK_ADDRESS,
          value: assets,
          nonce,
          deadline: BigInt(deadline),
        },
      });

      const r = signature.slice(0, 66) as `0x${string}`;
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
      const v = parseInt(signature.slice(130, 132), 16);

      writeContract({
        address: TOKENBANK_ADDRESS,
        abi: TOKENBANK_ABI,
        functionName: 'permitDeposit',
        args: [assets, address, BigInt(deadline), v, r, s],
      });

      setDepositAmount('');
    } catch (error) {
      console.error('签名存款失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 提款
  const handleWithdraw = async () => {
    if (!address || !withdrawAmount) return;

    try {
      const assets = parseEther(withdrawAmount);

      writeContract({
        address: TOKENBANK_ADDRESS,
        abi: TOKENBANK_ABI,
        functionName: 'withdraw',
        args: [assets, address, address],
      });

      setWithdrawAmount('');
    } catch (error) {
      console.error('提款失败:', error);
    }
  };

  if (!isConnected) {
    return (
      <PageContainer gradient="bg-gradient-to-br from-violet-50 via-white to-purple-50">
        <PageHeader
          icon="🏦"
          title="TokenBank 资金池"
          subtitle="安全的去中心化代币存储银行"
          iconColor="bg-gradient-to-br from-violet-500 to-purple-600"
          titleColor="bg-gradient-to-r from-violet-600 to-purple-600"
        />

        <StatsCard
          icon="💎"
          title="总存款池"
          subtitle="Total Pool Value"
          value={totalAssets ? formatEther(totalAssets) : '0'}
          unit={tokenSymbol || 'FCAR'}
          bgColor="bg-gradient-to-br from-blue-500 to-purple-600"
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
              <span className="text-gray-600 font-medium text-sm">代币信息</span>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <DataRow label="名称" value={tokenName || '加载中...'} />
                <DataRow label="符号" value={tokenSymbol || '加载中...'} isLast />
              </div>
            </div>
            
            <div className="space-y-2">
              <span className="text-gray-600 font-medium text-sm">合约地址</span>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="space-y-2">
                  <span className="text-gray-700 text-sm">代币合约</span>
                  <div className="font-mono text-xs text-gray-800 bg-white px-3 py-2 rounded-lg break-all shadow-sm">
                    {TOKEN_ADDRESS}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-gray-700 text-sm">银行合约</span>
                  <div className="font-mono text-xs text-gray-800 bg-white px-3 py-2 rounded-lg break-all shadow-sm">
                    {TOKENBANK_ADDRESS}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </InfoCard>

        <FeatureList
          title="连接钱包解锁功能"
          subtitle="Connect wallet to unlock features"
          icon="🚀"
          bgColor="bg-gradient-to-br from-amber-50 to-orange-50"
          iconBgColor="bg-gradient-to-br from-amber-500 to-orange-500"
          features={[
            { icon: '✨', text: '签名存款' },
            { icon: '💰', text: '余额查询' },
            { icon: '🔄', text: '快速提款' },
            { icon: '📊', text: '交易记录' }
          ]}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer gradient="bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <PageHeader
        icon="💳"
        title="TokenBank 资金池"
        subtitle="安全便捷的数字资产管理"
        iconColor="bg-gradient-to-br from-emerald-500 to-teal-600"
        titleColor="bg-gradient-to-r from-emerald-600 to-teal-600"
      />
      
      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsCard
          icon="🏦"
          title="资金池总额"
          subtitle="Total Pool Assets"
          value={totalAssets ? formatEther(totalAssets) : '0'}
          unit="FCAR"
          bgColor="bg-gradient-to-br from-blue-500 to-purple-600"
          iconColor="bg-white/20"
        />

        <StatsCard
          icon="💰"
          title="我的存款"
          subtitle="My Deposits"
          value={userAssets ? formatEther(userAssets) : '0'}
          unit="FCAR"
          bgColor="bg-gradient-to-br from-emerald-500 to-teal-600"
          iconColor="bg-white/20"
        />
      </div>

      {/* 操作区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 存款操作 */}
        <InfoCard
          icon="📥"
          title="签名存款"
          subtitle="一键授权并存款"
          iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
        >
          <div className="space-y-4">
            <InputField
              placeholder="输入存款金额"
              value={depositAmount}
              onChange={setDepositAmount}
              suffix="FCAR"
              type="number"
            />
            
            <ActionButton
              icon="✍️"
              label="签名存款"
              onClick={handlePermitDeposit}
              disabled={!depositAmount}
              loading={isLoading || isConfirming}
              variant="primary"
            />
            
            <StatusCard
              icon="💡"
              title=""
              message="无需提前授权，签名后自动完成存款"
              type="info"
            />
          </div>
        </InfoCard>

        {/* 提款操作 */}
        <InfoCard
          icon="📤"
          title="提取资金"
          subtitle="安全快速提款"
          iconColor="bg-gradient-to-br from-red-500 to-red-600"
        >
          <div className="space-y-4">
            <InputField
              placeholder="输入提款金额"
              value={withdrawAmount}
              onChange={setWithdrawAmount}
              suffix="FCAR"
              type="number"
            />
            
            <ActionButton
              icon="💸"
              label="立即提款"
              onClick={handleWithdraw}
              disabled={!withdrawAmount}
              loading={isConfirming}
              variant="danger"
            />
            
            <StatusCard
              icon="⚡"
              title=""
              message={`可用余额: ${userAssets ? formatEther(userAssets) : '0'} FCAR`}
              type="warning"
            />
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
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">交易哈希</p>
              <p className="font-mono text-xs text-gray-800 break-all">{hash}</p>
            </div>
            <StatusCard
              icon={isConfirmed ? "🎉" : "⌛"}
              title=""
              message={isConfirmed ? "您的交易已成功确认" : "请稍候，交易正在区块链上确认"}
              type={isConfirmed ? "success" : "info"}
            />
          </div>
        </InfoCard>
      )}
    </PageContainer>
  );
}
