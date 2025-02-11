// lib/wagmi/fetchers.js
import { limelightContract } from './config';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL)
});

export async function getTokenPrice() {
  try {
    const data = await publicClient.readContract({
      ...limelightContract,
      functionName: 'currentPrice'
    });
    return data?.toString() || '0';
  } catch (error) {
    console.error('Error fetching token price:', error);
    return '0';
  }
}

export async function getMarketCap() {
  try {
    const data = await publicClient.readContract({
      ...limelightContract,
      functionName: 'currentMcap'
    });
    return data?.toString() || '0';
  } catch (error) {
    console.error('Error fetching market cap:', error);
    return '0';
  }
}