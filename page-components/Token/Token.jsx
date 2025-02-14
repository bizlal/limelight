'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';
import axios from 'axios';

import { LimelightAscensionNoParamsABI, FercABI } from '@/lib/wagmi/abis';
import styles from './Token.module.css';
import BuySellComponent from './BuySellComponent';

// Use environment variables (or fallback constants) for contract addresses.
const LIMELIGHT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xYourLimelightAddress';
const TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS ||
  '0x6b175474e89094c44da98b954eedeac495271d0f'; // Update with correct Limelight token address
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY; // Added Etherscan API key
const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';

// Only load ApexCharts on the client side.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function usePastTransactions(address) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address) return;
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await axios.get(ETHERSCAN_API_URL, {
          params: {
            module: 'account',
            action: 'txlist',
            address,
            startblock: 0,
            endblock: 99999999,
            page: 1,
            offset: 10,
            sort: 'desc', // Sort by latest transactions
            apiKey: ETHERSCAN_API_KEY,
          },
        });

        // Ensure response contains valid transaction data
        if (Array.isArray(response.data.result)) {
          setTransactions(response.data.result);
        } else {
          setTransactions([]); // Set to empty array if no valid transactions
        }
      } catch (err) {
        setError('Failed to fetch transactions.');
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [address]);

  return { transactions, loading, error };
}

/**
 * Token – main trading component.
 */
export function Token() {
  // Local component state
  const [isBuying, setIsBuying] = useState(true);
  const [amount, setAmount] = useState('');
  const [timeFilter, setTimeFilter] = useState('1h');
  const [transactionStatus, setTransactionStatus] = useState('idle');
  const [transactionError, setTransactionError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Wallet & balance hooks
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();

  const { data: ethBalance } = useBalance({ address });
  const { data: lmltBalance } = useBalance({
    address,
    token: TOKEN_ADDRESS,
    chainId: 84532,
  });

  // Fetch past transactions using custom hook
  const {
    transactions: pastTransactions,
    loading: pastLoading,
    error: pastError,
  } = usePastTransactions(address);

  // Read contract state using useReadContract
  const {
    data: priceData,
    isLoading: isPriceLoading,
    error: priceError,
  } = useReadContract({
    address: LIMELIGHT_ADDRESS,
    abi: LimelightAscensionNoParamsABI,
    functionName: 'currentPrice',
    chainId: 84532,
  });
  const currentPrice = priceData ? Number(priceData.toString()) : 0;

  const { data: mcapData } = useReadContract({
    address: LIMELIGHT_ADDRESS,
    abi: LimelightAscensionNoParamsABI,
    functionName: 'currentMcap',
    chainId: 84532,
  });
  const mcap = mcapData ? Number(mcapData.toString()) : 0;

  const { data: progressData } = useReadContract({
    address: LIMELIGHT_ADDRESS,
    abi: LimelightAscensionNoParamsABI,
    functionName: 'ascensionProgress',
    chainId: 84532,
  });
  const ascensionProgress = progressData ? Number(progressData.toString()) : 0;

  // Read the user’s token allowance (converted to a BigNumber)
  const { data: allowanceData } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: FercABI,
    functionName: 'allowance',
    chainId: 84532,
    args: [address, LIMELIGHT_ADDRESS],
  });
  const userAllowance = allowanceData
    ? BigNumber.from(allowanceData.toString())
    : BigNumber.from(0);

  const { data: tradingOpen } = useReadContract({
    address: LIMELIGHT_ADDRESS,
    abi: LimelightAscensionNoParamsABI,
    functionName: 'tradingOpen',
    chainId: 84532,
  });
  console.log('Is trading open:', tradingOpen);

  // Write contract hooks
  const {
    data: buyData,
    isLoading: isBuyingLoading,
    error: buyError,
    writeContract: swapETHForTokens,
  } = useWriteContract();

  const {
    data: sellData,
    isLoading: isSellingLoading,
    error: sellError,
    writeContract: swapTokensForETH,
  } = useWriteContract();

  const {
    data: approveData,
    isLoading: isApproveLoading,
    error: approveError,
    writeContract: approveTokens,
  } = useWriteContract();

  // A quick ETH → USD conversion constant
  const ethUsdPrice = 3500;

  // Set hasMounted on first render (to help avoid hydration issues)
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Check whether an approval is needed (using BigNumber comparisons)
  useEffect(() => {
    if (!isBuying && amount) {
      try {
        const sellAmount = parseUnits(amount, 18);
        setNeedsApproval(sellAmount.gt(userAllowance));
      } catch (error) {
        console.error('Error parsing amount:', error);
        setNeedsApproval(false);
      }
    } else {
      setNeedsApproval(false);
    }
  }, [isBuying, amount, userAllowance]);

  // Handle transaction actions
  const handleTransaction = async (action, successMsg) => {
    setTransactionError(null);
    setTransactionStatus('pending');
    try {
      const tx = await action();
      if (tx && tx.wait) {
        const receipt = await tx.wait();
        console.log('Tx confirmed:', receipt);

        // Update transaction state if hash is available
        if (tx.hash) {
          setTransactions((prev) => [
            ...prev,
            {
              hash: tx.hash,
              type: isBuying ? 'Buy' : 'Sell',
              amount,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        setTransactionStatus('success');
        alert(successMsg);
      } else {
        console.error('Transaction object is invalid or not returned.');
        setTransactionStatus('error');
        setTransactionError('Transaction failed: Invalid response.');
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      setTransactionError(error.message || 'Transaction failed');
      setTransactionStatus('error');
    }
  };

  const handleSwap = async () => {
    if (!isConnected) {
      login();
      return;
    }
    if (!amount) return;

    if (isBuying) {
      if (!swapETHForTokens) {
        setTransactionError('swapETHForTokens function is not available');
        return;
      }
      const value = parseEther(amount);
      await handleTransaction(
        () =>
          swapETHForTokens({
            address: LIMELIGHT_ADDRESS,
            abi: LimelightAscensionNoParamsABI,
            functionName: 'swapETHForTokens',
            chainId: 84532,
            value,
          }),
        'Purchase successful!'
      );
    } else {
      const tokenAmount = parseUnits(amount, 18);

      // If approval is needed, first call approve
      if (needsApproval) {
        if (!approveTokens) {
          setTransactionError('approveTokens function is not available');
          return;
        }

        // Wait for approval transaction to be mined
        try {
          const approveTx = await approveTokens({
            address: TOKEN_ADDRESS,
            abi: FercABI,
            functionName: 'approve',
            chainId: 84532,
            args: [LIMELIGHT_ADDRESS, tokenAmount],
          });
          await approveTx.wait(); // Wait for the approval to be mined
          setNeedsApproval(false); // Reset the approval flag
          await handleTransaction(
            () =>
              swapTokensForETH({
                address: LIMELIGHT_ADDRESS,
                abi: LimelightAscensionNoParamsABI,
                functionName: 'swapTokensForETH',
                chainId: 84532,
                args: [tokenAmount],
              }),
            'Sale successful!'
          );
        } catch (error) {
          console.error('Approval failed:', error);
          setTransactionError('Approval failed');
          setTransactionStatus('error');
        }
      } else {
        if (!swapTokensForETH) {
          setTransactionError('swapTokensForETH function is not available');
          return;
        }
        await handleTransaction(
          () =>
            swapTokensForETH({
              address: LIMELIGHT_ADDRESS,
              abi: LimelightAscensionNoParamsABI,
              functionName: 'swapTokensForETH',
              chainId: 84532,
              args: [tokenAmount],
            }),
          'Sale successful!'
        );
      }
    }
  };

  const priceChartOptions = {
    chart: {
      type: 'line',
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#1e88e5'],
    stroke: { width: 2, curve: 'smooth' },
    xaxis: {
      categories: ['06:00', '12:00', '18:00'],
      labels: { style: { colors: '#718096' } },
    },
    yaxis: {
      labels: {
        style: { colors: '#718096' },
        formatter: (val) => `$${val.toFixed(4)}`,
      },
      min: currentPrice * 0.9,
      max: currentPrice * 1.1,
    },
    grid: { borderColor: '#e2e8f0' },
  };

  const priceChartSeries = [
    {
      name: 'Price',
      data: [currentPrice * 1.02, currentPrice, currentPrice * 1.05],
    },
  ];

  const getSwapButtonText = () => {
    if (!hasMounted || !isConnected) return 'Connect Wallet';
    if (transactionStatus === 'pending') return 'Processing...';
    if (needsApproval && !isBuying) return 'Approve LMLT';
    return isBuying ? 'Buy LMLT' : 'Sell LMLT';
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.tokenInfo}>
          <h1>LMLT / ETH</h1>
          <span className={styles.contractAddress}>
            {LIMELIGHT_ADDRESS.slice(0, 6)}...
            {LIMELIGHT_ADDRESS.slice(-4)}
          </span>
          <div className={styles.priceChange}>
            <span>${currentPrice.toFixed(4)}</span>
            <span className={styles.changeNegative}>-1.59%</span>
          </div>
        </div>
        <div className={styles.timeFilters}>
          {['1m', '5m', '15m', '1h', '4h', 'D'].map((filter) => (
            <button
              key={filter}
              className={`${styles.timeFilter} ${
                timeFilter === filter ? styles.active : ''
              }`}
              onClick={() => setTimeFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Column: Chart & metrics */}
        <div className={styles.leftColumn}>
          <div className={styles.chartContainer}>
            <Chart
              options={priceChartOptions}
              series={priceChartSeries}
              type="line"
              height={300}
            />
          </div>
          <div className={styles.tokenMetrics}>
            <div className={styles.metric}>
              <span>24h Volume</span>
              <strong>$59.59k</strong>
            </div>
            <div className={styles.metric}>
              <span>Market Cap</span>
              <strong>$200M</strong>
            </div>
            <div className={styles.metric}>
              <span>Holders</span>
              <strong>283,563</strong>
            </div>
            <div className={styles.metric}>
              <span>Ascension Progress</span>
              <div className={styles.ascensionWrapper}>
                <div className={styles.ascensionBar}>
                  <div
                    className={styles.ascensionFill}
                    style={{ width: `${ascensionProgress}%` }}
                  />
                </div>
                <strong>{ascensionProgress}%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Swap interface */}
        <div className={styles.rightColumn}>
          <div className={styles.swapContainer}>
            <div className={styles.swapTabs}>
              <button
                className={`${styles.swapTab} ${isBuying ? styles.active : ''}`}
                onClick={() => setIsBuying(true)}
              >
                Buy
              </button>
              <button
                className={`${styles.swapTab} ${
                  !isBuying ? styles.active : ''
                }`}
                onClick={() => setIsBuying(false)}
              >
                Sell
              </button>
            </div>
            {/* Swap Form */}
            <div className={styles.swapForm}>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={isBuying ? 'ETH amount' : 'LMLT amount'}
                />
                <div className={styles.inputLabels}>
                  <span>{isBuying ? 'ETH' : 'LMLT'}</span>
                  <span>
                    Balance:{' '}
                    {isBuying
                      ? ethBalance?.formatted?.slice(0, 10) || '0'
                      : lmltBalance?.formatted?.slice(0, 10) || '0'}
                  </span>
                </div>
                <span>
                  {isBuying
                    ? `$${(Number(amount || '0') * ethUsdPrice).toFixed(2)}`
                    : `$${(Number(amount || '0') * currentPrice).toFixed(2)}`}
                </span>
              </div>
              <button
                className={styles.swapButton}
                onClick={handleSwap}
                disabled={!amount || transactionStatus === 'pending'}
              >
                {getSwapButtonText()}
              </button>
              {transactionStatus === 'success' && (
                <div className={styles.statusSuccess}>
                  Transaction Complete!
                </div>
              )}
              {transactionStatus === 'error' && (
                <div className={styles.statusError}>
                  {transactionError || 'Transaction Failed'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Transaction History */}
      {pastLoading ? (
        <div>Loading past transactions...</div>
      ) : pastError ? (
        <div>{pastError}</div>
      ) : (
        <div className={styles.transactionHistory}>
          <h2>Your Past Transactions</h2>
          {pastTransactions.length === 0 ? (
            <p>No transactions found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Tx Hash</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {pastTransactions.map((tx, idx) => (
                  <tr key={tx.hash}>
                    <td>{tx.to === address ? 'Received' : 'Sent'}</td>
                    <td>{parseFloat(tx.value) / 1e18} ETH</td>
                    <td>
                      <a
                        href={`https://etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                      </a>
                    </td>
                    <td>{new Date(tx.timeStamp * 1000).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <span>Powered by Uniswap V2 (Base)</span>
        <span>Gecko Terminal</span>
      </div>
    </div>
  );
}

export default Token;
