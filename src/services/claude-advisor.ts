import Anthropic from "@anthropic-ai/sdk"
import { config } from "../utils/config.js"
import type { FeeStatus } from "./fee-collector.js"
import type { BuybackQuote } from "./buyback.js"

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
})

export interface BuybackAdvice {
  shouldBuyback: boolean
  confidence: number
  suggestedAmount: number
  reasoning: string
  warnings: string[]
}

export interface MarketContext {
  feeStatus: FeeStatus
  buybackQuote: BuybackQuote | null
  walletBalance: number
  lastBuybackTime: Date | null
  recentBuybacks: Array<{
    amount: number
    timestamp: Date
    priceImpact: string
  }>
}

/**
 * Get Claude AI advice on whether to execute a buyback
 */
export async function getBuybackAdvice(context: MarketContext): Promise<BuybackAdvice> {
  const prompt = `You are a crypto trading advisor for a token buyback bot. Analyze the following data and provide advice on whether to execute a buyback.

## Current Status
- Token Mint: ${context.feeStatus.tokenMint}
- Lifetime Fees Collected: ${context.feeStatus.lifetimeFeesCollected} SOL ($${context.feeStatus.lifetimeFeesCollectedUsd.toFixed(2)})
- Currently Claimable: ${context.feeStatus.totalClaimable.toFixed(4)} SOL ($${context.feeStatus.totalClaimableUsd.toFixed(2)})
- Wallet Balance: ${context.walletBalance.toFixed(4)} SOL
- Last Buyback: ${context.lastBuybackTime ? context.lastBuybackTime.toISOString() : "Never"}
- Configured Threshold: ${config.buybackThresholdSol} SOL
- Configured Buyback Percentage: ${config.buybackPercentage}%

## Fee Sharers
${context.feeStatus.feeSharers.map((s) => `- ${s.username}: ${s.royaltyBps / 100}% (claimed: ${s.totalClaimed})`).join("\n")}

## Buyback Quote (if available)
${
  context.buybackQuote
    ? `
- Input: ${context.buybackQuote.inputAmountSol} SOL
- Output: ${context.buybackQuote.outputAmountTokens} tokens
- Price Impact: ${context.buybackQuote.priceImpact}%
- Effective Price: ${context.buybackQuote.effectivePrice.toFixed(8)} SOL/token
`
    : "No quote available"
}

## Recent Buybacks
${
  context.recentBuybacks.length > 0
    ? context.recentBuybacks
        .map((b) => `- ${b.amount} SOL at ${b.timestamp.toISOString()} (${b.priceImpact}% impact)`)
        .join("\n")
    : "No recent buybacks"
}

Based on this data, provide a JSON response with:
1. shouldBuyback: boolean - whether to execute the buyback now
2. confidence: number 0-100 - how confident you are in this decision
3. suggestedAmount: number - suggested SOL amount for buyback (0 if not recommending)
4. reasoning: string - brief explanation of your decision
5. warnings: string[] - any concerns or risks to be aware of

Consider:
- Fee accumulation rate
- Price impact of the buyback
- Wallet balance and sustainability
- Timing relative to last buyback
- Market conditions implied by fee generation

Respond ONLY with valid JSON, no markdown or explanation.`

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== "text") {
      throw new Error("Unexpected response type")
    }

    const advice = JSON.parse(content.text) as BuybackAdvice
    return advice
  } catch (error) {
    console.error("Error getting Claude advice:", error)

    // Return conservative default
    return {
      shouldBuyback: false,
      confidence: 0,
      suggestedAmount: 0,
      reasoning: "Unable to get AI advice, defaulting to no action",
      warnings: ["AI advisor unavailable"],
    }
  }
}

/**
 * Get Claude AI analysis of fee collection strategy
 */
export async function getStrategyAdvice(context: MarketContext): Promise<string> {
  const prompt = `Analyze this token's fee collection and buyback strategy:

- Lifetime Fees: ${context.feeStatus.lifetimeFeesCollected} SOL
- Current Claimable: ${context.feeStatus.totalClaimable} SOL
- Buyback Threshold: ${config.buybackThresholdSol} SOL
- Buyback Percentage: ${config.buybackPercentage}%
- Min Interval: ${config.minBuybackIntervalHours} hours

Recent buybacks: ${context.recentBuybacks.length}
Fee sharers: ${context.feeStatus.feeSharers.length}

Provide a brief (2-3 paragraphs) strategy analysis and recommendations for optimizing the buyback approach. Consider fee accumulation rate, timing, and market impact.`

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== "text") {
      throw new Error("Unexpected response type")
    }

    return content.text
  } catch (error) {
    console.error("Error getting strategy advice:", error)
    return "Unable to generate strategy analysis at this time."
  }
}
