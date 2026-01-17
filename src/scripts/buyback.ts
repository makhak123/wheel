#!/usr/bin/env node
import { validateConfig, config } from "../utils/config.js"
import { getBalance } from "../utils/solana.js"
import { executeBuyback, getBuybackQuote, shouldExecuteBuyback } from "../services/buyback.js"
import { getFeeStatus } from "../services/fee-collector.js"
import { getBuybackAdvice, type MarketContext } from "../services/claude-advisor.js"

async function main() {
  console.log("🚀 Bags.fm Buyback Executor\n")

  try {
    validateConfig()

    // Get current status
    console.log("📊 Gathering market data...\n")

    const [feeStatus, walletBalance] = await Promise.all([getFeeStatus(), getBalance()])

    console.log(`Token: ${config.tokenMint}`)
    console.log(`Wallet Balance: ${walletBalance.toFixed(4)} SOL`)
    console.log(`Claimable Fees: ${feeStatus.totalClaimable.toFixed(4)} SOL\n`)

    // Check if should execute
    const availableSol = walletBalance - 0.01 // Reserve for fees
    const shouldBuybackResult = await shouldExecuteBuyback(availableSol, null)

    if (!shouldBuybackResult.should) {
      console.log(`ℹ️ ${shouldBuybackResult.reason}`)
      return
    }

    // Get quote
    const suggestedAmount = shouldBuybackResult.suggestedAmount
    console.log(`💰 Getting quote for ${suggestedAmount.toFixed(4)} SOL buyback...\n`)

    const quote = await getBuybackQuote(suggestedAmount)
    console.log(`Quote:`)
    console.log(`  Input: ${quote.inputAmountSol.toFixed(4)} SOL`)
    console.log(`  Output: ${quote.outputAmountTokens.toFixed(2)} tokens`)
    console.log(`  Price Impact: ${quote.priceImpact}%`)
    console.log(`  Effective Price: ${quote.effectivePrice.toFixed(8)} SOL/token\n`)

    // Get AI advice
    console.log("🤖 Getting Claude AI advice...\n")

    const context: MarketContext = {
      feeStatus,
      buybackQuote: quote,
      walletBalance,
      lastBuybackTime: null,
      recentBuybacks: [],
    }

    const advice = await getBuybackAdvice(context)

    console.log(`AI Recommendation: ${advice.shouldBuyback ? "✅ BUY" : "⏸️ WAIT"}`)
    console.log(`Confidence: ${advice.confidence}%`)
    console.log(`Suggested Amount: ${advice.suggestedAmount.toFixed(4)} SOL`)
    console.log(`Reasoning: ${advice.reasoning}`)

    if (advice.warnings.length > 0) {
      console.log(`\n⚠️ Warnings:`)
      advice.warnings.forEach((w) => console.log(`  - ${w}`))
    }

    if (!advice.shouldBuyback) {
      console.log("\n🛑 AI recommends waiting. Skipping buyback.")
      return
    }

    // Execute buyback
    const buybackAmount = advice.suggestedAmount || suggestedAmount
    console.log(`\n🔄 Executing buyback of ${buybackAmount.toFixed(4)} SOL...\n`)

    const result = await executeBuyback(buybackAmount)

    if (result.success) {
      console.log(`\n✅ Buyback successful!`)
      console.log(`Spent: ${result.inputAmount.toFixed(4)} SOL`)
      console.log(`Received: ${result.outputAmount.toFixed(2)} tokens`)
      console.log(`Price Impact: ${result.priceImpact}%`)
      console.log(`Transaction: https://solscan.io/tx/${result.transaction}`)
    } else {
      console.log(`\n❌ Buyback failed: ${result.error}`)
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
