import { formatEther, parseEther } from 'viem'

export const formatETH = (value) => {
  if (!value) return '0.00'
  return parseFloat(formatEther(value)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

export const safeParseETH = (value) => {
  try {
    return parseEther(String(value))
  } catch (error) {
    return 0n
  }
}

export const handleContractError = (error) => {
  const message = error.shortMessage || error.message
  if (message.includes('insufficient funds')) return 'Insufficient balance'
  if (message.includes('user rejected')) return 'Transaction rejected'
  return 'Transaction failed'
}