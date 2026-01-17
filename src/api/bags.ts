import { config } from "../utils/config.js"

const BASE_URL = config.bagsApiUrl

interface ApiResponse<T> {
  success: boolean
  response?: T
  error?: string
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.bagsApiKey,
      ...options.headers,
    },
  })

  const data: ApiResponse<T> = await response.json()

  if (!data.success) {
    throw new Error(data.error || "API request failed")
  }

  return data.response as T
}

// Types
export interface ClaimablePosition {
  tokenMint: string
  poolConfigKey: string
  feeClaimerVault: string
  claimableAmount: string
  claimableAmountUsd: string
}

export interface ClaimTransaction {
  transaction: string
  poolConfigKey: string
}

export interface FeeShareWallet {
  wallet: string
  username: string
  royaltyBps: number
  isCreator: boolean
}

export interface TokenLifetimeFees {
  tokenMint: string
  totalFeesCollected: string
  totalFeesCollectedUsd: string
}

export interface TradeQuote {
  inputAmount: string
  outputAmount: string
  priceImpact: string
  fee: string
}

export interface TokenClaimStats {
  username: string
  pfp: string
  royaltyBps: number
  isCreator: boolean
  wallet: string
  totalClaimed: string
  provider: string
  providerUsername: string
}

// API Functions

/**
 * Get claimable fee positions for a wallet
 */
export async function getClaimablePositions(wallet: string): Promise<ClaimablePosition[]> {
  return apiRequest<ClaimablePosition[]>(`/fee-claiming/positions?wallet=${wallet}`)
}

/**
 * Get claim transactions for specified positions
 */
export async function getClaimTransactions(wallet: string, poolConfigKeys: string[]): Promise<ClaimTransaction[]> {
  return apiRequest<ClaimTransaction[]>("/fee-claiming/transactions", {
    method: "POST",
    body: JSON.stringify({
      wallet,
      poolConfigKeys,
    }),
  })
}

/**
 * Get fee share wallet info for a token
 */
export async function getFeeShareWallet(tokenMint: string): Promise<FeeShareWallet[]> {
  return apiRequest<FeeShareWallet[]>(`/fee-share/wallet-v2?tokenMint=${tokenMint}`)
}

/**
 * Get bulk fee share wallets
 */
export async function getBulkFeeShareWallets(tokenMints: string[]): Promise<Record<string, FeeShareWallet[]>> {
  return apiRequest<Record<string, FeeShareWallet[]>>("/fee-share/wallet-v2/bulk", {
    method: "POST",
    body: JSON.stringify({ tokenMints }),
  })
}

/**
 * Get token lifetime fees
 */
export async function getTokenLifetimeFees(tokenMint: string): Promise<TokenLifetimeFees> {
  return apiRequest<TokenLifetimeFees>(`/analytics/token-lifetime-fees?tokenMint=${tokenMint}`)
}

/**
 * Get token claim stats
 */
export async function getTokenClaimStats(tokenMint: string): Promise<TokenClaimStats[]> {
  return apiRequest<TokenClaimStats[]>(`/token-launch/claim-stats?tokenMint=${tokenMint}`)
}

/**
 * Get trade quote for buyback
 */
export async function getTradeQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps = 100,
): Promise<TradeQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: slippageBps.toString(),
  })

  return apiRequest<TradeQuote>(`/trade/quote?${params}`)
}

/**
 * Create swap transaction for buyback
 */
export async function createSwapTransaction(
  wallet: string,
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps = 100,
): Promise<string> {
  return apiRequest<string>("/trade/swap", {
    method: "POST",
    body: JSON.stringify({
      wallet,
      inputMint,
      outputMint,
      amount,
      slippageBps,
    }),
  })
}

/**
 * Get token launch creators
 */
export async function getTokenLaunchCreators(tokenMint: string): Promise<any[]> {
  return apiRequest<any[]>(`/analytics/token-launch-creators?tokenMint=${tokenMint}`)
}
