'use client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { config } from './config';
import { base } from '@wagmi/chains';
const queryClient = new QueryClient()

export function Web3Providers({ children }) {
  const baseSepolia = {
    id: 845322,
    name: "Base",
    network: "base",
    nativeCurrency: {
      name: "Base",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ["https://sepolia.base.org"],
      },
      public: {
        http: ["https://sepolia.base.org"],
      },
    },
    blockExplorers: {
      blockscout: {
        name: "Basescout",
        url: "https://base.blockscout.com",
      },
      default: {
        name: "Basescan",
        url: "https://sepolia.basescan.org",
      },
      etherscan: {
        name: "Basescan",
        url: "https://sepolia.basescan.org",
      },
    },
    contracts: {
      multicall3: {
        address: "0xca11bde05977b3631167028862be2a173976ca11",
        blockCreated: 5022,
      },
    },
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
          config={{
            defaultChain: baseSepolia,
            supportedChains: [base, baseSepolia],
            embeddedWallets: {
              createOnLogin: 'users-without-wallets'
            },
            appearance: {
              theme: 'light',
              accentColor: '#1E88E5',
              logo: '/logo.png',
            }
          }}
        >
          {children}
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
 