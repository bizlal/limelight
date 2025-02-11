"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  useAccount,
  useBalance,
  // Remove old imports:
  // useContractWrite,
  // Instead, import the new hooks:
  useReadContract,
  useWriteContract,
} from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { parseEther, parseUnits } from "ethers/lib/utils";

import { LimelightAscensionNoParamsABI, FercABI } from "@/lib/wagmi/abis";
import styles from "./Token.module.css";

// Use environment variables or fallback constants for contract addresses.
const LIMELIGHT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xYourLimelightAddress";
const TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS ||
  "0x6b175474e89094c44da98b954eedeac495271d0f";

// Only load ApexCharts on the client
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

//
// TransferFromButton Component using useWriteContract
//
function TransferFromButton() {
  // Setup the useWriteContract hook once for transferFrom
  const {
    data: transferData,
    isLoading: isTransferLoading,
    isError: isTransferError,
    error: transferError,
    writeContract: transferFrom,
  } = useWriteContract();

  const handleTransfer = async () => {
    if (!transferFrom) {
      console.error("transferFrom function is not available");
      return;
    }
    try {
      // Use BigInt for amounts in arguments
      const tx = await transferFrom({
        address: TOKEN_ADDRESS,
        abi: FercABI,
        functionName: "transferFrom",
        chainId: 84532,
        args: [
          "0xd2135CfB216b74109775236E36d4b433F1DF507B", // sender
          "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e", // recipient
          123n, // amount
        ],
      });
      const receipt = await tx.wait();
      console.log("Tx confirmed:", receipt);
    } catch (err) {
      console.error("Tx failed:", err);
    }
  };

  return (
    <div>
      <button onClick={handleTransfer} disabled={isTransferLoading}>
        {isTransferLoading ? "Transferring..." : "Transfer"}
      </button>
      {isTransferError && (
        <p style={{ color: "red" }}>Error: {transferError?.message}</p>
      )}
      {transferData && <p>Tx Hash: {transferData?.hash}</p>}
    </div>
  );
}

//
// Main Token Component
//
export function Token() {
  // -----------------------------------
  // STATES
  // -----------------------------------
  const [isBuying, setIsBuying] = useState(true);
  const [amount, setAmount] = useState("");
  const [timeFilter, setTimeFilter] = useState("1h");
  const [transactionStatus, setTransactionStatus] = useState("idle");
  const [transactionError, setTransactionError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // -----------------------------------
  // WALLET & BALANCE HOOKS
  // -----------------------------------
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();

  const { data: ethBalance } = useBalance({ address });
  const { data: lmltBalance } = useBalance({
    address,
    token: TOKEN_ADDRESS,
    chainId: 84532,
  });

  // -----------------------------------
  // READ CONTRACT DATA USING useReadContract
  // -----------------------------------
  const {
    data: priceData,
    isLoading: isPriceLoading,
    error: priceError,
  } = useReadContract({
    address: LIMELIGHT_ADDRESS,
    abi: LimelightAscensionNoParamsABI,
    functionName: "currentPrice",
    chainId: 84532,
    // If you want to re-run on an interval, you can do:
    // refetchInterval: 10000, // e.g. every 10 seconds
  });
  const currentPrice = priceData ? Number(priceData.toString()) : 0;

  const { data: mcapData } = useReadContract({
    address: LIMELIGHT_ADDRESS,
    abi: LimelightAscensionNoParamsABI,
    functionName: "currentMcap",
    chainId: 84532,
  });
  const mcap = mcapData ? Number(mcapData.toString()) : 0;

  const { data: progressData } = useReadContract({
    address: LIMELIGHT_ADDRESS,
    abi: LimelightAscensionNoParamsABI,
    functionName: "ascensionProgress",
    chainId: 84532,
  });
  const ascensionProgress = progressData ? Number(progressData.toString()) : 0;

  // Read token allowance
  const { data: allowanceData } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: FercABI,
    functionName: "allowance",
    chainId: 84532,
    args: [address, LIMELIGHT_ADDRESS],
  });
  const userAllowance = allowanceData ? Number(allowanceData.toString()) : 0;

  // Read trading open status (optional)
  const { data: tradingOpen } = useReadContract({
    address: LIMELIGHT_ADDRESS,
    abi: LimelightAscensionNoParamsABI,
    functionName: "tradingOpen",
    chainId: 84532,
  });
  console.log("Is trading:", tradingOpen);

  // -----------------------------------
  // WRITE CONTRACT HOOKS USING useWriteContract
  // -----------------------------------
  // 1) For buying tokens (ETH -> LMLT)
  const {
    data: buyData,
    isLoading: isBuyingLoading,
    error: buyError,
    writeContract: swapETHForTokens,
  } = useWriteContract();

  // 2) For selling tokens (LMLT -> ETH)
  const {
    data: sellData,
    isLoading: isSellingLoading,
    error: sellError,
    writeContract: swapTokensForETH,
  } = useWriteContract();

  // 3) For approval when selling tokens
  const {
    data: approveData,
    isLoading: isApproveLoading,
    error: approveError,
    writeContract: approveTokens,
  } = useWriteContract();

  // Quick ETH → USD "constant"
  const ethUsdPrice = 3500;

  // -----------------------------------
  // EFFECTS
  // -----------------------------------
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Check if approval is needed for selling.
  // (In production, always use proper BigNumber checks + decimals.)
  useEffect(() => {
    const sellAmount = parseFloat(amount || "0");
    if (!isBuying && sellAmount > 0 && sellAmount > userAllowance) {
      setNeedsApproval(true);
    } else {
      setNeedsApproval(false);
    }
  }, [isBuying, amount, userAllowance]);

  // -----------------------------------
  // CHART OPTIONS
  // -----------------------------------
  const priceChartOptions = {
    chart: {
      type: "line",
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ["#1e88e5"],
    stroke: { width: 2, curve: "smooth" },
    xaxis: {
      categories: ["06:00", "12:00", "18:00"],
      labels: { style: { colors: "#718096" } },
    },
    yaxis: {
      labels: {
        style: { colors: "#718096" },
        formatter: (val) => `$${val.toFixed(4)}`,
      },
      min: currentPrice * 0.9,
      max: currentPrice * 1.1,
    },
    grid: { borderColor: "#e2e8f0" },
  };

  const priceChartSeries = [
    {
      name: "Price",
      data: [currentPrice * 1.02, currentPrice, currentPrice * 1.05],
    },
  ];

  // -----------------------------------
  // HANDLERS
  // -----------------------------------
  const handleSwap = async () => {
    if (!isConnected) {
      login();
      return;
    }
    if (!amount) return;

    try {
      setTransactionError(null);
      setTransactionStatus("pending");
      let tx;

      if (isBuying) {
        if (!swapETHForTokens) {
          throw new Error("swapETHForTokens function is not available");
        }
        // Convert ETH amount to wei
        const value = parseEther(amount);
        tx = await swapETHForTokens({
          address: LIMELIGHT_ADDRESS,
          abi: LimelightAscensionNoParamsABI,
          functionName: "swapETHForTokens",
          chainId: 84532,
          value, // pass as "value" for payable
        });
      } else {
        // Selling: convert the token amount (assume 18 decimals).
        const tokenAmount = parseUnits(amount, 18);

        // Approve first, if needed
        if (needsApproval) {
          if (!approveTokens) {
            throw new Error("approveTokens function is not available");
          }
          const approveTx = await approveTokens({
            address: TOKEN_ADDRESS,
            abi: FercABI,
            functionName: "approve",
            chainId: 84532,
            args: [LIMELIGHT_ADDRESS, tokenAmount],
          });
          await approveTx.wait();
          setNeedsApproval(false);
        }

        if (!swapTokensForETH) {
          throw new Error("swapTokensForETH function is not available");
        }
        tx = await swapTokensForETH({
          address: LIMELIGHT_ADDRESS,
          abi: LimelightAscensionNoParamsABI,
          functionName: "swapTokensForETH",
          chainId: 84532,
          args: [tokenAmount],
        });
      }

      await tx.wait();
      setTransactionStatus("success");
      setTransactions((prev) => [
        ...prev,
        {
          hash: tx.hash,
          type: isBuying ? "Buy" : "Sell",
          amount,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Transaction failed:", error);
      setTransactionStatus("error");
      setTransactionError(error.message || "Transaction failed");
    }
  };

  const getSwapButtonText = () => {
    if (!hasMounted) return "Connect Wallet";
    if (!isConnected) return "Connect Wallet";
    if (transactionStatus === "pending") return "Processing...";
    if (needsApproval && !isBuying) return "Approve LMLT";
    return isBuying ? "Buy LMLT" : "Sell LMLT";
  };

  // -----------------------------------
  // RENDER
  // -----------------------------------
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
          {["1m", "5m", "15m", "1h", "4h", "D"].map((filter) => (
            <button
              key={filter}
              className={`${styles.timeFilter} ${
                timeFilter === filter ? styles.active : ""
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
        {/* Left Column */}
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
              <strong>$598.59k</strong>
            </div>
            <div className={styles.metric}>
              <span>Market Cap</span>
              <strong>${mcap.toFixed(2)}M</strong>
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

        {/* Right Column */}
        <div className={styles.rightColumn}>
          <div className={styles.swapContainer}>
            <div className={styles.swapTabs}>
              {/* TransferFrom example button */}
              <TransferFromButton />
              <button
                className={`${styles.swapTab} ${isBuying ? styles.active : ""}`}
                onClick={() => setIsBuying(true)}
              >
                Buy
              </button>
              <button
                className={`${styles.swapTab} ${
                  !isBuying ? styles.active : ""
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
                  placeholder={isBuying ? "ETH amount" : "LMLT amount"}
                />
                <div className={styles.inputLabels}>
                  <span>{isBuying ? "ETH" : "LMLT"}</span>
                  <span>
                    Balance:{" "}
                    {isBuying
                      ? ethBalance?.formatted?.slice(0, 10) || "0"
                      : lmltBalance?.formatted?.slice(0, 10) || "0"}
                  </span>
                </div>
                <span>
                  {isBuying
                    ? `$${(Number(amount || "0") * ethUsdPrice).toFixed(2)}`
                    : `$${(Number(amount || "0") * currentPrice).toFixed(2)}`}
                </span>
              </div>
              {/* Swap Button */}
              <button
                className={styles.swapButton}
                onClick={handleSwap}
                disabled={
                  !amount ||
                  transactionStatus === "pending" ||
                  transactionStatus === "success"
                }
              >
                {getSwapButtonText()}
              </button>
              {/* Transaction Status */}
              {transactionStatus === "success" && (
                <div className={styles.statusSuccess}>
                  Transaction Complete!
                </div>
              )}
              {transactionStatus === "error" && (
                <div className={styles.statusError}>
                  {transactionError || "Transaction Failed"}
                </div>
              )}
            </div>
          </div>
          <div className={styles.tokenDetails}>
            <h3>Token Details</h3>
            <div className={styles.detailItem}>
              <span>Contract</span>
              <span>
                {LIMELIGHT_ADDRESS.slice(0, 6)}...
                {LIMELIGHT_ADDRESS.slice(-4)}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span>Liquidity</span>
              <span>$4m</span>
            </div>
            <div className={styles.detailItem}>
              <span>24h Change</span>
              <span className={styles.changePositive}>+15.04%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div className={styles.transactionHistory}>
          <h2>Your Recent Transactions</h2>
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
              {transactions.map((tx, idx) => (
                <tr key={`${tx.hash}_${idx}`}>
                  <td>{tx.type}</td>
                  <td>{tx.amount}</td>
                  <td>
                    <a
                      href={`https://basescan.org/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                    </a>
                  </td>
                  <td>
                    {new Date(tx.timestamp).toLocaleTimeString()} -{" "}
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
