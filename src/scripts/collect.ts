#!/usr/bin/env node
import { validateConfig } from "../utils/config.js"
import { collectFees, getFeeStatus, shouldCollectFees } from "../services/fee-collector.js"

async function main() {
  console.log("🚀 Bags.fm Fee Collector\n")

  try {
    validateConfig()

    // Check current status
    console.log("📊 Checking fee status...\n")
    const status = await getFeeStatus()

    console.log(`Token: ${status.tokenMint}`)
    console.log(
      `Lifetime Fees: ${status.lifetimeFeesCollected.toFixed(4)} SOL ($${status.lifetimeFeesCollectedUsd.toFixed(2)})`,
    )
    console.log(`Claimable Now: ${status.totalClaimable.toFixed(4)} SOL ($${status.totalClaimableUsd.toFixed(2)})`)
    console.log(`Positions: ${status.claimablePositions.length}\n`)

    if (status.feeSharers.length > 0) {
      console.log("Fee Sharers:")
      status.feeSharers.forEach((s) => {
        console.log(`  - ${s.username}: ${s.royaltyBps / 100}%`)
      })
      console.log("")
    }

    // Check if should collect
    const shouldCollect = await shouldCollectFees()
    if (!shouldCollect.should) {
      console.log(
        `ℹ️ Claimable amount (${shouldCollect.claimable.toFixed(4)} SOL) below threshold (${shouldCollect.threshold} SOL)`,
      )
      console.log("Skipping collection.\n")
      return
    }

    // Collect fees
    console.log("💸 Collecting fees...\n")
    const result = await collectFees()

    if (result.success) {
      console.log(`\n✅ Collection complete!`)
      console.log(`Total Claimed: ${result.totalClaimed.toFixed(4)} SOL ($${result.totalClaimedUsd.toFixed(2)})`)
      console.log(`Transactions: ${result.transactions.length}`)

      if (result.transactions.length > 0) {
        console.log("\nTransaction signatures:")
        result.transactions.forEach((tx) => {
          console.log(`  - https://solscan.io/tx/${tx}`)
        })
      }
    } else {
      console.log("❌ Collection failed")
      result.errors.forEach((err) => console.error(`  - ${err}`))
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
