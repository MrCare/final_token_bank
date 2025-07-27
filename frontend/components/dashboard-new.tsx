/*
 * @Author: Mr.Car
 * @Date: 2025-07-27 17:00:00
 */
'use client';

import { useState } from 'react';
import { TokenNew } from './token-new';
import { TokenBankNew } from './tokenBank-new';
import { NftNew } from './nft-new';
import { NftMarketNew } from './nftMarket-new';

export function DashboardNew() {
  const [activeTab, setActiveTab] = useState<'token' | 'tokenbank' | 'nft' | 'nftmarket'>('token');

  const tabs = [
    { id: 'token' as const, name: 'Token', icon: '🪙', color: 'blue' },
    { id: 'tokenbank' as const, name: 'TokenBank', icon: '🏦', color: 'purple' },
    { id: 'nft' as const, name: 'NFT', icon: '🎨', color: 'pink' },
    { id: 'nftmarket' as const, name: 'NFT Market', icon: '🛒', color: 'orange' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'token':
        return <TokenNew />;
      case 'tokenbank':
        return <TokenBankNew />;
      case 'nft':
        return <NftNew />;
      case 'nftmarket':
        return <NftMarketNew />;
      default:
        return <TokenNew />;
    }
  };

  const getTabColorClasses = (tabColor: string, isActive: boolean) => {
    const colorMap = {
      blue: {
        active: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25',
        inactive: 'text-blue-600 hover:bg-blue-50'
      },
      purple: {
        active: 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25',
        inactive: 'text-purple-600 hover:bg-purple-50'
      },
      pink: {
        active: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25',
        inactive: 'text-pink-600 hover:bg-pink-50'
      },
      orange: {
        active: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25',
        inactive: 'text-orange-600 hover:bg-orange-50'
      }
    };

    return colorMap[tabColor as keyof typeof colorMap]?.[isActive ? 'active' : 'inactive'] || colorMap.blue[isActive ? 'active' : 'inactive'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* 导航标签 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1">
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 px-6 py-3 rounded-xl font-medium text-sm 
                  transition-all duration-300 ease-in-out transform 
                  ${getTabColorClasses(tab.color, activeTab === tab.id)}
                  ${activeTab === tab.id ? 'scale-105' : 'hover:scale-102'}
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="transition-all duration-500 ease-in-out">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
