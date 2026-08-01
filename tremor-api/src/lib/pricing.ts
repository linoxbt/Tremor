/**
 * Endpoint price tiers (USDC). Used by x402 route config and payments_log.
 * Micro  ~$0.001–0.005 | Low ~$0.01 | Medium ~$0.02–0.05 | Premium ~$0.05–0.10
 */
export const PRICE_TIERS = {
  micro: {
    price: "$0.002",
    amountUsd: 0.002,
  },
  low: {
    price: "$0.01",
    amountUsd: 0.01,
  },
  medium: {
    price: "$0.03",
    amountUsd: 0.03,
  },
  premium: {
    price: "$0.08",
    amountUsd: 0.08,
  },
} as const;

export type PriceTier = keyof typeof PRICE_TIERS;

/** Map of method+path pattern → tier for payments logging / docs */
export const ENDPOINT_PRICES: Record<string, { tier: PriceTier; description: string }> = {
  "GET /v1/token/:chain/:address/price": {
    tier: "micro",
    description:
      "Real-time Algorand ASA price in USD with liquidity and 24h volume from DEX pools",
  },
  "GET /v1/pair/:chain/:pairAddress": {
    tier: "micro",
    description:
      "Algorand DEX pair snapshot: price, liquidity USD, 24h volume, FDV estimate",
  },
  "GET /v1/token/:chain/:address/pools": {
    tier: "micro",
    description: "List of Algorand DEX pools (Tinyman/Pact) for a given ASA",
  },
  "GET /v1/trending/:chain": {
    tier: "low",
    description: "Top Algorand movers by 24h volume and price change",
  },
  "GET /v1/new-pairs/:chain": {
    tier: "low",
    description: "Recently discovered Algorand DEX pairs",
  },
  "GET /v1/search": {
    tier: "micro",
    description: "Search Algorand tokens and pairs by symbol, name, or address",
  },
  "GET /v1/pair/:chain/:pairAddress/ohlcv": {
    tier: "medium",
    description: "OHLCV candles for an Algorand pool (1m/5m/1h/1d timeframes)",
  },
  "GET /v1/token/:chain/:address/holders": {
    tier: "medium",
    description:
      "ASA holder distribution and concentration metrics (top wallets % of supply)",
  },
  "GET /v1/pair/:chain/:pairAddress/liquidity-history": {
    tier: "medium",
    description: "Historical liquidity USD series for an Algorand DEX pair",
  },
  "GET /v1/token/:chain/:address/volume-profile": {
    tier: "medium",
    description: "Buy/sell volume pressure breakdown for an Algorand ASA",
  },
  "GET /v1/token/:chain/:address/rug-score": {
    tier: "premium",
    description:
      "Composite rug-risk score (0-100) for an Algorand ASA: LP lock, mint authority, ownership, concentration, liquidity depth",
  },
  "GET /v1/token/:chain/:address/whale-activity": {
    tier: "premium",
    description: "Large wallet transfer activity for an Algorand ASA over the last N hours",
  },
  "POST /v1/watch": {
    tier: "premium",
    description:
      "Register a recurring watch that orchestrates price/risk endpoint refresh for a target ASA or pair",
  },
};
