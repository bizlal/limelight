'use client';

import '@/assets/base.css';
import { Layout } from '@/components/Layout';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { base } from 'wagmi/chains';
import { http } from 'viem';
import { PrivyProvider } from '@privy-io/react-auth';
import { createConfig, WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi/config';
import { Web3Providers } from '@/lib/wagmi/providers';

export default function MyApp({ Component, pageProps }) {
  return (
    <Web3Providers>
        <ThemeProvider>
          <Layout>
            <Component {...pageProps} />
            <Toaster />
            <SpeedInsights />
            <Analytics />
          </Layout>
        </ThemeProvider>
      </Web3Providers>
  );
}
