import { createConfig } from '@privy-io/wagmi';
import { LimelightAscensionNoParamsABI, FercABI } from './abis';
import { http } from 'wagmi';
export const limelightContract = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS, // Sale contract address
  abi: LimelightAscensionNoParamsABI,
  chainId: 84532,
};

export const tokenContract = {
  address: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS, // Token (ERC20) address
  abi: FercABI,
  chainId: 84532,
};

const baseSepolia = {
  id: 84532,
  name: 'Base',
  network: 'base',
  nativeCurrency: { name: 'Base', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    blockscout: { name: 'Basescout', url: 'https://base.blockscout.com' },
    default: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
    etherscan: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 5022,
    },
  },
};

export const config = createConfig({
  chains: [baseSepolia],
  transports: { [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) },
});
