# Bags.fm Fee Collector & Buyback Bot

An automated system for collecting fees from [bags.fm](https://bags.fm/launch) tokens and executing buybacks using Claude AI for intelligent decision making.

## Features

- 🔄 **Automatic Fee Collection** - Claim accumulated trading fees from your bags.fm tokens
- 🐦 **Twitter/X Integration** - Set up fee sharing with Twitter handles
- 💰 **Intelligent Buybacks** - AI-powered buyback decisions using Claude
- 📊 **Analytics Dashboard** - Track fees, claims, and buyback history
- ⚙️ **Configurable Strategy** - Customize buyback thresholds and timing

## Prerequisites

- Node.js 18+
- Solana CLI (for wallet management)
- Bags.fm API key (get from [dev.bags.fm](https://dev.bags.fm))
- Anthropic API key (for Claude AI)
- Twitter/X developer credentials (for fee sharing)

## Environment Variables

Create a `.env` file:

```env
# Bags.fm Configuration
BAGS_API_KEY=your_bags_api_key
TOKEN_MINT=your_token_mint_address

# Solana Wallet
WALLET_PRIVATE_KEY=your_wallet_private_key_base58
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Claude AI
ANTHROPIC_API_KEY=your_anthropic_api_key

# Twitter/X (for fee sharing claims)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret

# Buyback Configuration
BUYBACK_THRESHOLD_SOL=0.1
BUYBACK_PERCENTAGE=50
MIN_BUYBACK_INTERVAL_HOURS=24
```

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bags-fee-buyback-bot.git
cd bags-fee-buyback-bot

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Collect Fees
```bash
npm run collect-fees
```

### Execute Buyback
```bash
npm run buyback
```

### Run Automated Bot
```bash
npm run bot
```

### Check Analytics
```bash
npm run analytics
```

## Project Structure

```
├── src/
│   ├── api/
│   │   ├── bags.ts          # Bags.fm API client
│   │   └── twitter.ts       # Twitter/X API client
│   ├── services/
│   │   ├── fee-collector.ts # Fee collection logic
│   │   ├── buyback.ts       # Buyback execution
│   │   └── claude-advisor.ts # AI decision making
│   ├── utils/
│   │   ├── solana.ts        # Solana helpers
│   │   └── config.ts        # Configuration
│   ├── scripts/
│   │   ├── collect.ts       # CLI for fee collection
│   │   ├── buyback.ts       # CLI for buybacks
│   │   └── bot.ts           # Automated bot
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## How It Works

### 1. Fee Collection
The bot monitors your bags.fm token for accumulated fees (1% of all trading volume). When claimable fees exceed your threshold, it automatically generates and submits claim transactions.

### 2. Twitter/X Fee Sharing
During token launch, you can share fees with Twitter handles. The bot helps manage and claim these shared fees.

### 3. AI-Powered Buybacks
Claude AI analyzes:
- Current fee accumulation rate
- Token price and volume trends
- Market conditions
- Historical buyback performance

Then recommends optimal buyback timing and amounts.

### 4. Automatic Execution
The bot can run continuously, collecting fees and executing buybacks based on your configured strategy and AI recommendations.

## API Reference

### Bags.fm Endpoints Used

| Endpoint | Description |
|----------|-------------|
| `GET /fee-claiming/positions` | Get claimable fee positions |
| `POST /fee-claiming/transactions` | Generate claim transactions |
| `GET /analytics/lifetime-fees` | Get total lifetime fees |
| `GET /trade/quote` | Get swap quotes for buybacks |
| `POST /trade/swap` | Execute buyback swaps |

## Security Notes

- Never commit your `.env` file
- Use a dedicated wallet for the bot
- Start with small amounts to test
- Monitor the bot regularly

## License

MIT
