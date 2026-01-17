import {
  getClaimablePositions,
  getClaimTransactions,
  getTokenLifetimeFees,
  getTokenClaimStats,
  type ClaimablePosition,
} from "../api/bags.js"
import { getPublicKey, signAndSendTransaction, lamportsToSol } from "../utils/solana.js"
import { config } from "../utils/config.js"

export interface FeeCollectionResult {
  success: boolean
  totalClaimed: number
  totalClaimedUsd: number
  transactions: string[]
  errors: string[]
}

export interface FeeStatus {
  tokenMint: string
  lifetimeFeesCollected: number
  lifetimeFeesCollectedUsd: number
  claimablePositions: ClaimablePosition[]
  totalClaimable: number
  totalClaimableUsd: number
  feeSharers: Array<{
    username: string
    royaltyBps: number
    totalClaimed: string
  }>
}

/**
 * Get current fee status for the configured token
 */
export async function getFeeStatus(): Promise<FeeStatus> {
  const wallet = getPublicKey()
  const tokenMint = config.tokenMint

  // Fetch all data in parallel
  const [lifetimeFees, claimablePositions, claimStats] = await Promise.all([
    getTokenLifetimeFees(tokenMint),
    getClaimablePositions(wallet),
    getTokenClaimStats(tokenMint),
  ])

  // Filter positions for our token
  const tokenPositions = claimablePositions.filter((p) => p.tokenMint === tokenMint)

  // Calculate totals
  const totalClaimable = tokenPositions.reduce((sum, p) => sum + Number.parseFloat(p.claimableAmount), 0)
  const totalClaimableUsd = tokenPositions.reduce((sum, p) => sum + Number.parseFloat(p.claimableAmountUsd), 0)

  return {
    tokenMint,
    lifetimeFeesCollected: Number.parseFloat(lifetimeFees.totalFeesCollected),
    lifetimeFeesCollectedUsd: Number.parseFloat(lifetimeFees.totalFeesCollectedUsd),
    claimablePositions: tokenPositions,
    totalClaimable: lamportsToSol(totalClaimable),
    totalClaimableUsd,
    feeSharers: claimStats.map((s) => ({
      username: s.providerUsername || s.username,
      royaltyBps: s.royaltyBps,
      totalClaimed: s.totalClaimed,
    })),
  }
}

/**
 * Collect all claimable fees
 */
export async function collectFees(): Promise<FeeCollectionResult> {
  const wallet = getPublicKey()
  const result: FeeCollectionResult = {
    success: true,
    totalClaimed: 0,
    totalClaimedUsd: 0,
    transactions: [],
    errors: [],
  }

  try {
    console.log("🔍 Fetching claimable positions...")
    const positions = await getClaimablePositions(wallet)

    if (positions.length === 0) {
      console.log("ℹ️ No claimable positions found")
      return result
    }

    // Filter for configured token
    const tokenPositions = positions.filter((p) => p.tokenMint === config.tokenMint)

    if (tokenPositions.length === 0) {
      console.log("ℹ️ No claimable positions for configured token")
      return result
    }

    console.log(`📦 Found ${tokenPositions.length} claimable position(s)`)

    // Get claim transactions
    const poolConfigKeys = tokenPositions.map((p) => p.poolConfigKey)
    console.log("📝 Generating claim transactions...")
    const claimTxs = await getClaimTransactions(wallet, poolConfigKeys)

    // Execute each claim transaction
    for (const claimTx of claimTxs) {
      try {
        console.log(`⏳ Signing and sending claim transaction...`)
        const signature = await signAndSendTransaction(claimTx.transaction)
        result.transactions.push(signature)
        console.log(`✅ Claim successful: ${signature}`)

        // Find the position to add claimed amount
        const position = tokenPositions.find((p) => p.poolConfigKey === claimTx.poolConfigKey)
        if (position) {
          result.totalClaimed += lamportsToSol(Number.parseFloat(position.claimableAmount))
          result.totalClaimedUsd += Number.parseFloat(position.claimableAmountUsd)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        result.errors.push(errorMsg)
        console.error(`❌ Claim failed: ${errorMsg}`)
      }
    }

    if (result.errors.length > 0) {
      result.success = result.transactions.length > 0
    }
  } catch (error) {
    result.success = false
    result.errors.push(error instanceof Error ? error.message : "Unknown error")
  }

  return result
}

/**
 * Check if fees meet the threshold for collection
 */
export async function shouldCollectFees(): Promise<{
  should: boolean
  claimable: number
  threshold: number
}> {
  const status = await getFeeStatus()
  const threshold = config.buybackThresholdSol

  return {
    should: status.totalClaimable >= threshold,
    claimable: status.totalClaimable,
    threshold,
  }
}
