// page-components/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import {
  parseAbi,
  formatUnits,
  parseUnits,
  createPublicClient,
  http,
} from 'viem';
import { mainnet } from 'viem/chains';

// ---------------------------------------------------------------------
// Replace these with your actual deployed addresses (on testnet/mainnet)
const LMLT_TOKEN_ADDRESS = '0xLMLT_TOKEN_CONTRACT_ADDRESS';
const BONDING_CONTRACT_ADDRESS = '0xARTIST_TOKEN_CONTRACT_OR_BONDING_CURVE';
// ---------------------------------------------------------------------

// Minimal ABIs:
const ERC20_ABI = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

const BondingCurveABI = parseAbi([
  'function stake(uint256 amount) payable',
  'function unstake(uint256 amount) payable',
  'function tokenPrice() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
]);

// Create a public client using Viem (adjust the chain/transport as needed)
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

/**
 * Custom hook to wait for a transaction receipt by polling the blockchain.
 * @param {Object} param0 - The parameters object.
 * @param {string} param0.hash - The transaction hash to wait for.
 * @param {number} [param0.pollingInterval=1000] - How often (ms) to poll for the receipt.
 */
function useWaitForTransaction({ hash, pollingInterval = 1000 }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(hash));
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hash) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const interval = setInterval(async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash });
        if (receipt) {
          setData(receipt);
          setIsLoading(false);
          // Depending on the chain, receipt.status might be a number (1 for success)
          setIsSuccess(receipt.status === 1 || receipt.status === 'success');
          clearInterval(interval);
        }
      } catch (err) {
        setError(err);
        setIsError(true);
        setIsLoading(false);
        clearInterval(interval);
      }
    }, pollingInterval);
    return () => clearInterval(interval);
  }, [hash, pollingInterval]);

  return { data, isLoading, isSuccess, isError, error };
}

export default function Dashboard() {
  const { ready, authenticated } = usePrivy();
  const { address: connectedWallet } = useAccount();

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  useEffect(() => {
    if (ready && !authenticated) {
      window.location.href = '/';
    }
  }, [ready, authenticated]);

  // ------------------ READ DATA ------------------

  // Fetch LMLT balance of the user
  const { data: lmltBalanceData } = useBalance({
    address: connectedWallet,
    token: LMLT_TOKEN_ADDRESS,
    watch: true,
  });
  const lmltBalance = lmltBalanceData
    ? formatUnits(lmltBalanceData.value, lmltBalanceData.decimals)
    : '0';

  // Fetch artist token balance
  const { data: artistTokenBalRaw } = useReadContract({
    address: BONDING_CONTRACT_ADDRESS,
    abi: BondingCurveABI,
    functionName: 'balanceOf',
    args: [connectedWallet],
    watch: true,
  });
  const artistTokenBalance = artistTokenBalRaw
    ? formatUnits(artistTokenBalRaw, 18)
    : '0';

  // Fetch current token price
  const { data: priceData } = useReadContract({
    address: BONDING_CONTRACT_ADDRESS,
    abi: BondingCurveABI,
    functionName: 'tokenPrice',
    watch: true,
  });
  const currentPrice = priceData ? formatUnits(priceData, 18) : '-';

  // Fetch total token supply
  const { data: supplyData } = useReadContract({
    address: BONDING_CONTRACT_ADDRESS,
    abi: BondingCurveABI,
    functionName: 'totalSupply',
    watch: true,
  });
  const totalSupply = supplyData ? formatUnits(supplyData, 18) : '0';

  // Fetch current allowance for staking (approval)
  const { data: allowanceData } = useReadContract({
    address: LMLT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [connectedWallet, BONDING_CONTRACT_ADDRESS],
    watch: true,
  });

  // Determine if approval is needed based on the stake amount vs. allowance
  let needApproval = false;
  if (stakeAmount && allowanceData) {
    try {
      const stakeAmountBigInt = parseUnits(stakeAmount, 18);
      needApproval = stakeAmountBigInt > allowanceData;
    } catch (error) {
      console.error('Error parsing stake amount:', error);
    }
  }

  // ------------------ APPROVAL ------------------
  const { data: approveWriteData, write: approveWrite } = useWriteContract({
    address: LMLT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [
      BONDING_CONTRACT_ADDRESS,
      stakeAmount ? parseUnits(stakeAmount, 18) : BigInt(0),
    ],
  });

  const {
    data: approveTxData,
    isLoading: isApproving,
    isSuccess: approveConfirmed,
    isError: isApproveError,
    error: approveTxError,
  } = useWaitForTransaction({
    hash: approveWriteData && approveWriteData.hash,
  });

  const approveTxSent = Boolean(approveWriteData);

  // ------------------ STAKING ------------------
  const { data: stakeWriteData, write: stakeWrite } = useWriteContract({
    address: BONDING_CONTRACT_ADDRESS,
    abi: BondingCurveABI,
    functionName: 'stake',
    args: [stakeAmount ? parseUnits(stakeAmount, 18) : BigInt(0)],
  });

  const {
    data: stakeTxData,
    isLoading: isStaking,
    isSuccess: stakeConfirmed,
    isError: isStakeError,
    error: stakeTxError,
  } = useWaitForTransaction({ hash: stakeWriteData && stakeWriteData.hash });

  const stakeTxSent = Boolean(stakeWriteData);

  // ------------------ UNSTAKING ------------------
  const { data: unstakeWriteData, write: unstakeWrite } = useWriteContract({
    address: BONDING_CONTRACT_ADDRESS,
    abi: BondingCurveABI,
    functionName: 'unstake',
    args: [unstakeAmount ? parseUnits(unstakeAmount, 18) : BigInt(0)],
  });

  const {
    data: unstakeTxData,
    isLoading: isUnstaking,
    isSuccess: unstakeConfirmed,
    isError: isUnstakeError,
    error: unstakeTxError,
  } = useWaitForTransaction({
    hash: unstakeWriteData && unstakeWriteData.hash,
  });

  const unstakeTxSent = Boolean(unstakeWriteData);

  // ---------------------------------------------------------------------
  // UI Rendering
  // ---------------------------------------------------------------------
  return (
    <div style={{ padding: '1rem' }}>
      <h2>Limelight Dashboard (Example)</h2>
      <p>
        <strong>Connected Wallet:</strong> {connectedWallet || '(none)'}
      </p>
      <p>
        <strong>Your LMLT Balance:</strong> {lmltBalance} LMLT
      </p>
      <p>
        <strong>Your Artist Token Balance:</strong> {artistTokenBalance}
      </p>
      <p>
        <strong>Current Token Price:</strong> {currentPrice} LMLT / token
      </p>
      <p>
        <strong>Total Token Supply:</strong> {totalSupply}
      </p>
      <hr />
      {/* ------------------ STAKE SECTION ------------------ */}
      <h3>Stake LMLT to Buy Tokens</h3>
      <input
        type="number"
        min="0"
        step="any"
        value={stakeAmount}
        onChange={(e) => setStakeAmount(e.target.value)}
        placeholder="Amount of LMLT to stake"
      />{' '}
      {/* 1. Approve if needed */}
      {needApproval && (
        <button
          onClick={() => approveWrite && approveWrite()}
          disabled={!approveWrite || isApproving}
          style={{ marginRight: '0.5rem' }}
        >
          {isApproving ? 'Approving...' : 'Approve LMLT'}
        </button>
      )}
      {/* 2. Stake */}
      <button
        onClick={() => stakeWrite && stakeWrite()}
        disabled={
          !stakeWrite || isStaking || (needApproval && !approveConfirmed)
        }
      >
        {isStaking ? 'Staking...' : 'Stake'}
      </button>
      {/* Status messages for Approval */}
      {approveTxSent && !approveConfirmed && (
        <p>Approval TX sent... waiting confirmation.</p>
      )}
      {approveConfirmed && (
        <p style={{ color: 'green' }}>LMLT spending approved!</p>
      )}
      {isApproveError && (
        <p style={{ color: 'red' }}>
          Approval Error:{' '}
          {(approveTxError && approveTxError.message) ||
            'Error during approval.'}
        </p>
      )}
      {/* Status messages for Staking */}
      {stakeTxSent && !stakeConfirmed && (
        <p>Stake TX sent... waiting confirmation.</p>
      )}
      {stakeConfirmed && <p style={{ color: 'green' }}>Stake successful! 🎉</p>}
      {isStakeError && (
        <p style={{ color: 'red' }}>
          Stake Error:{' '}
          {(stakeTxError && stakeTxError.message) || 'Error during staking.'}
        </p>
      )}
      <hr />
      {/* ------------------ UNSTAKE SECTION ------------------ */}
      <h3>Unstake Tokens to Redeem LMLT</h3>
      <input
        type="number"
        min="0"
        step="any"
        value={unstakeAmount}
        onChange={(e) => setUnstakeAmount(e.target.value)}
        placeholder="Amount of tokens to sell"
      />{' '}
      <button
        onClick={() => unstakeWrite && unstakeWrite()}
        disabled={!unstakeWrite || isUnstaking}
      >
        {isUnstaking ? 'Unstaking...' : 'Unstake'}
      </button>
      {/* Status messages for Unstaking */}
      {unstakeTxSent && !unstakeConfirmed && (
        <p>Unstake TX sent... waiting confirmation.</p>
      )}
      {unstakeConfirmed && (
        <p style={{ color: 'green' }}>
          Unstake successful! You got your LMLT back.
        </p>
      )}
      {isUnstakeError && (
        <p style={{ color: 'red' }}>
          Unstake Error:{' '}
          {(unstakeTxError && unstakeTxError.message) ||
            'Error during unstaking.'}
        </p>
      )}
    </div>
  );
}
