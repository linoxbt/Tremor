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

  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://tremor:tremor@localhost:5436/tremor",
  ),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6380",

  facilitatorUrl:
    process.env.GOPLAUSIBLE_FACILITATOR_URL ||
    "https://facilitator.goplausible.xyz",
  payTo:
    process.env.PAYTO_ADDRESS ||
    "0x0000000000000000000000000000000000000000",
  internalApiKey: process.env.INTERNAL_API_KEY || "dev-internal-key-change-me",

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
  factory:
    process.env.QIE_FACTORY ||
    (isMainnet
      ? "0x8E23128a5511223bE6c0d64106e2D4508C08398C"
      : "0x2ed06abbbf2504bf37da1b178d9c05a2a971ae7c"),
  router:
    process.env.QIE_ROUTER ||
    (isMainnet
      ? "0x08cd2e72e156D8563B4351eb4065C262A9f553Ef"
      : "0x3Fb7f50B6D1472b65996E03edf00cAF105254Ad3"),
  wqie:
    process.env.QIE_WQIE ||
    (isMainnet
      ? "0x0087904D95BEe9E5F24dc8852804b547981A9139"
      : "0x37ce3e8d590c0d37c088bbbb14641463601d6056"),
  dexSwapUrl:
    process.env.QIE_DEX_URL || "https://www.swap.dex.qie.digital/swap",

  // Live mainnet by default when subgraph is available
  useMockData: (process.env.USE_MOCK_DATA || "false").toLowerCase() === "true",

  challengeTag: process.env.CHALLENGE_TAG || "tremor-qie",

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
