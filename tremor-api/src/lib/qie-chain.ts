/**
 * Qie Mainnet/Testnet client — Blockscout + DEX subgraph + JSON-RPC.
 */
import { config } from "./config.js";

export interface QiePairRemote {
  id: string;
  token0: { id: string; symbol: string; name: string; decimals: string };
  token1: { id: string; symbol: string; name: string; decimals: string };
  reserve0: string;
  reserve1: string;
  reserveUSD: string;
  volumeUSD: string;
  txCount: string;
  createdAtTimestamp: string;
  token0Price: string;
  token1Price: string;
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T | null> {
  try {
    const res = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T; error?: { message: string } };
    if (json.error) return null;
    return json.result ?? null;
  } catch {
    return null;
  }
}

async function subgraphQuery<T>(query: string): Promise<T | null> {
  if (!config.subgraphUrl) return null;
  try {
    const res = await fetch(config.subgraphUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T; errors?: unknown };
    if (json.errors) {
      console.warn("[subgraph]", json.errors);
      return null;
    }
    return json.data ?? null;
  } catch (e) {
    console.warn("[subgraph]", (e as Error).message);
    return null;
  }
}

async function explorerGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${config.explorerUrl.replace(/\/$/, "")}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function healthCheckChain(): Promise<{
  rpc: boolean;
  explorer: boolean;
  subgraph: boolean;
}> {
  const [block, stats, factory] = await Promise.all([
    rpcCall<string>("eth_blockNumber", []),
    explorerGet<{ total_transactions?: string }>("/api/v2/stats"),
    config.subgraphUrl
      ? subgraphQuery<{ dexFactory: { pairCount: number } | null }>(
          `{ dexFactory(id: "1") { pairCount } }`,
        )
      : Promise.resolve(null),
  ]);
  return {
    rpc: Boolean(block),
    explorer: Boolean(stats),
    subgraph: Boolean(factory?.dexFactory),
  };
}

export async function fetchSubgraphPairs(first = 100): Promise<QiePairRemote[]> {
  const data = await subgraphQuery<{ pairs: QiePairRemote[] }>(`{
    pairs(first: ${first}, orderBy: volumeUSD, orderDirection: desc) {
      id
      token0 { id symbol name decimals }
      token1 { id symbol name decimals }
      reserve0 reserve1 reserveUSD volumeUSD txCount createdAtTimestamp
      token0Price token1Price
    }
  }`);
  return data?.pairs ?? [];
}

/**
 * Same shape as fetchSubgraphPairs but ordered by creation time, not volume.
 * "New pairs" discovery needs this — the volume-ordered top-100 can never
 * surface a genuinely new, still-illiquid pair (arguably the case a
 * rug-scanning product most needs to catch early).
 */
export async function fetchSubgraphPairsByCreation(first = 100): Promise<QiePairRemote[]> {
  const data = await subgraphQuery<{ pairs: QiePairRemote[] }>(`{
    pairs(first: ${first}, orderBy: createdAtTimestamp, orderDirection: desc) {
      id
      token0 { id symbol name decimals }
      token1 { id symbol name decimals }
      reserve0 reserve1 reserveUSD volumeUSD txCount createdAtTimestamp
      token0Price token1Price
    }
  }`);
  return data?.pairs ?? [];
}

export async function getCoinPriceUsd(): Promise<number> {
  const stats = await explorerGet<{ coin_price?: string }>("/api/v2/stats");
  const p = Number(stats?.coin_price);
  return Number.isFinite(p) && p > 0 ? p : 0.1;
}

export function deriveUsdPrice(
  pair: QiePairRemote,
  wqie: string,
  qieUsd: number,
): number {
  const w = wqie.toLowerCase();
  const t0 = pair.token0.id.toLowerCase();
  const t1 = pair.token1.id.toLowerCase();
  const r0 = Number(pair.reserve0);
  const r1 = Number(pair.reserve1);
  const stables = /qusdc|usdc|usdt|dai/i;
  if (stables.test(pair.token1.symbol) && r0 > 0) return r1 / r0;
  if (stables.test(pair.token0.symbol) && r1 > 0) return r0 / r1;
  if (t0 === w && r0 > 0 && r1 > 0) return (r0 / r1) * qieUsd;
  if (t1 === w && r1 > 0 && r0 > 0) return (r1 / r0) * qieUsd;
  const p0 = Number(pair.token0Price);
  if (Number.isFinite(p0) && p0 > 0) {
    if (stables.test(pair.token1.symbol)) return p0;
    if (t1 === w) return p0 * qieUsd;
  }
  const liq = Number(pair.reserveUSD);
  if (liq > 0 && r0 > 0) return liq / (2 * r0);
  return 0;
}

export async function getTokenHolders(
  address: string,
  limit = 20,
): Promise<{ address: string; amount: string }[]> {
  const data = await explorerGet<{
    items: { address: { hash: string }; value: string }[];
  }>(`/api/v2/tokens/${address}/holders`);
  return (data?.items ?? []).slice(0, limit).map((h) => ({
    address: h.address.hash,
    amount: h.value,
  }));
}

export async function getExplorerToken(address: string) {
  return explorerGet<{
    address: string;
    name: string | null;
    symbol: string | null;
    decimals: string | null;
    holders: string | null;
    icon_url: string | null;
  }>(`/api/v2/tokens/${address}`);
}

const OWNER_SELECTOR = "0x8da5cb5b"; // owner() — standard Ownable getter
const TOTAL_SUPPLY_SELECTOR = "0x18160ddd"; // totalSupply()
const BALANCE_OF_SELECTOR = "0x70a08231"; // balanceOf(address)
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";

function encodeAddressArg(address: string): string {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function hexToBigInt(hex: string | null): bigint {
  if (!hex || hex === "0x") return 0n;
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

/** Real on-chain ERC-20 totalSupply() — null only if the call fails (no contract, bad RPC, etc). */
export async function getTokenTotalSupply(address: string): Promise<bigint | null> {
  if (address === "0") return null; // native QIE coin has no contract to query
  const result = await rpcCall<string>("eth_call", [
    { to: address, data: TOTAL_SUPPLY_SELECTOR },
    "latest",
  ]);
  if (!result || result === "0x") return null;
  return hexToBigInt(result);
}

export interface LpLockInfo {
  /** Fraction (0-1) of the pool's own LP-token supply sitting at a burn address; null if undeterminable */
  lockedRatio: number | null;
  totalSupply: bigint | null;
  burnedBalance: bigint | null;
}

/**
 * UniswapV2-style pools are themselves the LP token contract (the pool address
 * IS an ERC-20 with its own totalSupply/balanceOf). The standard on-chain
 * signal for "liquidity is locked" — the same one DexScreener/Token Sniffer-style
 * tools use — is what share of that LP supply sits at the zero address or the
 * conventional 0x…dEaD burn address, since LP tokens sent there can never be
 * redeemed to pull liquidity back out.
 */
export async function getLpLockInfo(poolAddress: string): Promise<LpLockInfo> {
  const [supplyHex, zeroBalHex, deadBalHex] = await Promise.all([
    rpcCall<string>("eth_call", [{ to: poolAddress, data: TOTAL_SUPPLY_SELECTOR }, "latest"]),
    rpcCall<string>("eth_call", [
      { to: poolAddress, data: BALANCE_OF_SELECTOR + encodeAddressArg(ZERO_ADDRESS) },
      "latest",
    ]),
    rpcCall<string>("eth_call", [
      { to: poolAddress, data: BALANCE_OF_SELECTOR + encodeAddressArg(DEAD_ADDRESS) },
      "latest",
    ]),
  ]);
  const totalSupply = supplyHex ? hexToBigInt(supplyHex) : null;
  if (totalSupply === null || totalSupply === 0n) {
    return { lockedRatio: null, totalSupply, burnedBalance: null };
  }
  const burned = hexToBigInt(zeroBalHex) + hexToBigInt(deadBalHex);
  const lockedRatio = Number((burned * 10_000n) / totalSupply) / 10_000;
  return { lockedRatio, totalSupply, burnedBalance: burned };
}

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const MAX_LOG_BLOCK_RANGE = 10_000; // stay under typical RPC provider caps on eth_getLogs

async function getBlockNumber(): Promise<number | null> {
  const hex = await rpcCall<string>("eth_blockNumber", []);
  return hex ? parseInt(hex, 16) : null;
}

async function getBlockTimestamp(blockNumber: number): Promise<number | null> {
  const block = await rpcCall<{ timestamp: string }>("eth_getBlockByNumber", [
    `0x${blockNumber.toString(16)}`,
    false,
  ]);
  return block ? parseInt(block.timestamp, 16) : null;
}

/** Blocks-per-second derived from two real blocks, so an hours-window can be converted to a block range without guessing Qie's block time. */
async function estimateBlockRate(latest: number): Promise<number | null> {
  if (latest < 1000) return null;
  const [tLatest, tOld] = await Promise.all([
    getBlockTimestamp(latest),
    getBlockTimestamp(latest - 1000),
  ]);
  if (!tLatest || !tOld || tLatest <= tOld) return null;
  return 1000 / (tLatest - tOld);
}

export interface TransferEvent {
  from: string;
  to: string;
  value: bigint;
  blockNumber: number;
}

/**
 * Real ERC-20 Transfer events for a token over the last `hours`, via eth_getLogs.
 * Replaces the previous Math.random()-fabricated whale activity. Range is
 * capped at MAX_LOG_BLOCK_RANGE blocks to stay within typical RPC provider
 * limits — on a fast chain this may under-cover the requested window rather
 * than over-fetch and get rejected; that's a real, disclosed limitation, not
 * fabricated data.
 */
export async function getRecentTransfers(
  tokenAddress: string,
  hours: number,
  maxResults = 500,
): Promise<{ transfers: TransferEvent[]; latestBlock: number; blockRate: number | null }> {
  const latest = await getBlockNumber();
  if (!latest) return { transfers: [], latestBlock: 0, blockRate: null };
  const rate = await estimateBlockRate(latest);
  const wantedBlocks = rate ? Math.round(rate * hours * 3600) : MAX_LOG_BLOCK_RANGE;
  const blocksBack = Math.min(latest, wantedBlocks, MAX_LOG_BLOCK_RANGE);
  const fromBlock = Math.max(0, latest - blocksBack);

  const logs = await rpcCall<
    { topics: string[]; data: string; blockNumber: string }[]
  >("eth_getLogs", [
    {
      address: tokenAddress,
      topics: [TRANSFER_TOPIC],
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: "latest",
    },
  ]);
  if (!logs) return { transfers: [], latestBlock: latest, blockRate: rate };

  const transfers = logs
    .filter((l) => l.topics.length === 3)
    .map((l) => ({
      from: `0x${l.topics[1].slice(-40)}`.toLowerCase(),
      to: `0x${l.topics[2].slice(-40)}`.toLowerCase(),
      value: hexToBigInt(l.data),
      blockNumber: parseInt(l.blockNumber, 16),
    }))
    .slice(-maxResults);

  return { transfers, latestBlock: latest, blockRate: rate };
}

export interface TokenRiskInfo {
  ownerAddress: string | null;
  /** True when an Ownable `owner()` returned a non-zero address (privileged control present) */
  mintAuthorityPresent: boolean;
  ownershipRenounced: boolean;
}

/**
 * Best-effort EVM risk signal: calls the standard Ownable `owner()` selector.
 * A present, non-zero owner is treated the same way the old Algorand ASA
 * "manager" field was — as a sign the contract retains privileged control
 * (mint/pause/etc.). Contracts without an `owner()` function (most plain
 * ERC-20s) fail the eth_call and are treated as ownership-renounced.
 */
export async function analyzeTokenRisk(address: string): Promise<TokenRiskInfo> {
  if (address === "0") {
    // Native QIE coin — no contract, no owner.
    return { ownerAddress: null, mintAuthorityPresent: false, ownershipRenounced: true };
  }
  const result = await rpcCall<string>("eth_call", [
    { to: address, data: OWNER_SELECTOR },
    "latest",
  ]);
  if (!result || result === "0x" || result.length < 66) {
    return { ownerAddress: null, mintAuthorityPresent: false, ownershipRenounced: true };
  }
  const ownerAddress = `0x${result.slice(-40)}`.toLowerCase();
  const mintAuthorityPresent = ownerAddress !== ZERO_ADDRESS;
  return {
    ownerAddress,
    mintAuthorityPresent,
    ownershipRenounced: !mintAuthorityPresent,
  };
}
