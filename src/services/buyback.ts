import { getTradeQuote, createSwapTransaction } from "../api/bags.js"
import { getPublicKey, signAndSendTransaction, getBalance, solToLamports } from "../utils/solana.js"
import { config } from "../utils/config.js"

// SOL mint address (native SOL wrapped)
const SOL_MINT = "So11111111111111111111111111111111111111112"

export interface BuybackResult {
  success: boolean
  inputAmount: number
  outputAmount: number
  priceImpact: string
  transaction: string | null
  error: string | null
}

export interface BuybackQuote {
  inputAmountSol: number
  outputAmountTokens: number
  priceImpact: string
  effectivePrice: number
}

/**
 * Get a quote for a buyback
 */
export async function getBuybackQuote(amountSol: number): Promise<BuybackQuote> {
  const amountLamports = solToLamports(amountSol).toString()

  const quote = await getTradeQuote(
    SOL_MINT,
    config.tokenMint,
    amountLamports,
    100, // 1% slippage
  )

  const outputTokens = Number.parseFloat(quote.outputAmount)
  const effectivePrice = amountSol / outputTokens

  return {
    inputAmountSol: amountSol,
    outputAmountTokens: outputTokens,
    priceImpact: quote.priceImpact,
    effectivePrice,
  }
}

/**
 * Execute a buyback
 */
export async function executeBuyback(amountSol: number): Promise<BuybackResult> {
  const wallet = getPublicKey()
  const result: BuybackResult = {
    success: false,
    inputAmount: amountSol,
    outputAmount: 0,
    priceImpact: "0",
    transaction: null,
    error: null,
  }

  try {
    // Check balance
    const balance = await getBalance()
    if (balance < amountSol + 0.01) {
      // Keep some SOL for fees
      throw new Error(`Insufficient balance. Have: ${balance.toFixed(4)} SOL, Need: ${amountSol + 0.01} SOL`)
    }

    console.log(`💰 Getting buyback quote for ${amountSol} SOL...`)
    const quote = await getBuybackQuote(amountSol)
    result.outputAmount = quote.outputAmountTokens
    result.priceImpact = quote.priceImpact

    console.log(`📊 Quote: ${amountSol} SOL → ${quote.outputAmountTokens} tokens (${quote.priceImpact}% impact)`)

    // Create swap transaction
    console.log("📝 Creating swap transaction...")
    const serializedTx = await createSwapTransaction(
      wallet,
      SOL_MINT,
      config.tokenMint,
      solToLamports(amountSol).toString(),
      100,
    )

    // Sign and send
    console.log("⏳ Signing and sending transaction...")
    const signature = await signAndSendTransaction(serializedTx)
    result.transaction = signature
    result.success = true

    console.log(`✅ Buyback successful! TX: ${signature}`)
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Unknown error"
    console.error(`❌ Buyback failed: ${result.error}`)
  }

  return result
}

/**
 * Calculate optimal buyback amount based on collected fees
 */
export function calculateBuybackAmount(collectedSol: number): number {
  const percentage = config.buybackPercentage / 100
  return collectedSol * percentage
}

/**
 * Check if buyback conditions are met
 */
export async function shouldExecuteBuyback(
  availableSol: number,
  lastBuybackTime: Date | null,
): Promise<{
  should: boolean
  reason: string
  suggestedAmount: number
}> {
  const threshold = config.buybackThresholdSol
  const minInterval = config.minBuybackIntervalHours * 60 * 60 * 1000 // Convert to ms

  // Check amount threshold
  if (availableSol < threshold) {
    return {
      should: false,
      reason: `Insufficient funds. Have: ${availableSol.toFixed(4)} SOL, Need: ${threshold} SOL`,
      suggestedAmount: 0,
    }
  }

  // Check time interval
  if (lastBuybackTime) {
    const timeSinceLastBuyback = Date.now() - lastBuybackTime.getTime()
    if (timeSinceLastBuyback < minInterval) {
      const hoursRemaining = (minInterval - timeSinceLastBuyback) / (60 * 60 * 1000)
      return {
        should: false,
        reason: `Too soon since last buyback. Wait ${hoursRemaining.toFixed(1)} more hours`,
        suggestedAmount: 0,
      }
    }
  }

  const suggestedAmount = calculateBuybackAmount(availableSol)

  return {
    should: true,
    reason: "All conditions met for buyback",
    suggestedAmount,
  }
}
