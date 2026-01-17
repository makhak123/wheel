import dotenv from "dotenv"

dotenv.config()

export const config = {
  // Bags.fm
  bagsApiKey: process.env.BAGS_API_KEY || "",
  bagsApiUrl: "https://public-api-v2.bags.fm/api/v1",
  tokenMint: process.env.TOKEN_MINT || "",

  // Solana
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY || "",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",

  // Claude AI
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",

  // Twitter/X
  twitter: {
    apiKey: process.env.TWITTER_API_KEY || "",
    apiSecret: process.env.TWITTER_API_SECRET || "",
    accessToken: process.env.TWITTER_ACCESS_TOKEN || "",
    accessSecret: process.env.TWITTER_ACCESS_SECRET || "",
  },

  // Buyback Strategy
  buybackThresholdSol: Number.parseFloat(process.env.BUYBACK_THRESHOLD_SOL || "0.1"),
  buybackPercentage: Number.parseInt(process.env.BUYBACK_PERCENTAGE || "50"),
  minBuybackIntervalHours: Number.parseInt(process.env.MIN_BUYBACK_INTERVAL_HOURS || "24"),
}

export function validateConfig(): void {
  const required = ["bagsApiKey", "tokenMint", "walletPrivateKey", "anthropicApiKey"]

  for (const key of required) {
    if (!config[key as keyof typeof config]) {
      throw new Error(`Missing required config: ${key}`)
    }
  }
}
