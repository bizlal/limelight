'use client';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider } from '@privy-io/react-auth';
import { config } from './config';
import { base } from '@wagmi/chains';

const queryClient = new QueryClient();

export function Web3Providers({ children }) {
  const baseSepolia = {
    id: 84532,
    name: 'Base',
    network: 'base',
    nativeCurrency: {
      name: 'Base',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ['https://sepolia.base.org'],
      },
      public: {
        http: ['https://sepolia.base.org'],
      },
    },
    blockExplorers: {
      blockscout: {
        name: 'Basescout',
        url: 'https://base.blockscout.com',
      },
      default: {
        name: 'Basescan',
        url: 'https://sepolia.basescan.org',
      },
      etherscan: {
        name: 'Basescan',
        url: 'https://sepolia.basescan.org',
      },
    },
    contracts: {
      multicall3: {
        address: '0xca11bde05977b3631167028862be2a173976ca11',
        blockCreated: 5022,
      },
    },
  };

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        defaultChain: baseSepolia,
        supportedChains: [base, baseSepolia],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        appearance: {
          // Keep the dark theme
          theme: 'dark',

          // Adjust accentColor if you have a new brand highlight color
          accentColor: '#1E88E5',

          // Logo path (replace with your brand’s image if desired)
          logo: 'images/LimelightLogo.png',

          /**
           * customCSS allows you to override or extend the default Privy styling
           * so that the login modal uses your gradients, colors, and border.
           * You can scope your CSS rules to Privy classes (e.g. .privy-modal)
           * or override everything at once (e.g. .privy-container).
           */
          customCSS: `
            /* Container around the modal */
            .privy-container {
              background: #191919;
            }

            /* The actual modal wrapper */
            .privy-modal-content {
              background: linear-gradient(
                  116.94deg, 
                  #8D52CC -39.29%, 
                  #A650B2 -26%, 
                  #BC4E9B -15.53%, 
                  #CF4C87 1.54%, 
                  #DB4B7B 11.57%, 
                  #A9638F 37.88%, 
                  #8C719B 49.86%, 
                  #727EA6 64.46%, 
                  #4893B7 89.21%
                ),
                linear-gradient(
                  0deg, 
                  rgba(0, 0, 0, 0.2), 
                  rgba(0, 0, 0, 0.2)
                );
              border: 1px solid #43434D;
            }
          `,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
