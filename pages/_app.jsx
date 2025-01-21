'use client';

import '@/assets/base.css';
import { Layout } from '@/components/Layout';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { PrivyProvider } from '@privy-io/react-auth';

export default function MyApp({ Component, pageProps }) {
  return (
    <PrivyProvider
      appId="cm65m548i01f2wyd4uffw42da"
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: 'https://your-logo-url',
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
        </Layout>
      </ThemeProvider>
    </PrivyProvider>
  );
}
