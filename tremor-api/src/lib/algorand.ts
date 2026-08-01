/**
 * Thin Algorand Indexer / Algod client + Tinyman analytics hooks.
 * All data sourcing is Algorand Mainnet/Testnet only.
 */
import { config } from "./config.js";

export interface IndexerAsset {
  index: number;
  params: {
    name?: string;
    "unit-name"?: string;
    decimals?: number;
    total?: number | bigint;
    creator?: string;
    "default-frozen"?: boolean;
    manager?: string;
    reserve?: string;
    freeze?: string;
    clawback?: string;
  };
}

export interface IndexerAccountAsset {
  "asset-id": number;
  amount: number;
  "is-frozen"?: boolean;
}

async function indexerGet<T>(path: string): Promise<T | null> {
  const url = `${config.indexerUrl.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.warn("[indexer]", path, (err as Error).message);
    return null;
  }
}

export async function getAsset(assetId: string): Promise<IndexerAsset | null> {
  if (assetId === "0") {
    return {
      index: 0,
      params: {
        name: "Algorand",
        "unit-name": "ALGO",
        decimals: 6,
        total: 10_000_000_000_000_000,
      },
    };
  }
  const data = await indexerGet<{ asset: IndexerAsset }>(`/v2/assets/${assetId}`);
  return data?.asset ?? null;
}

export async function getAssetHolders(
  assetId: string,
  limit = 20,
): Promise<{ address: string; amount: number }[]> {
  if (assetId === "0") return [];
  const data = await indexerGet<{
    balances: { address: string; amount: number }[];
  }>(`/v2/assets/${assetId}/balances?limit=${limit}&currency-greater-than=0`);
  return data?.balances ?? [];
}

/**
 * Mint / freeze / clawback / manager fields empty => renounced-style control.
 * On Algorand, empty string manager means immutable params.
 */
export function analyzeAssetRisk(asset: IndexerAsset) {
  const p = asset.params;
  const mintAuthorityPresent = Boolean(p.manager && p.manager.length > 0);
  const freezePresent = Boolean(p.freeze && p.freeze.length > 0);
  const clawbackPresent = Boolean(p.clawback && p.clawback.length > 0);
  const defaultFrozen = Boolean(p["default-frozen"]);
  return {
    mintAuthorityPresent,
    ownershipRenounced: !mintAuthorityPresent,
    freezePresent,
    clawbackPresent,
    defaultFrozen,
    creator: p.creator ?? null,
  };
}

/** Best-effort Tinyman analytics fetch; returns null if unreachable. */
export async function fetchTinymanPools(): Promise<unknown[] | null> {
  try {
    const base = config.tinymanApiUrl.replace(/\/$/, "");
    // Public analytics surfaces vary; try common paths then bail.
    for (const path of ["/api/v1/pools", "/v1/pools", "/pools"]) {
      const res = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body)) return body;
        if (body && typeof body === "object" && Array.isArray((body as { results?: unknown[] }).results)) {
          return (body as { results: unknown[] }).results;
        }
        if (body && typeof body === "object" && Array.isArray((body as { pools?: unknown[] }).pools)) {
          return (body as { pools: unknown[] }).pools;
        }
      }
    }
  } catch (err) {
    console.warn("[tinyman]", (err as Error).message);
  }
  return null;
}

export async function healthCheckChain(): Promise<{
  indexer: boolean;
  network: string;
}> {
  const health = await indexerGet<{ "current-round"?: number }>("/health");
  // indexer /health may return plain text; also try /v2/transactions?limit=1
  const tx = await indexerGet<{ "current-round"?: number }>(
    "/v2/transactions?limit=1",
  );
  return {
    indexer: Boolean(health || tx),
    network: config.network,
  };
}
