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
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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
