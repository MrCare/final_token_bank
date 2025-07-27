/*
 * @Author: Mr.Car
 * @Date: 2025-07-26 17:58:16
 */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FinalCarToken TokenBank NFT & NFT Market',
  description: 'A TokenBank implict with ERC4626 on FinalCarToken A NFT Market on FinalCarToken',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
