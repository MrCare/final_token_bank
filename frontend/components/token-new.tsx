/*
 * @Author: Mr.Car
 * @Date: 2025-07-27 14:50:23
 */
import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { TOKEN_ADDRESS, TOKEN_ABI } from '@/lib/contracts';
import { useRefreshStore } from '@/lib/store';
import { useEffect } from 'react';
import { 
  PageContainer, 
  PageHeader, 
  InfoCard, 
  StatsCard, 
  StatusCard, 
  FeatureList,
  DataRow
} from './ui/base-components';

export function TokenNew() {
	const { address, isConnected } = useAccount();
	const refreshTrigger = useRefreshStore((state) => state.refreshTrigger);

	// 读取代币余额
	const { data: balance, refetch: refetchBalance } = useReadContract({
		address: TOKEN_ADDRESS,
		abi: TOKEN_ABI,
		functionName: 'balanceOf',
		args: address ? [address] : undefined,
		query: {
			enabled: !!address,
		},
	});
    // 读取代币名称
    const { data: name } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'name',
    });

	// 读取代币符号
	const { data: symbol } = useReadContract({
		address: TOKEN_ADDRESS,
		abi: TOKEN_ABI,
		functionName: 'symbol',
	});

	// 监听全局刷新触发器
	useEffect(() => {
		if (refreshTrigger > 0) {
			refetchBalance();
		}
	}, [refreshTrigger, refetchBalance]);

	if (!isConnected) {
		return (
			<PageContainer gradient="bg-gradient-to-br from-blue-50 via-white to-indigo-50">
				<PageHeader
					icon="🪙"
					title="代币信息"
					subtitle="查看和管理您的代币资产"
					iconColor="bg-gradient-to-br from-blue-500 to-purple-600"
					titleColor="bg-gradient-to-r from-blue-600 to-purple-600"
				/>
				
				<InfoCard
					icon="📋"
					title="代币详情"
					subtitle="Token Information"
					iconColor="bg-gradient-to-br from-gray-500 to-gray-700"
				>
					<div className="grid grid-cols-1 gap-4">
						<DataRow
							label="代币名称"
							value={name || '加载中...'}
						/>
						<DataRow
							label="代币符号"
							value={symbol || '---'}
						/>
						<DataRow
							label="合约地址"
							value={`${TOKEN_ADDRESS.slice(0, 10)}...${TOKEN_ADDRESS.slice(-8)}`}
							isLast
						/>
					</div>
				</InfoCard>
				
				<FeatureList
					title="连接钱包查看余额"
					subtitle="Connect wallet to unlock features"
					icon="🔗"
					bgColor="bg-gradient-to-br from-amber-50 to-orange-50"
					iconBgColor="bg-gradient-to-br from-amber-500 to-orange-500"
					features={[
						{ icon: '💰', text: '查看余额' },
						{ icon: '📊', text: '交易历史' },
						{ icon: '🔄', text: '转账功能' },
						{ icon: '🏦', text: '银行存取' }
					]}
				/>
			</PageContainer>
		);
	}

	return (
		<PageContainer gradient="bg-gradient-to-br from-emerald-50 via-white to-teal-50">
			<PageHeader
				icon="💰"
				title="我的代币"
				subtitle="管理您的数字资产"
				iconColor="bg-gradient-to-br from-emerald-500 to-teal-600"
				titleColor="bg-gradient-to-r from-emerald-600 to-teal-600"
			/>

			<StatsCard
				icon="💎"
				title="当前余额"
				subtitle="Current Balance"
				value={balance ? formatEther(balance) : '0'}
				unit={symbol || 'FCAR'}
				bgColor="bg-gradient-to-br from-emerald-500 to-teal-600"
				iconColor="bg-white/20"
			/>
			
			<InfoCard
				icon="📋"
				title="账户详情"
				subtitle="Account Details"
				iconColor="bg-gradient-to-br from-gray-500 to-gray-700"
			>
				<div className="grid grid-cols-1 gap-4">
					<DataRow
						label="代币名称"
						value={name || '加载中...'}
					/>
					<DataRow
						label="钱包地址"
						value={`${address?.slice(0, 6)}...${address?.slice(-4)}`}
					/>
					<DataRow
						label="代币符号"
						value={symbol || 'FCAR'}
						isLast
					/>
				</div>
			</InfoCard>
			
			{balance && Number(formatEther(balance)) > 0 ? (
				<StatusCard
					icon="✨"
					title="余额充足"
					message="您可以使用所有功能"
					type="success"
				/>
			) : (
				<StatusCard
					icon="⚠️"
					title="余额不足"
					message="请先获取一些代币"
					type="warning"
				/>
			)}
		</PageContainer>
	);
}
