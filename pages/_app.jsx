'use client';

import '@/assets/base.css';
import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Web3Providers } from '@/lib/wagmi/providers';

export default function MyApp({ Component, pageProps }) {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || 'pysgbcmwmc'; // Replace with your actual Clarity project ID or use env variable

  useEffect(() => {
    async function loadClarity() {
      try {
        // Dynamically import Clarity to ensure it runs only on the client.
        const clarityModule = await import('@microsoft/clarity');
        // If Clarity is exported as a default export, use clarityModule.default
        clarityModule.default.init(projectId);
        console.log('Clarity loaded');
      } catch (error) {
        console.error('Failed to load Clarity', error);
      }
    }
    loadClarity();
  }, [projectId]);

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
