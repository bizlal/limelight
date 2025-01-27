'use client';

import '@/assets/base.css';
import { Layout } from '@/components/Layout';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { PrivyProvider } from '@privy-io/react-auth';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next"
export default function MyApp({ Component, pageProps }) {
  return (
    <PrivyProvider
      appId="cm65m548i01f2wyd4uffw42da"
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: 'https:///lmlt.ai/assets/icons/lmlt.jpg',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <ThemeProvider>
        <Layout>
          <Component {...pageProps} />
          <Toaster />
          <SpeedInsights />
          <Analytics />
        </Layout>
      </ThemeProvider>
    </PrivyProvider>
  );
}
