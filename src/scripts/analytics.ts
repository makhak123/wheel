#!/usr/bin/env node
import { validateConfig, config } from "../utils/config.js"
import { getBalance, getPublicKey } from "../utils/solana.js"
import { getFeeStatus } from "../services/fee-collector.js"
import { getStrategyAdvice, type MarketContext } from "../services/claude-advisor.js"

async function main() {
  console.log("📊 Bags.fm Analytics Dashboard\n")

  try {
    validateConfig()

    const [feeStatus, walletBalance] = await Promise.all([getFeeStatus(), getBalance()])

    const wallet = getPublicKey()

    console.log("=".repeat(50))
    console.log("                    TOKEN OVERVIEW")
    console.log("=".repeat(50))
    console.log(`Token Mint:     ${feeStatus.tokenMint}`)
    console.log(`Your Wallet:    ${wallet}`)
    console.log("")

    console.log("=".repeat(50))
    console.log("                    FEE STATISTICS")
    console.log("=".repeat(50))
    console.log(`Lifetime Fees:  ${feeStatus.lifetimeFeesCollected.toFixed(4)} SOL`)
    console.log(`                $${feeStatus.lifetimeFeesCollectedUsd.toFixed(2)} USD`)
    console.log("")
    console.log(`Claimable Now:  ${feeStatus.totalClaimable.toFixed(4)} SOL`)
    console.log(`                $${feeStatus.totalClaimableUsd.toFixed(2)} USD`)
    console.log(`Positions:      ${feeStatus.claimablePositions.length}`)
    console.log("")

    console.log("=".repeat(50))
    console.log("                    WALLET STATUS")
    console.log("=".repeat(50))
    console.log(`SOL Balance:    ${walletBalance.toFixed(4)} SOL`)
    console.log(`Available:      ${(walletBalance - 0.01).toFixed(4)} SOL (after fees)`)
    console.log("")

    if (feeStatus.feeSharers.length > 0) {
      console.log("=".repeat(50))
      console.log("                    FEE SHARERS")
      console.log("=".repeat(50))
      feeStatus.feeSharers.forEach((sharer) => {
        console.log(`@${sharer.username}`)
        console.log(`  Share:   ${sharer.royaltyBps / 100}%`)
        console.log(`  Claimed: ${sharer.totalClaimed}`)
      })
      console.log("")
    }

    console.log("=".repeat(50))
    console.log("                BUYBACK CONFIGURATION")
    console.log("=".repeat(50))
    console.log(`Threshold:      ${config.buybackThresholdSol} SOL`)
    console.log(`Percentage:     ${config.buybackPercentage}%`)
    console.log(`Min Interval:   ${config.minBuybackIntervalHours} hours`)
    console.log("")

    // Get AI analysis
    console.log("=".repeat(50))
    console.log("              🤖 AI STRATEGY ANALYSIS")
    console.log("=".repeat(50))

    const context: MarketContext = {
      feeStatus,
      buybackQuote: null,
      walletBalance,
      lastBuybackTime: null,
      recentBuybacks: [],
    }

    const analysis = await getStrategyAdvice(context)
    console.log(analysis)
    console.log("")
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
