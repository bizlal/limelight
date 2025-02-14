import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
} from 'wagmi';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { limelightContract, tokenContract } from './config';

// ---------------------------------------------------------------------
// 1) Contract Config
// ---------------------------------------------------------------------

export const useLimelightContract = () => limelightContract;
export const useTokenContract = () => tokenContract;

// ---------------------------------------------------------------------
// 2) Sale Contract Read Hooks
// ---------------------------------------------------------------------

export const useTokenPrice = () => {
  const { data, isSuccess } = useReadContract({
    address: limelightContract.address,
    abi: limelightContract.abi,
    functionName: 'currentPrice',
    chainId: limelightContract.chainId,
  });
  const currentPrice = data ? Number(data.toString()) : 0;
  console.log('Current price:', currentPrice);
  return { currentPrice, isSuccess };
};

export const useAscensionProgress = () => {
  const { data, isSuccess } = useReadContract({
    address: limelightContract.address,
    abi: limelightContract.abi,
    functionName: 'ascensionProgress',
    chainId: limelightContract.chainId,
  });
  const progress = data ? Number(data.toString()) : 0;
  return { progress, isSuccess };
};

export const useMarketCap = () => {
  const { data, isSuccess } = useReadContract({
    address: limelightContract.address,
    abi: limelightContract.abi,
    functionName: 'currentMcap',
    chainId: limelightContract.chainId,
  });
  const currentMcap = data ? Number(data.toString()) : 0;
  return { currentMcap, isSuccess };
};

export const useMaxPurchase = () => {
  const { data, isSuccess } = useReadContract({
    address: limelightContract.address,
    abi: limelightContract.abi,
    functionName: 'maxPurchaseAmount',
    chainId: limelightContract.chainId,
  });
  const maxPurchase = data ? Number(data.toString()) : 0;
  return { maxPurchase, isSuccess };
};

// ---------------------------------------------------------------------
// 3) Sale Contract Write Hooks
// ---------------------------------------------------------------------

export const usePurchaseTokens = () => {
  const { writeContractAsync } = useWriteContract({
    address: limelightContract.address,
    abi: limelightContract.abi,
    functionName: 'swapETHForTokens',
    chainId: limelightContract.chainId,
  });

  return (ethAmount) => {
    // Convert string ETH amount to Wei
    const value = parseEther(ethAmount);
    return writeContractAsync({
      overrides: { value },
    });
  };
};

export const useSellTokens = () => {
  const { writeContractAsync } = useWriteContract({
    address: limelightContract.address,
    abi: limelightContract.abi,
    functionName: 'swapTokensForETH',
    chainId: limelightContract.chainId,
  });

  return async (lmltAmount) => {
    // Convert LMLT (assumed to be in human-readable units) to Wei
    const amountIn = parseUnits(lmltAmount, 18);
    return await writeContractAsync({
      args: [amountIn],
    });
  };
};

// ---------------------------------------------------------------------
// 4) Token (ERC20) Contract Read / Write Hooks
// ---------------------------------------------------------------------

export const useTokenAllowance = () => {
  const { address } = useAccount();
  const { data, isSuccess } = useReadContract({
    address: tokenContract.address,
    abi: tokenContract.abi,
    functionName: 'allowance',
    args: [address, tokenContract.address],
    chainId: tokenContract.chainId,
  });
  const allowance = data ? Number(data.toString()) : 0;
  return { allowance, isSuccess };
};

export const useTokenApprove = () => {
  // Using useWriteContract with error handling
  const { writeContractAsync } = useWriteContract({
    address: tokenContract.address,
    abi: tokenContract.abi,
    functionName: 'approve',
    chainId: tokenContract.chainId,
  });

  return async (lmltAmount) => {
    const amountIn = parseUnits(lmltAmount, 18);
    console.log('Approving:', amountIn.toString());
    console.log('Token Contract:', tokenContract.address);

    return await writeContractAsync({
      args: [tokenContract.address, amountIn],
    });
  };
};

// ---------------------------------------------------------------------
// 5) Graduation Status Hook
// ---------------------------------------------------------------------

export const useGraduationStatus = () => {
  // Get contract values using two separate useReadContract calls
  const { data: isGraduated, isSuccess: graduatedSuccess } = useReadContract({
    address: limelightContract.address,
    abi: limelightContract.abi,
    functionName: 'graduated',
    chainId: limelightContract.chainId,
  });

  const { data: progressData, isSuccess: progressSuccess } = useReadContract({
    address: limelightContract.address,
    abi: limelightContract.abi,
    functionName: 'ascensionProgress',
    chainId: limelightContract.chainId,
  });
  const progress = progressData ? Number(progressData.toString()) : 0;

  // Watch for the Graduation event
  useWatchContractEvent({
    address: limelightContract.address,
    abi: limelightContract.abi,
    eventName: 'Graduated',
    chainId: limelightContract.chainId,
    onLogs: (logs) => console.log('Graduated event:', logs),
  });

  return { isGraduated, progress, graduatedSuccess, progressSuccess };
};
