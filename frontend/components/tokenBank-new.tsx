/*
 * @Author: Mr.Car
 * @Date: 2025-07-27 16:45:00
 */
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { signTypedData } from '@wagmi/core';
import { config } from '@/lib/wagmi';
import { 
  TOKEN_ADDRESS, 
  TOKEN_ABI, 
  TOKENBANK_ADDRESS, 
  TOKENBANK_ABI,
  PERMIT2_ADDRESS,
  PERMIT2_ABI 
} from '@/lib/contracts';
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
import { notFound } from 'next/navigation';

// Permit2 相关类型定义
const PERMIT2_DOMAIN = {
  name: 'Permit2',
  chainId: 31337,
  verifyingContract: PERMIT2_ADDRESS, // 你的 Permit2 合约地址
} as const;

const PERMIT2_TYPES = {
  PermitSingle: [
    { name: 'details', type: 'PermitDetails' },
    { name: 'spender', type: 'address' },
    { name: 'sigDeadline', type: 'uint256' },
  ],
  PermitDetails: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
    { name: 'expiration', type: 'uint48' },
    { name: 'nonce', type: 'uint48' },
  ],
} as const;

export function TokenBankNew() {
  const { address, isConnected, chainId } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [permit2DepositAmount, setPermit2DepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPermit2Loading, setIsPermit2Loading] = useState(false);
  const [depositMethod, setDepositMethod] = useState<'permit' | 'permit2'>('permit');
  
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const triggerRefresh = useRefreshStore((state) => state.triggerRefresh);

  // 读取代币名称和符号
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

  // 读取银行总资产
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

  // 读取 Token nonce (用于原生 permit)
  const { data: nonce, refetch: refetchNonce } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'nonces',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // 直接从 Permit2 合约获取 nonce（推荐）
  const { data: permit2DirectAllowance, refetch: refetchPermit2DirectAllowance } = useReadContract({
    address: PERMIT2_ADDRESS,
    abi: PERMIT2_ABI,
    functionName: 'allowance',
    args: address ? [address, TOKEN_ADDRESS, TOKENBANK_ADDRESS] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // 👇 在这里添加
  const { data: tokenToPermit2Allowance, refetch: refetchTokenPermit2 } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, PERMIT2_ADDRESS] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // 计算下一个可用的 nonce - 改进版本
  const getNextPermit2Nonce = () => {
    if (permit2DirectAllowance && permit2DirectAllowance[2] !== undefined) {
      const currentTime = Math.floor(Date.now() / 1000);
      const expiration = Number(permit2DirectAllowance[1]);
      const amount = permit2DirectAllowance[0];
      const currentNonce = Number(permit2DirectAllowance[2]);

      console.log('🔍 Nonce 计算详情:', {
        currentTime,
        expiration,
        amount: amount.toString(),
        currentNonce,
        isExpired: expiration !== 0 && expiration < currentTime,
        hasAmount: amount > BigInt(0)
      });

      // 如果没有有效授权（过期或无额度），使用当前 nonce
      if (expiration === 0 || expiration < currentTime || amount === BigInt(0)) {
        console.log('✅ 无有效授权，使用当前 nonce:', currentNonce);
        return currentNonce;
      } else {
        // 如果有有效授权，使用下一个 nonce
        const nextNonce = currentNonce + 1;
        console.log('✅ 有有效授权，使用下一个 nonce:', nextNonce);
        return nextNonce;
      }
    }
    console.log('✅ 未获取到授权信息，使用默认 nonce: 0');
    return 0;
  };

  // 交易确认后刷新数据
  useEffect(() => {
    if (isConfirmed) {
      refetchTotalAssets();
      refetchUserShares();
      refetchUserAssets();
      refetchNonce();
      refetchPermit2DirectAllowance(); // 刷新 Permit2 nonce
      triggerRefresh();
      console.log('交易已确认，数据已更新');
    }
  }, [isConfirmed, refetchTotalAssets, refetchUserShares, refetchUserAssets, refetchNonce, refetchPermit2DirectAllowance, triggerRefresh]);

  // 原生 permit 存款
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

  // Permit2 存款
  const handlePermit2Deposit = async () => {
    if (!address || !permit2DepositAmount || !chainId) return;

    try {
      setIsPermit2Loading(true);
      const assets = parseEther(permit2DepositAmount);
      const amount = BigInt(assets.toString());
      const expiration = Math.floor(Date.now() / 1000) + 3600 * 20; // 一小时
      const nonce = getNextPermit2Nonce(); // 使用正确的 nonce
      // const nonce = 5;
      const sigDeadline = Math.floor(Date.now() / 1000) + 3600 * 24 * 30; // 十小时

      console.log('Permit2 参数:', {
        token: TOKEN_ADDRESS,
        amount: amount.toString(),
        expiration,
        nonce,
        spender: TOKENBANK_ADDRESS,
        sigDeadline
      });

      // 生成 Permit2 签名
      const signature = await signTypedData(config, {
        account: address,
        domain: PERMIT2_DOMAIN,
        types: PERMIT2_TYPES,
        primaryType: 'PermitSingle',
        message: {
          details: {
            token: TOKEN_ADDRESS,
            amount,
            expiration,
            nonce,
          },
          spender: TOKENBANK_ADDRESS,
          sigDeadline: BigInt(sigDeadline),
        },
      });

      // 调用 permitDeposit2
      writeContract({
        address: TOKENBANK_ADDRESS,
        abi: TOKENBANK_ABI,
        functionName: 'permitDeposit2',
        args: [
          assets,                    // uint256 assets
          address,                   // address receiver
          amount,                    // uint160 amount
          expiration,               // uint48 expiration
          nonce,                    // uint48 nonce
          BigInt(sigDeadline),      // uint256 sigDeadline
          signature,                // bytes signature
        ],
      });

      // setPermit2DepositAmount('');
    } catch (error) {
      console.error('Permit2 存款失败:', error);
    } finally {
      setIsPermit2Loading(false);
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

  // 授权 Token → Permit2
  const handleApprovePermit2 = async () => {
    if (!address) return;
    
    try {
      const approveAmount = parseEther('1000000'); // 授权大额度，避免频繁授权
      
      writeContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'approve',
        args: [PERMIT2_ADDRESS, approveAmount],
      });
      
      console.log('正在授权 Token → Permit2...');
    } catch (error:any) {
      console.error('授权失败:', error);
      alert(`授权失败: ${error.message}`);
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
            { icon: '✨', text: '原生 Permit 存款' },
            { icon: '🔐', text: 'Permit2 存款' },
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <StatsCard
          icon="🔐"
          title="Permit2 状态"
          subtitle="Permit2 Status"
          value={permit2DirectAllowance ? `Nonce: ${permit2DirectAllowance[2]}` : '未授权'}
          unit=""
          bgColor="bg-gradient-to-br from-purple-500 to-pink-600"
          iconColor="bg-white/20"
        />
      </div>

      {/* 存款方式选择 */}
      <InfoCard
        icon="⚡"
        title="选择存款方式"
        subtitle="Choose Deposit Method"
        iconColor="bg-gradient-to-br from-indigo-500 to-purple-600"
      >
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              checked={depositMethod === 'permit'}
              onChange={() => setDepositMethod('permit')}
              className="text-blue-600"
            />
            <span className="text-sm font-medium">原生 Permit (EIP-2612)</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              checked={depositMethod === 'permit2'}
              onChange={() => setDepositMethod('permit2')}
              className="text-purple-600"
            />
            <span className="text-sm font-medium">Permit2 授权</span>
          </label>
        </div>
      </InfoCard>

      {/* 操作区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 存款操作 */}
        {depositMethod === 'permit' ? (
          <InfoCard
            icon="📥"
            title="原生 Permit 存款"
            subtitle="EIP-2612 签名存款"
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
                label="原生 Permit 存款"
                onClick={handlePermitDeposit}
                disabled={!depositAmount}
                loading={isLoading || isConfirming}
                variant="primary"
              />
              
              <StatusCard
                icon="💡"
                title=""
                message="使用代币原生 permit 功能，兼容性最好"
                type="info"
              />
            </div>
          </InfoCard>
        ) : (
          <InfoCard
            icon="🔐"
            title="Permit2 存款"
            subtitle="Universal Permission System"
            iconColor="bg-gradient-to-br from-purple-500 to-purple-600"
          >
            <div className="space-y-4">
              {/* 第一层授权状态检查 */}
              {tokenToPermit2Allowance && tokenToPermit2Allowance < parseEther('1000') && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="text-amber-800 text-sm font-medium mb-2">⚠️ 需要先授权代币</div>
                  <div className="text-amber-700 text-xs mb-3">
                    当前授权: {formatEther(tokenToPermit2Allowance)} FCAR → Permit2
                  </div>
                  <ActionButton
                    icon="🔓"
                    label="授权 Token → Permit2"
                    onClick={handleApprovePermit2}
                    variant="danger"
                  />
                </div>
              )}

              <InputField
                placeholder="输入存款金额"
                value={permit2DepositAmount}
                onChange={setPermit2DepositAmount}
                suffix="FCAR"
                type="number"
              />
              
              <ActionButton
                icon="🔐"
                label="Permit2 存款"
                onClick={handlePermit2Deposit}
                disabled={
                  !permit2DepositAmount || 
                  !tokenToPermit2Allowance || 
                  tokenToPermit2Allowance < parseEther(permit2DepositAmount || '0')
                }
                loading={isPermit2Loading || isConfirming}
                variant="primary"
              />

              {/* 显示两层授权状态 */}
              <div className="space-y-2">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-blue-800 text-sm font-medium">第一层授权 (Token → Permit2)</div>
                  <div className="text-blue-700 text-xs">
                    {tokenToPermit2Allowance 
                      ? `✅ 已授权: ${formatEther(tokenToPermit2Allowance)} FCAR`
                      : '❌ 未授权'}
                  </div>
                </div>
              </div>

              {/* Permit2 授权状态 */}
              {permit2DirectAllowance && (
                <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                  <div className="text-sm font-medium text-purple-800">Permit2 详细状态</div>
                  <div className="space-y-1 text-xs text-purple-600">
                    <div>当前授权: {formatEther(permit2DirectAllowance[0])} FCAR</div>
                    <div>过期时间: {
                      permit2DirectAllowance && Number(permit2DirectAllowance[1]) !== 0 
                        ? new Date(Number(permit2DirectAllowance[1]) * 1000).toLocaleString()
                        : '未设置（无授权）'
                    }</div>
                    <div>当前 Nonce: {permit2DirectAllowance[2].toString()}</div>
                    {/* <div>下次使用 Nonce: {getNextPermit2Nonce()}</div> */}
                    <div className="mt-2 p-2 bg-white rounded border">
                      <div className="text-purple-700 font-medium">状态:</div>
                      <div className="text-purple-600">
                        {Number(permit2DirectAllowance[1]) === 0 
                          ? '🔒 未创建授权'           // 特殊处理 expiration = 0 的情况
                          : Number(permit2DirectAllowance[1]) < Math.floor(Date.now() / 1000) 
                          ? '❌ 授权已过期' 
                          : permit2DirectAllowance[0] === BigInt(0) 
                          ? '⚠️ 无授权额度' 
                          : '✅ 授权有效'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 调试信息（开发时使用） */}
              {process.env.NODE_ENV === 'development' && permit2DirectAllowance && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="text-sm font-medium text-gray-800">调试信息</div>
                  <div className="space-y-1 text-xs text-gray-600 font-mono">
                    <div>Raw Amount: {permit2DirectAllowance[0].toString()}</div>
                    <div>Raw Expiration: {permit2DirectAllowance[1].toString()}</div>
                    <div>Raw Nonce: {permit2DirectAllowance[2].toString()}</div>
                    {/* <div>Next Nonce: {getNextPermit2Nonce()}</div> */}
                  </div>
                </div>
              )}
            </div>
          </InfoCard>
        )}

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
