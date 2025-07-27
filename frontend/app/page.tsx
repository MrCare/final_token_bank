/*
 * @Author: Mr.Car
 * @Date: 2025-07-26 17:58:16
 */
'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { DashboardNew } from '@/components/dashboard-new';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* 顶部导航栏 */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🚀</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  DeFi Platform
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <DashboardNew />

      {/* 页脚 */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-gray-200/60 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
                <span className="text-white text-xs">⚡</span>
              </div>
              <span className="text-gray-600 font-medium">Powered by Mr.Car</span>
            </div>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <Link 
                className="hover:text-blue-600 transition-colors duration-200" 
                href="https://github.com/MrCare/forge-template"
                target="_blank"
                rel="noopener noreferrer"
              >
                📚 GitHub Repository
              </Link>
              <span>•</span>
              <span>🔧 Built with Foundry & Next.js</span>
              <span>•</span>
              <span>🌈 Styled with RainbowKit</span>
            </div>
            <p className="text-xs text-gray-400">
              © 2025 DeFi Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
