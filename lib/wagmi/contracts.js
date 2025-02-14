// lib/wagmi/contracts.js

import { useReadContract, useWriteContract } from 'wagmi';
import { LimelightAscensionNoParamsABI, FercABI } from '@/lib/wagmi/abis';
import { BigNumber } from 'ethers';

// Read contract hook for fetching market cap
export function useMarketCap(LIMELIGHT_ADDRESS) {
  const { data, isLoading, error } = useReadContract({
    address: LIMELIGHT_ADDRESS,
    abi: LimelightAscensionNoParamsABI,
    functionName: 'currentMcap',
    chainId: 84532,
  });

  const mcap = data ? Number(data.toString()) : 0;
  return { mcap, isLoading, error };
}

// Read contract hook for fetching ascension progress
export function useAscensionProgress(LIMELIGHT_ADDRESS) {
  const { data, isLoading, error } = useReadContract({
    address: LIMELIGHT_ADDRESS,
    abi: LimelightAscensionNoParamsABI,
    functionName: 'ascensionProgress',
    chainId: 84532,
  });

  const ascensionProgress = data ? Number(data.toString()) : 0;
  return { ascensionProgress, isLoading, error };
}

// Read contract hook for fetching allowance
export function useAllowance(TOKEN_ADDRESS, address, LIMELIGHT_ADDRESS) {
  const { data, isLoading, error } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: FercABI,
    functionName: 'allowance',
    chainId: 84532,
    args: [address, LIMELIGHT_ADDRESS],
  });

  const userAllowance = data
    ? BigNumber.from(data.toString())
    : BigNumber.from(0);
  return { userAllowance, isLoading, error };
}

// Write contract hook for approving tokens
export function useApproveTokens() {
  const { writeContract: approveTokens, isLoading, error } = useWriteContract();
  return { approveTokens, isLoading, error };
}

// Write contract hook for swapping ETH for tokens
export function useSwapETHForTokens() {
  const {
    writeContract: swapETHForTokens,
    isLoading,
    error,
  } = useWriteContract();
  return { swapETHForTokens, isLoading, error };
}

// Write contract hook for swapping tokens for ETH
export function useSwapTokensForETH() {
  const {
    writeContract: swapTokensForETH,
    isLoading,
    error,
  } = useWriteContract();
  return { swapTokensForETH, isLoading, error };
}
