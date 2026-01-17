#!/usr/bin/env node
import { validateConfig, config } from "../utils/config.js"
import { getBalance } from "../utils/solana.js"
import { collectFees, getFeeStatus, shouldCollectFees } from "../services/fee-collector.js"
import { executeBuyback, getBuybackQuote, shouldExecuteBuyback } from "../services/buyback.js"
import { getBuybackAdvice, getStrategyAdvice, type MarketContext } from "../services/claude-advisor.js"
import { verifyTwitterConnection, postTweet } from "../api/twitter.js"

interface BotState {
  lastFeeCollectionTime: Date | null
  lastBuybackTime: Date | null
  totalFeesCollected: number
  totalBuybacks: number
  recentBuybacks: Array<{
    amount: number
    timestamp: Date
    priceImpact: string
  }>
}

const state: BotState = {
  lastFeeCollectionTime: null,
  lastBuybackTime: null,
  totalFeesCollected: 0,
  totalBuybacks: 0,
  recentBuybacks: [],
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

async function runCycle(): Promise<void> {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`🔄 Bot Cycle - ${new Date().toISOString()}`)
  console.log("=".repeat(60))

  try {
    // Step 1: Check and collect fees
    console.log("\n📊 Step 1: Checking fees...")
    const feeCheck = await shouldCollectFees()

    if (feeCheck.should) {
      console.log(`💰 Collecting ${feeCheck.claimable.toFixed(4)} SOL in fees...`)
      const collectResult = await collectFees()

      if (collectResult.success) {
        state.lastFeeCollectionTime = new Date()
        state.totalFeesCollected += collectResult.totalClaimed
        console.log(`✅ Collected ${collectResult.totalClaimed.toFixed(4)} SOL`)
      }
    } else {
      console.log(`ℹ️ Claimable: ${feeCheck.claimable.toFixed(4)} SOL (threshold: ${feeCheck.threshold} SOL)`)
    }

    // Step 2: Check for buyback opportunity
    console.log("\n📊 Step 2: Checking buyback conditions...")
    const [feeStatus, walletBalance] = await Promise.all([getFeeStatus(), getBalance()])

    const availableSol = walletBalance - 0.01
    const buybackCheck = await shouldExecuteBuyback(availableSol, state.lastBuybackTime)

    if (!buybackCheck.should) {
      console.log(`ℹ️ ${buybackCheck.reason}`)
      return
    }

    // Step 3: Get AI advice
    console.log("\n🤖 Step 3: Consulting Claude AI...")

    let buybackQuote = null
    try {
      buybackQuote = await getBuybackQuote(buybackCheck.suggestedAmount)
    } catch (e) {
      console.log("⚠️ Could not get quote")
    }

    const context: MarketContext = {
      feeStatus,
      buybackQuote,
      walletBalance,
      lastBuybackTime: state.lastBuybackTime,
      recentBuybacks: state.recentBuybacks,
    }

    const advice = await getBuybackAdvice(context)

    console.log(`\nAI Decision: ${advice.shouldBuyback ? "✅ PROCEED" : "⏸️ WAIT"}`)
    console.log(`Confidence: ${advice.confidence}%`)
    console.log(`Reasoning: ${advice.reasoning}`)

    if (!advice.shouldBuyback) {
      console.log("🛑 AI recommends waiting")
      return
    }

    // Step 4: Execute buyback
    const buybackAmount = advice.suggestedAmount || buybackCheck.suggestedAmount
    console.log(`\n💸 Step 4: Executing buyback of ${buybackAmount.toFixed(4)} SOL...`)

    const result = await executeBuyback(buybackAmount)

    if (result.success) {
      state.lastBuybackTime = new Date()
      state.totalBuybacks++
      state.recentBuybacks.push({
        amount: result.inputAmount,
        timestamp: new Date(),
        priceImpact: result.priceImpact,
      })

      // Keep only last 10 buybacks
      if (state.recentBuybacks.length > 10) {
        state.recentBuybacks = state.recentBuybacks.slice(-10)
      }

      console.log(`✅ Buyback successful!`)
      console.log(`   Spent: ${result.inputAmount.toFixed(4)} SOL`)
      console.log(`   Received: ${result.outputAmount.toFixed(2)} tokens`)
      console.log(`   TX: https://solscan.io/tx/${result.transaction}`)

      // Optional: Post to Twitter
      if (config.twitter.apiKey) {
        try {
          const tweetContent = `🔄 Buyback executed!\n\n💰 ${result.inputAmount.toFixed(4)} SOL → ${result.outputAmount.toFixed(0)} tokens\n📊 Impact: ${result.priceImpact}%\n\n#Buyback #Bags`
          await postTweet(tweetContent)
          console.log("📢 Posted to Twitter")
        } catch (e) {
          console.log("⚠️ Could not post to Twitter")
        }
      }
    } else {
      console.log(`❌ Buyback failed: ${result.error}`)
    }
  } catch (error) {
    console.error("❌ Cycle error:", error instanceof Error ? error.message : error)
  }
}

async function main() {
  console.log("🤖 Bags.fm Fee Collector & Buyback Bot")
  console.log("=====================================\n")

  try {
    validateConfig()
    console.log("✅ Configuration validated")

    // Verify Twitter if configured
    if (config.twitter.apiKey) {
      console.log("🐦 Verifying Twitter connection...")
      await verifyTwitterConnection()
    }

    console.log(`\n📋 Configuration:`)
    console.log(`   Token: ${config.tokenMint}`)
    console.log(`   Buyback Threshold: ${config.buybackThresholdSol} SOL`)
    console.log(`   Buyback Percentage: ${config.buybackPercentage}%`)
    console.log(`   Min Interval: ${config.minBuybackIntervalHours} hours`)
    console.log(`   Check Interval: ${CHECK_INTERVAL_MS / 1000 / 60} minutes`)

    // Get initial strategy advice
    console.log("\n🤖 Getting initial strategy analysis from Claude...\n")
    const feeStatus = await getFeeStatus()
    const walletBalance = await getBalance()

    const strategyAdvice = await getStrategyAdvice({
      feeStatus,
      buybackQuote: null,
      walletBalance,
      lastBuybackTime: null,
      recentBuybacks: [],
    })

    console.log("📈 Strategy Analysis:")
    console.log(strategyAdvice)

    // Start the bot loop
    console.log("\n🚀 Starting bot...")

    // Run immediately
    await runCycle()

    // Then run on interval
    setInterval(runCycle, CHECK_INTERVAL_MS)

    console.log(`\n⏰ Bot running. Next check in ${CHECK_INTERVAL_MS / 1000 / 60} minutes...`)
    console.log("Press Ctrl+C to stop.\n")
  } catch (error) {
    console.error("Fatal error:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
