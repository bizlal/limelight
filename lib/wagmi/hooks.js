// lib/wagmi/hooks.js

import { useState, useEffect } from "react";
import axios from "axios";

const ETHERSCAN_API_URL = "https://api.etherscan.io/api";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY; // Ensure you have this in your environment variables

export function usePastTransactions(address) {
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
            module: "account",
            action: "txlist",
            address,
            startblock: 0,
            endblock: 99999999,
            page: 1,
            offset: 10,
            sort: "desc", // Sort by latest transactions
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
        setError("Failed to fetch transactions.");
        console.error("Error fetching transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [address]);

  return { transactions, loading, error };
}
