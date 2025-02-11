// pages/token.js

import { Token } from '@/page-components/Token';
import Head from 'next/head';
import { useWriteContract } from 'wagmi'

const ERC_20_ABI = [
	{
	  "inputs": [
		{ "internalType": "address", "name": "sp", "type": "address" },
		{ "internalType": "uint256", "name": "am", "type": "uint256" }
	  ],
	  "name": "approve",
	  "outputs": [
		{ "internalType": "bool", "name": "", "type": "bool" }
	  ],
	  "stateMutability": "nonpayable",
	  "type": "function"
	},
	// Include other ERC20 functions (balanceOf, transfer, etc.) as needed.
  ];
  
function TransferFromButton() {
  const { writeContractAsync, isLoading, isError, isSuccess, data, error } =
    useWriteContract({
      // You can set up default mutation config here:
      onSuccess: (data, variables) => {
        console.log('Transaction success:', data)
      },
      onError: (err) => {
        console.error('Transaction error:', err)
      },
    })

  const handleTransfer = async () => {
    try {
      const result = await writeContractAsync({
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        abi:  [
          {
            "inputs": [
            { "internalType": "address", "name": "sp", "type": "address" },
            { "internalType": "uint256", "name": "am", "type": "uint256" }
            ],
            "name": "approve",
            "outputs": [
            { "internalType": "bool", "name": "", "type": "bool" }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "inputs": [
            { "internalType": "address", "name": "sender", "type": "address" },
            { "internalType": "address", "name": "recipient", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
            ],
            "name": "transferFrom",
            "outputs": [
            { "internalType": "bool", "name": "", "type": "bool" }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
          },
          // Include other ERC20 functions (balanceOf, transfer, etc.) as needed.
        ],
        functionName: 'transferFrom',
        args: [
          '0xd2135CfB216b74109775236E36d4b433F1DF507B',
          '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
          123n,
        ],
      })
      console.log('Tx confirmed:', result)
    } catch (err) {
      console.error('Tx failed:', err)
    }
  }

  return (
    <div>
      <button onClick={handleTransfer} disabled={isLoading}>
        {isLoading ? 'Transferring...' : 'Transfer'}
      </button>

      {isError && <p style={{ color: 'red' }}>Error: {error?.message}</p>}
      {isSuccess && <p>Tx Hash: {data?.hash}</p>}
    </div>
  )
}

const TokenPage = () => {
  return (
    <>
      <Head>
        <title>LMLT Presale</title>
      </Head>
      <Token 
        initialPrice={0}
        initialMcap={0}
      />
      <TransferFromButton />
    </>
  );
};

export default TokenPage;