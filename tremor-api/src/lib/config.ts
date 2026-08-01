import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

const network = (process.env.NETWORK || "testnet").toLowerCase();
const isMainnet = network === "mainnet";

export const config = {
  port: parseInt(process.env.PORT || "4021", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  network: isMainnet ? ("mainnet" as const) : ("testnet" as const),
  isMainnet,

  databaseUrl: required("DATABASE_URL", "postgresql://tremor:tremor@localhost:5432/tremor"),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  facilitatorUrl:
    process.env.GOPLAUSIBLE_FACILITATOR_URL || "https://facilitator.goplausible.xyz",
  payTo: process.env.PAYTO_ADDRESS || "PLACEHOLDER_ALGORAND_ADDRESS_SET_ME_IN_ENV_000000000",
  internalApiKey: process.env.INTERNAL_API_KEY || "dev-internal-key-change-me",

  algodUrl:
    process.env.ALGOD_URL ||
    (isMainnet
      ? "https://mainnet-api.algonode.cloud"
      : "https://testnet-api.algonode.cloud"),
  indexerUrl:
    process.env.INDEXER_URL ||
    (isMainnet
      ? "https://mainnet-idx.algonode.cloud"
      : "https://testnet-idx.algonode.cloud"),
  tinymanApiUrl:
    process.env.TINYMAN_API_URL || "https://mainnet.analytics.tinyman.org",

  useMockData: (process.env.USE_MOCK_DATA || "true").toLowerCase() === "true",

  /** Competition tag required by Algorand Global x402 Challenge */
  challengeTag: "x402-global-challenge",

  cacheTtlSeconds: {
    price: 20,
    pair: 20,
    trending: 15,
    holders: 120,
    ohlcv: 60,
    rug: 300,
    /** Aggregated list endpoints used by the dashboard */
    poolsList: 12,
    tokensList: 20,
    stats: 15,
  },
} as const;

export type AppConfig = typeof config;
