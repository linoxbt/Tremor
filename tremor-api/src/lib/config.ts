import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

// Default: Qie Mainnet for production-facing UI
const network = (process.env.NETWORK || "mainnet").toLowerCase();
const isMainnet = network !== "testnet";

export const config = {
  port: parseInt(process.env.PORT || "4021", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  network: isMainnet ? ("mainnet" as const) : ("testnet" as const),
  isMainnet,

  // No fallback: a deploy that forgets DATABASE_URL should fail fast at startup,
  // not silently try to connect to a hardcoded local dev Postgres.
  databaseUrl: required("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6380",

  // No public x402 facilitator supports Qie (eip155:1990/1983) today — GoPlausible is
  // Algorand/Base/Solana only. Operators must self-host a facilitator (e.g. the
  // @x402/evm facilitator primitives pointed at QIE_RPC_URL) and set this explicitly.
  facilitatorUrl: process.env.X402_FACILITATOR_URL || "",
  payTo:
    process.env.PAYTO_ADDRESS ||
    "0x0000000000000000000000000000000000000000",
  // No fallback: a guessable default here would mean the entire /internal/*
  // surface (revenue, payer addresses, risk data) silently opens to the public
  // the moment an operator forgets to set this.
  internalApiKey: required("INTERNAL_API_KEY"),

  // Qie Mainnet (1990) / Testnet (1983)
  chainId: isMainnet ? 1990 : 1983,
  rpcUrl:
    process.env.QIE_RPC_URL ||
    (isMainnet
      ? "https://rpc1mainnet.qie.digital"
      : "https://rpc1testnet.qie.digital"),
  explorerUrl:
    process.env.QIE_EXPLORER_URL ||
    (isMainnet ? "https://mainnet.qie.digital" : "https://testnet.qie.digital"),
  subgraphUrl:
    process.env.QIE_SUBGRAPH_URL ||
    (isMainnet
      ? "https://graphql.qie.digital/subgraphs/name/qie-dex/dex"
      : process.env.QIE_TESTNET_SUBGRAPH || ""),
  wqie:
    process.env.QIE_WQIE ||
    (isMainnet
      ? "0x0087904D95BEe9E5F24dc8852804b547981A9139"
      : "0x37ce3e8d590c0d37c088bbbb14641463601d6056"),

  // x402 CAIP-2 network id for the "exact" EVM scheme (eip155:<chainId>)
  x402Network: `eip155:${isMainnet ? 1990 : 1983}`,

  // ERC-20 settlement asset for x402 payments. There is no confirmed canonical
  // USDC deployment on Qie yet, so this must be supplied by the operator —
  // no address is guessed/defaulted here.
  paymentAsset: process.env.QIE_PAYMENT_ASSET_ADDRESS || "",
  paymentAssetSymbol: process.env.QIE_PAYMENT_ASSET_SYMBOL || "USDC",
  paymentAssetDecimals: parseInt(process.env.QIE_PAYMENT_ASSET_DECIMALS || "6", 10),

  // Live mainnet by default when subgraph is available
  useMockData: (process.env.USE_MOCK_DATA || "false").toLowerCase() === "true",

  x402Tag: process.env.X402_TAG || "tremor-qie",

  cacheTtlSeconds: {
    price: 20,
    pair: 20,
    trending: 15,
    holders: 120,
    ohlcv: 60,
    rug: 300,
    poolsList: 12,
    tokensList: 20,
    stats: 15,
  },
} as const;

export type AppConfig = typeof config;
