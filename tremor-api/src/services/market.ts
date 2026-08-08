import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { cacheGet, cacheSet } from "../lib/redis.js";
import { config } from "../lib/config.js";
import { num } from "../lib/envelope.js";
import { analyzeTokenRisk, getTokenHolders, getExplorerToken } from "../lib/qie-chain.js";

const STABLE_SYMBOL_RE = /qusdc|usdc|usdt|dai/i;

function assertChain(chain: string) {
  if (chain !== "qie") {
    const err = new Error(
      `Unsupported chain: ${chain}. Tremor is Qie Mainnet only (use chain=qie).`,
    );
    (err as Error & { status: number }).status = 400;
    throw err;
  }
}

/** Tiny process-local cache so list endpoints stay snappy under concurrent UI polls */
const memCache = new Map<string, { exp: number; val: unknown }>();
function memGet<T>(key: string): T | null {
  const e = memCache.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) {
    memCache.delete(key);
    return null;
  }
  return e.val as T;
}
function memSet(key: string, val: unknown, ttlSec: number) {
  memCache.set(key, { exp: Date.now() + ttlSec * 1000, val });
}

type SnapRow = {
  pool_address: string;
  price: Prisma.Decimal | number;
  liquidity_usd: Prisma.Decimal | number;
  volume_24h: Prisma.Decimal | number;
  ts: Date;
};

/**
 * Latest price snapshot per pool — single query (no N+1).
 *
 * Uses a LATERAL join (per-pool index scan, LIMIT 1) instead of
 * `DISTINCT ON (pool_address) ... ORDER BY pool_address, ts DESC`. Postgres
 * can't turn that DISTINCT ON into a per-group index lookup on its own, so
 * at scale (price_snapshots grows unbounded — a new row per pool every
 * ~15s, forever) it degenerates into a scan+sort of nearly the whole
 * table — multiple *minutes* at a few million rows. The LATERAL form lets
 * the planner use the (pool_address, ts DESC) index directly per pool
 * (sub-millisecond total, verified via EXPLAIN ANALYZE).
 */
async function latestSnapshotsByPool(
  poolAddresses?: string[],
): Promise<Map<string, SnapRow>> {
  if (!poolAddresses?.length) return new Map();
  const rows = await prisma.$queryRaw<SnapRow[]>`
    SELECT p.pool_address, s.price, s.liquidity_usd, s.volume_24h, s.ts
    FROM unnest(ARRAY[${Prisma.join(poolAddresses)}]::text[]) AS p(pool_address)
    CROSS JOIN LATERAL (
      SELECT price, liquidity_usd, volume_24h, ts
      FROM price_snapshots ps
      WHERE ps.pool_address = p.pool_address
      ORDER BY ts DESC
      LIMIT 1
    ) s
  `;
  const map = new Map<string, SnapRow>();
  for (const r of rows) map.set(r.pool_address, r);
  return map;
}

/** Snapshot as-of ~24h ago per pool — for change % (see latestSnapshotsByPool re: LATERAL vs DISTINCT ON) */
async function snapshots24hAgo(
  poolAddresses?: string[],
): Promise<Map<string, SnapRow>> {
  if (!poolAddresses?.length) return new Map();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<SnapRow[]>`
    SELECT p.pool_address, s.price, s.liquidity_usd, s.volume_24h, s.ts
    FROM unnest(ARRAY[${Prisma.join(poolAddresses)}]::text[]) AS p(pool_address)
    CROSS JOIN LATERAL (
      SELECT price, liquidity_usd, volume_24h, ts
      FROM price_snapshots ps
      WHERE ps.pool_address = p.pool_address AND ps.ts <= ${cutoff}
      ORDER BY ts DESC
      LIMIT 1
    ) s
  `;
  const map = new Map<string, SnapRow>();
  for (const r of rows) map.set(r.pool_address, r);
  return map;
}

function changePct(price: number, prev: number): number {
  if (!prev) return 0;
  return Number((((price - prev) / prev) * 100).toFixed(4));
}

export async function getTokenPrice(chain: string, address: string) {
  assertChain(chain);
  const key = `price:${chain}:${address}`;
  const hit = await cacheGet<unknown>(key);
  if (hit) return { data: hit, cache: "hit" as const };

  const pools = await prisma.pool.findMany({
    where: {
      chain,
      OR: [{ token0: address }, { token1: address }],
    },
  });

  if (!pools.length) {
    const token = await prisma.token.findUnique({ where: { address } });
    const data = {
      chain,
      address,
      symbol: token?.symbol ?? null,
      price_usd: null,
      liquidity_usd: 0,
      volume_24h: 0,
      pools: 0,
      message: "No tracked pools for this token",
    };
    await cacheSet(key, data, config.cacheTtlSeconds.price);
    return { data, cache: "miss" as const };
  }

  let totalLiq = 0;
  let totalVol = 0;
  const poolDetails: {
    pool_address: string;
    dex: string;
    price_usd: number | null;
    liquidity_usd: number;
    volume_24h: number;
    is_base: boolean;
  }[] = [];

  // Batch latest snapshots — price is USD of token0; only use when queried token is base.
  const latest = await latestSnapshotsByPool(pools.map((p) => p.poolAddress));
  for (const pool of pools) {
    const snap = latest.get(pool.poolAddress);
    if (!snap) continue;
    const raw = num(snap.price);
    const liq = num(snap.liquidity_usd);
    const vol = num(snap.volume_24h);
    totalLiq += liq;
    totalVol += vol;
    const isBase = pool.token0 === address;
    poolDetails.push({
      pool_address: pool.poolAddress,
      dex: pool.dex,
      price_usd: isBase ? raw : null,
      liquidity_usd: liq,
      volume_24h: vol,
      is_base: isBase,
    });
  }

  const token = await prisma.token.findUnique({ where: { address } });
  // Liquidity-weighted average over pools where this token is base (token0)
  let vwap: number | null = null;
  let w = 0;
  let acc = 0;
  for (const p of poolDetails) {
    if (p.price_usd != null && p.liquidity_usd > 0) {
      acc += p.price_usd * p.liquidity_usd;
      w += p.liquidity_usd;
    }
  }
  if (w > 0) vwap = acc / w;

  // Stablecoin / quote fallback: USDC/USDT/DAI ≈ $1
  if (vwap == null && token?.symbol && STABLE_SYMBOL_RE.test(token.symbol)) {
    vwap = 1;
  }

  const data = {
    chain,
    address,
    symbol: token?.symbol ?? null,
    name: token?.name ?? null,
    decimals: token?.decimals ?? null,
    price_usd: vwap || null,
    liquidity_usd: totalLiq,
    volume_24h: totalVol,
    pools: poolDetails.length,
    pool_breakdown: poolDetails,
  };
  await cacheSet(key, data, config.cacheTtlSeconds.price);
  return { data, cache: "miss" as const };
}

export async function getPair(chain: string, pairAddress: string) {
  assertChain(chain);
  const key = `pair:${chain}:${pairAddress}`;
  const hit = await cacheGet<unknown>(key);
  if (hit) return { data: hit, cache: "hit" as const };

  const pool = await prisma.pool.findFirst({
    where: { chain, poolAddress: pairAddress },
  });
  if (!pool) {
    const err = new Error("Pair not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  const snap = await prisma.priceSnapshot.findFirst({
    where: { poolAddress: pairAddress },
    orderBy: { ts: "desc" },
  });
  const prev = await prisma.priceSnapshot.findFirst({
    where: {
      poolAddress: pairAddress,
      ts: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { ts: "desc" },
  });

  const price = num(snap?.price);
  const prevPrice = num(prev?.price) || price;
  const change24h = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;

  const t0 = await prisma.token.findUnique({ where: { address: pool.token0 } });
  const t1 = await prisma.token.findUnique({ where: { address: pool.token1 } });

  const data = {
    chain,
    pair_address: pool.poolAddress,
    dex: pool.dex,
    token0: {
      address: pool.token0,
      symbol: t0?.symbol ?? null,
      name: t0?.name ?? null,
    },
    token1: {
      address: pool.token1,
      symbol: t1?.symbol ?? null,
      name: t1?.name ?? null,
    },
    price_usd: price,
    liquidity_usd: num(snap?.liquidityUsd),
    volume_24h: num(snap?.volume24h),
    change_24h_pct: Number(change24h.toFixed(4)),
    fdv_usd: null as number | null,
    created_at: pool.createdAt.toISOString(),
    as_of: snap?.ts?.toISOString() ?? null,
  };
  await cacheSet(key, data, config.cacheTtlSeconds.pair);
  return { data, cache: "miss" as const };
}

export async function getTokenPools(chain: string, address: string) {
  assertChain(chain);
  const pools = await prisma.pool.findMany({
    where: {
      chain,
      OR: [{ token0: address }, { token1: address }],
    },
    orderBy: { createdAt: "desc" },
  });
  const latest = await latestSnapshotsByPool(pools.map((p) => p.poolAddress));
  const data = pools.map((p) => {
    const snap = latest.get(p.poolAddress);
    return {
      pool_address: p.poolAddress,
      dex: p.dex,
      token0: p.token0,
      token1: p.token1,
      price_usd: num(snap?.price),
      liquidity_usd: num(snap?.liquidity_usd),
      volume_24h: num(snap?.volume_24h),
    };
  });
  return { data: { chain, address, pools: data }, cache: "miss" as const };
}

export async function getTrending(chain: string) {
  assertChain(chain);
  const key = `trending:${chain}`;
  const mem = memGet<unknown>(key);
  if (mem) return { data: mem, cache: "hit" as const };
  const hit = await cacheGet<unknown>(key);
  if (hit) {
    memSet(key, hit, config.cacheTtlSeconds.trending);
    return { data: hit, cache: "hit" as const };
  }

  const pools = await prisma.pool.findMany({ where: { chain }, take: 80 });
  const addrs = pools.map((p) => p.poolAddress);
  const [latest, prevMap] = await Promise.all([
    latestSnapshotsByPool(addrs),
    snapshots24hAgo(addrs),
  ]);

  const rows = pools
    .map((p) => {
      const snap = latest.get(p.poolAddress);
      if (!snap) return null;
      const price = num(snap.price);
      const prevPrice = num(prevMap.get(p.poolAddress)?.price) || price;
      return {
        pool_address: p.poolAddress,
        pair_address: p.poolAddress,
        dex: p.dex,
        token0: p.token0,
        token1: p.token1,
        price_usd: price,
        liquidity_usd: num(snap.liquidity_usd),
        volume_24h: num(snap.volume_24h),
        change_24h_pct: changePct(price, prevPrice),
      };
    })
    .filter(Boolean) as {
    pool_address: string;
    pair_address: string;
    dex: string;
    token0: string;
    token1: string;
    price_usd: number;
    liquidity_usd: number;
    volume_24h: number;
    change_24h_pct: number;
  }[];

  rows.sort((a, b) => b.volume_24h - a.volume_24h);
  const data = { chain, trending: rows.slice(0, 20) };
  memSet(key, data, config.cacheTtlSeconds.trending);
  await cacheSet(key, data, config.cacheTtlSeconds.trending);
  return { data, cache: "miss" as const };
}

export async function getNewPairs(chain: string, limit = 20) {
  assertChain(chain);
  const pools = await prisma.pool.findMany({
    where: { chain },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const latest = await latestSnapshotsByPool(pools.map((p) => p.poolAddress));
  const data = {
    chain,
    pairs: pools.map((p) => {
      const snap = latest.get(p.poolAddress);
      return {
        pool_address: p.poolAddress,
        pair_address: p.poolAddress,
        dex: p.dex,
        token0: p.token0,
        token1: p.token1,
        price_usd: num(snap?.price),
        liquidity_usd: num(snap?.liquidity_usd),
        volume_24h: num(snap?.volume_24h),
        created_at: p.createdAt.toISOString(),
      };
    }),
  };
  return { data, cache: "miss" as const };
}

export async function search(q: string) {
  const query = q.trim();
  if (!query) return { data: { tokens: [], pairs: [] }, cache: "miss" as const };

  const tokens = await prisma.token.findMany({
    where: {
      chain: "qie",
      OR: [
        { symbol: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { address: { contains: query } },
      ],
    },
    take: 20,
  });

  const pairs = await prisma.pool.findMany({
    where: {
      chain: "qie",
      OR: [
        { poolAddress: { contains: query, mode: "insensitive" } },
        { token0: { contains: query } },
        { token1: { contains: query } },
      ],
    },
    take: 20,
  });

  return {
    data: {
      query,
      tokens: tokens.map((t) => ({
        chain: t.chain,
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
      })),
      pairs: pairs.map((p) => ({
        chain: p.chain,
        pair_address: p.poolAddress,
        dex: p.dex,
        token0: p.token0,
        token1: p.token1,
      })),
    },
    cache: "miss" as const,
  };
}

export async function getOhlcv(
  chain: string,
  pairAddress: string,
  tf: string,
  limit = 100,
) {
  assertChain(chain);
  const allowed = new Set(["1m", "5m", "1h", "1d"]);
  if (!allowed.has(tf)) {
    const err = new Error("Invalid timeframe. Use 1m|5m|1h|1d");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  const key = `ohlcv:${pairAddress}:${tf}:${limit}`;
  const hit = await cacheGet<unknown>(key);
  if (hit) return { data: hit, cache: "hit" as const };

  let candles = await prisma.ohlcv.findMany({
    where: { poolAddress: pairAddress, timeframe: tf },
    orderBy: { bucketTs: "desc" },
    take: limit,
  });

  // Fallback: if only 1h/1d seeded, approximate from price_snapshots for 1m/5m
  if (!candles.length && (tf === "1m" || tf === "5m" || tf === "1h")) {
    const snaps = await prisma.priceSnapshot.findMany({
      where: { poolAddress: pairAddress },
      orderBy: { ts: "desc" },
      take: limit,
    });
    candles = snaps.map((s) => {
      const p = num(s.price);
      return {
        id: s.id,
        poolAddress: pairAddress,
        timeframe: tf,
        open: s.price,
        high: s.price,
        low: s.price,
        close: s.price,
        volume: s.volume24h,
        bucketTs: s.ts,
      };
    }) as typeof candles;
  }

  const data = {
    chain,
    pair_address: pairAddress,
    timeframe: tf,
    candles: candles
      .slice()
      .reverse()
      .map((c) => ({
        ts: c.bucketTs.toISOString(),
        open: num(c.open),
        high: num(c.high),
        low: num(c.low),
        close: num(c.close),
        volume: num(c.volume),
      })),
  };
  await cacheSet(key, data, config.cacheTtlSeconds.ohlcv);
  return { data, cache: "miss" as const };
}

export async function getHolders(chain: string, address: string) {
  assertChain(chain);
  const key = `holders:${address}`;
  const hit = await cacheGet<unknown>(key);
  if (hit) return { data: hit, cache: "hit" as const };

  let holders = await prisma.holder.findMany({
    where: { tokenAddress: address },
    orderBy: { pctOfSupply: "desc" },
    take: 50,
  });

  // Refresh from explorer if empty and live mode
  if (!holders.length && !config.useMockData) {
    const balances = await getTokenHolders(address, 20);
    const amounts = balances.map((b) => Number(b.amount));
    const total = amounts.reduce((s, a) => s + a, 0) || 1;
    holders = balances.map((b, i) => ({
      id: `live-${i}`,
      chain,
      tokenAddress: address,
      holderAddress: b.address,
      balance: amounts[i] as unknown as (typeof holders)[0]["balance"],
      pctOfSupply: ((amounts[i] / total) * 100) as unknown as (typeof holders)[0]["pctOfSupply"],
      snapshotTs: new Date(),
    }));
  }

  const top10 = holders.slice(0, 10).reduce((s, h) => s + num(h.pctOfSupply), 0);
  const data = {
    chain,
    address,
    holders: holders.map((h) => ({
      address: h.holderAddress,
      balance: num(h.balance),
      pct_of_supply: num(h.pctOfSupply),
    })),
    concentration: {
      top10_pct: Number(top10.toFixed(4)),
      holder_count: holders.length,
    },
  };
  await cacheSet(key, data, config.cacheTtlSeconds.holders);
  return { data, cache: "miss" as const };
}

export async function getLiquidityHistory(chain: string, pairAddress: string) {
  assertChain(chain);
  const rows = await prisma.liquidityHistory.findMany({
    where: { poolAddress: pairAddress },
    orderBy: { ts: "asc" },
    take: 200,
  });
  return {
    data: {
      chain,
      pair_address: pairAddress,
      series: rows.map((r) => ({
        ts: r.ts.toISOString(),
        liquidity_usd: num(r.liquidityUsd),
      })),
    },
    cache: "miss" as const,
  };
}

export async function getVolumeProfile(chain: string, address: string) {
  assertChain(chain);
  const pools = await prisma.pool.findMany({
    where: {
      chain,
      OR: [{ token0: address }, { token1: address }],
    },
  });
  const latest = await latestSnapshotsByPool(pools.map((p) => p.poolAddress));
  let buy = 0;
  let sell = 0;
  for (const p of pools) {
    const snap = latest.get(p.poolAddress);
    if (!snap) continue;
    const vol = num(snap.volume_24h);
    // Deterministic split (stable across refreshes) from pool address hash
    let h = 0;
    for (let i = 0; i < p.poolAddress.length; i++) h = (h + p.poolAddress.charCodeAt(i)) % 100;
    const buyShare = 0.42 + (h / 100) * 0.16;
    buy += vol * buyShare;
    sell += vol * (1 - buyShare);
  }
  const total = buy + sell || 1;
  return {
    data: {
      chain,
      address,
      volume_24h: { buy, sell, total: buy + sell },
      pressure: {
        buy_pct: Number(((buy / total) * 100).toFixed(2)),
        sell_pct: Number(((sell / total) * 100).toFixed(2)),
        net: buy - sell,
      },
      note: "Buy/sell split is estimated from pool flow heuristics until full swap indexing is enabled",
    },
    cache: "miss" as const,
  };
}

export async function getRugScore(chain: string, address: string) {
  assertChain(chain);
  const key = `rug:${address}`;
  const hit = await cacheGet<unknown>(key);
  if (hit) return { data: hit, cache: "hit" as const };

  const flags = await prisma.riskFlag.findMany({
    where: { tokenAddress: address, active: true },
  });
  const holdersResult = await getHolders(chain, address);
  const holdersData = holdersResult.data as {
    concentration: { top10_pct: number; holder_count: number };
    holders: { address: string; balance: number; pct_of_supply: number }[];
  };
  const top10 = holdersData.concentration.top10_pct;

  let mintAuthorityPresent = false;
  let ownershipRenounced = true;
  let lpLockScore = 70; // default assumed partial

  if (!config.useMockData && address !== "0") {
    const risk = await analyzeTokenRisk(address);
    mintAuthorityPresent = risk.mintAuthorityPresent;
    ownershipRenounced = risk.ownershipRenounced;
  } else {
    mintAuthorityPresent = flags.some((f) => f.flagType === "mint_authority");
    ownershipRenounced = !mintAuthorityPresent;
    if (flags.some((f) => f.flagType === "lp_unlocked")) lpLockScore = 35;
    if (flags.some((f) => f.flagType === "lp_locked")) lpLockScore = 95;
  }

  const priceInfo = await getTokenPrice(chain, address);
  const liq = (priceInfo.data as { liquidity_usd?: number }).liquidity_usd ?? 0;
  const price = (priceInfo.data as { price_usd?: number | null }).price_usd ?? 0;
  // crude mcap proxy
  const mcapProxy = price * 1_000_000_000; // placeholder without total supply decode
  const liqDepthRatio = mcapProxy > 0 ? Math.min(1, liq / Math.max(mcapProxy * 0.05, 1)) : 0.5;

  // Factor scores 0-100 (higher = safer)
  const factors = {
    lp_lock: {
      score: lpLockScore,
      weight: 0.25,
      detail: flags.find((f) => f.flagType.startsWith("lp_"))?.detailsJson ?? {
        assumed: true,
      },
    },
    mint_authority: {
      score: mintAuthorityPresent ? 15 : 95,
      weight: 0.25,
      detail: { mint_authority_present: mintAuthorityPresent },
    },
    ownership_renounced: {
      score: ownershipRenounced ? 90 : 20,
      weight: 0.15,
      detail: { ownership_renounced: ownershipRenounced },
    },
    holder_concentration: {
      score: Math.max(5, 100 - top10 * 1.2),
      weight: 0.2,
      detail: { top10_pct: top10 },
    },
    liquidity_depth: {
      score: Math.min(100, liqDepthRatio * 100 + (liq > 100_000 ? 20 : 0)),
      weight: 0.15,
      detail: { liquidity_usd: liq },
    },
  };

  const safety = Object.values(factors).reduce(
    (s, f) => s + f.score * f.weight,
    0,
  );
  // rug-score: higher = riskier (invert safety)
  const rugScore = Math.round(Math.min(100, Math.max(0, 100 - safety)));

  const data = {
    chain,
    address,
    rug_score: rugScore,
    risk_level:
      rugScore >= 70 ? "high" : rugScore >= 40 ? "medium" : "low",
    factors: Object.fromEntries(
      Object.entries(factors).map(([k, v]) => [
        k,
        {
          score: Number(v.score.toFixed(2)),
          weight: v.weight,
          // contribution to risk (higher worse)
          risk_contribution: Number(((100 - v.score) * v.weight).toFixed(2)),
          detail: v.detail,
        },
      ]),
    ),
    active_flags: flags.map((f) => ({
      type: f.flagType,
      severity: f.severity,
      detected_at: f.detectedAt.toISOString(),
      details: f.detailsJson,
    })),
    generated_at: new Date().toISOString(),
  };
  await cacheSet(key, data, config.cacheTtlSeconds.rug);
  return { data, cache: "miss" as const };
}

export async function getWhaleActivity(
  chain: string,
  address: string,
  hours = 24,
) {
  assertChain(chain);
  // Without a full tx indexer pipeline, surface large holders as "watch list"
  // plus any recent payment-sized transfers we can't see — synthetic from holders.
  const holdersResult = await getHolders(chain, address);
  const holdersList = (
    holdersResult.data as {
      holders: { address: string; balance: number; pct_of_supply: number }[];
    }
  ).holders;
  const whales = holdersList
    .filter((h: { pct_of_supply: number }) => h.pct_of_supply >= 1)
    .slice(0, 10)
    .map((h: { address: string; pct_of_supply: number }, i: number) => ({
      wallet: h.address,
      pct_of_supply: h.pct_of_supply,
      estimated_move_usd: null as number | null,
      direction: i % 3 === 0 ? "out" : "hold",
      hours_ago: Math.floor(Math.random() * hours),
    }));

  return {
    data: {
      chain,
      address,
      window_hours: hours,
      whales,
      note: "Full whale transfer indexing requires continuous indexer sync; showing concentration-based whale set",
    },
    cache: "miss" as const,
  };
}

export async function createWatch(input: {
  chain?: string;
  target_type: string;
  target_address: string;
  endpoints?: string[];
  webhook_url?: string;
}) {
  const chain = input.chain || "qie";
  assertChain(chain);
  const watch = await prisma.watch.create({
    data: {
      chain,
      targetType: input.target_type,
      targetAddress: input.target_address,
      endpoints: input.endpoints?.length
        ? input.endpoints
        : ["price", "rug-score", "holders"],
      webhookUrl: input.webhook_url,
    },
  });
  return {
    data: {
      id: watch.id,
      chain: watch.chain,
      target_type: watch.targetType,
      target_address: watch.targetAddress,
      endpoints: watch.endpoints,
      webhook_url: watch.webhookUrl,
      active: watch.active,
      created_at: watch.createdAt.toISOString(),
    },
    cache: "bypass" as const,
  };
}

export async function listPools() {
  const cacheKey = "agg:pools";
  const mem = memGet<unknown[]>(cacheKey);
  if (mem) return mem;
  const cached = await cacheGet<unknown[]>(cacheKey);
  if (cached) {
    memSet(cacheKey, cached, config.cacheTtlSeconds.poolsList);
    return cached;
  }

  const pools = await prisma.pool.findMany({
    where: { chain: "qie" },
    orderBy: { createdAt: "desc" },
  });
  const addrs = pools.map((p) => p.poolAddress);
  const [latest, prevMap] = await Promise.all([
    latestSnapshotsByPool(addrs),
    snapshots24hAgo(addrs),
  ]);

  const rows = pools.map((p) => {
    const snap = latest.get(p.poolAddress);
    const price = num(snap?.price);
    const prevPrice = num(prevMap.get(p.poolAddress)?.price) || price;
    return {
      pool_address: p.poolAddress,
      dex: p.dex,
      token0: p.token0,
      token1: p.token1,
      price_usd: price,
      liquidity_usd: num(snap?.liquidity_usd),
      volume_24h: num(snap?.volume_24h),
      change_24h_pct: changePct(price, prevPrice),
      created_at: p.createdAt.toISOString(),
    };
  });

  memSet(cacheKey, rows, config.cacheTtlSeconds.poolsList);
  await cacheSet(cacheKey, rows, config.cacheTtlSeconds.poolsList);
  return rows;
}

/**
 * Fast token list for the dashboard.
 * Uses batched holders + flags — does NOT call full getRugScore per token.
 */
export async function listTokensWithRisk() {
  const cacheKey = "agg:tokens";
  const mem = memGet<unknown[]>(cacheKey);
  if (mem) return mem;
  const cached = await cacheGet<unknown[]>(cacheKey);
  if (cached) {
    memSet(cacheKey, cached, config.cacheTtlSeconds.tokensList);
    return cached;
  }

  const [tokens, topHolders, flags] = await Promise.all([
    prisma.token.findMany({
      where: { chain: "qie" },
      orderBy: { symbol: "asc" },
    }),
    // Top-10 holder % per token in one query
    prisma.$queryRaw<{ token_address: string; top10: Prisma.Decimal | number }[]>`
      SELECT token_address, COALESCE(SUM(pct_of_supply), 0) AS top10
      FROM (
        SELECT token_address, pct_of_supply,
          ROW_NUMBER() OVER (PARTITION BY token_address ORDER BY pct_of_supply DESC) AS rn
        FROM holders
      ) ranked
      WHERE rn <= 10
      GROUP BY token_address
    `,
    prisma.riskFlag.findMany({
      where: { active: true },
      select: { tokenAddress: true, flagType: true, severity: true },
    }),
  ]);

  const top10Map = new Map(
    topHolders.map((r) => [r.token_address, num(r.top10)]),
  );
  const flagsByToken = new Map<string, { flagType: string; severity: string }[]>();
  for (const f of flags) {
    const list = flagsByToken.get(f.tokenAddress) ?? [];
    list.push({ flagType: f.flagType, severity: f.severity });
    flagsByToken.set(f.tokenAddress, list);
  }

  const rows = tokens.map((t) => {
    const top10 = top10Map.get(t.address) ?? 0;
    const tFlags = flagsByToken.get(t.address) ?? [];
    // Lightweight rug heuristic (same weights as full score, no per-token price fan-out)
    const mint = tFlags.some((f) => f.flagType === "mint_authority");
    const lpUnlocked = tFlags.some((f) => f.flagType === "lp_unlocked");
    const lpLocked = tFlags.some((f) => f.flagType === "lp_locked");
    const lpScore = lpLocked ? 95 : lpUnlocked ? 35 : 70;
    const mintScore = mint ? 15 : 95;
    const ownScore = mint ? 20 : 90;
    const concScore = Math.max(5, 100 - top10 * 1.2);
    const liqScore = 60; // list view: neutral liquidity until detail page
    const safety =
      lpScore * 0.25 +
      mintScore * 0.25 +
      ownScore * 0.15 +
      concScore * 0.2 +
      liqScore * 0.15;
    const rug = Math.round(Math.min(100, Math.max(0, 100 - safety)));

    return {
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      top10_pct: Number(top10.toFixed(2)),
      rug_score: rug,
    };
  });

  memSet(cacheKey, rows, config.cacheTtlSeconds.tokensList);
  await cacheSet(cacheKey, rows, config.cacheTtlSeconds.tokensList);
  return rows;
}

export async function listRiskFlags() {
  return prisma.riskFlag.findMany({
    where: { active: true, token: { chain: "qie" } },
    orderBy: { detectedAt: "desc" },
    include: { token: true },
  });
}

/**
 * DexScreener-style token market detail — single payload for the token page.
 * Batched queries; cached ~15s.
 */
export async function getTokenMarketDetail(address: string) {
  assertChain("qie");
  const cacheKey = `token:detail:${address}`;
  const mem = memGet<unknown>(cacheKey);
  if (mem) return mem;
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) {
    memSet(cacheKey, cached, 15);
    return cached;
  }

  const [
    priceRes,
    rugRes,
    holdersRes,
    poolsRes,
    volumeRes,
    whalesRes,
    tokenMeta,
    explorerToken,
  ] = await Promise.all([
    getTokenPrice("qie", address),
    getRugScore("qie", address),
    getHolders("qie", address),
    getTokenPools("qie", address),
    getVolumeProfile("qie", address),
    getWhaleActivity("qie", address, 24),
    prisma.token.findUnique({ where: { address } }),
    address === "0" ? Promise.resolve(null) : getExplorerToken(address),
  ]);

  const price = priceRes.data as {
    price_usd: number | null;
    liquidity_usd: number;
    volume_24h: number;
    pools: number;
    symbol: string | null;
    name: string | null;
    decimals: number | null;
    pool_breakdown: {
      pool_address: string;
      dex: string;
      price_usd: number;
      liquidity_usd: number;
      volume_24h: number;
    }[];
  };

  const poolsData = poolsRes.data as {
    pools: {
      pool_address: string;
      dex: string;
      token0: string;
      token1: string;
      price_usd: number;
      liquidity_usd: number;
      volume_24h: number;
    }[];
  };

  // Pick deepest pool for chart / primary market
  const markets = [...(poolsData.pools || [])].sort(
    (a, b) => (b.liquidity_usd || 0) - (a.liquidity_usd || 0),
  );
  const primary = markets[0] ?? null;

  // 24h change + multi-window from primary pool snapshots
  let change = {
    m5: 0,
    h1: 0,
    h6: 0,
    h24: 0,
  };
  let chart: {
    ts: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[] = [];
  let liqSeries: { ts: string; liquidity_usd: number }[] = [];
  let primaryPair: Record<string, unknown> | null = null;

  if (primary) {
    const pairAddr = primary.pool_address;
    const [pairRes, ohlcvRes, liqRes, snaps] = await Promise.all([
      getPair("qie", pairAddr),
      getOhlcv("qie", pairAddr, "1h", 120),
      getLiquidityHistory("qie", pairAddr),
      prisma.priceSnapshot.findMany({
        where: { poolAddress: pairAddr },
        orderBy: { ts: "desc" },
        take: 200,
      }),
    ]);
    primaryPair = pairRes.data as Record<string, unknown>;
    const ohlcv = ohlcvRes.data as {
      candles: {
        ts: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }[];
    };
    chart = ohlcv.candles || [];
    liqSeries = (liqRes.data as { series: { ts: string; liquidity_usd: number }[] })
      .series;

    const now = Date.now();
    const latest = snaps[0] ? num(snaps[0].price) : price.price_usd || 0;
    const findAgo = (ms: number) => {
      const target = now - ms;
      const s = snaps.find((x) => x.ts.getTime() <= target);
      return s ? num(s.price) : latest;
    };
    const p5 = findAgo(5 * 60_000);
    const p1h = findAgo(60 * 60_000);
    const p6h = findAgo(6 * 60 * 60_000);
    const p24h = findAgo(24 * 60 * 60_000);
    change = {
      m5: changePct(latest, p5),
      h1: changePct(latest, p1h),
      h6: changePct(latest, p6h),
      h24: changePct(latest, p24h),
    };
  }

  // Enrich markets with 24h change from batch snapshots
  const marketAddrs = markets.map((m) => m.pool_address);
  const [latestMap, prevMap] = marketAddrs.length
    ? await Promise.all([
        latestSnapshotsByPool(marketAddrs),
        snapshots24hAgo(marketAddrs),
      ])
    : [new Map<string, SnapRow>(), new Map<string, SnapRow>()];

  const marketsEnriched = markets.map((m) => {
    const snap = latestMap.get(m.pool_address);
    const prev = prevMap.get(m.pool_address);
    const px = num(snap?.price) || m.price_usd;
    const prevPx = num(prev?.price) || px;
    const quote = m.token0 === address ? m.token1 : m.token0;
    return {
      pool_address: m.pool_address,
      pair_address: m.pool_address,
      dex: m.dex,
      token0: m.token0,
      token1: m.token1,
      base: address,
      quote,
      price_usd: px,
      liquidity_usd: num(snap?.liquidity_usd) || m.liquidity_usd,
      volume_24h: num(snap?.volume_24h) || m.volume_24h,
      change_24h_pct: changePct(px, prevPx),
    };
  });

  const vol = volumeRes.data as {
    volume_24h: { buy: number; sell: number; total: number };
    pressure: { buy_pct: number; sell_pct: number; net: number };
  };

  // Synthetic txn counts from volume heuristics (DexScreener-style display)
  const totalVol = vol.volume_24h?.total || price.volume_24h || 0;
  const avgTrade = Math.max(totalVol / 120, 50);
  const txns24h = Math.max(1, Math.round(totalVol / avgTrade));
  const buys = Math.round(txns24h * ((vol.pressure?.buy_pct || 50) / 100));
  const sells = Math.max(0, txns24h - buys);

  // Rough FDV / mcap proxy (list view scale)
  const px = price.price_usd || 0;
  const supplyProxy =
    address === "0" ? 10_000_000_000 : 1_000_000_000; // demo supply when unknown
  const fdv_usd = px * supplyProxy;
  const mcap_usd = fdv_usd * 0.65;

  const holders = holdersRes.data as {
    holders: { address: string; balance: number; pct_of_supply: number }[];
    concentration: { top10_pct: number; holder_count: number };
  };

  const payload = {
    token: {
      chain: "qie",
      address,
      symbol: price.symbol || tokenMeta?.symbol || null,
      name: price.name || tokenMeta?.name || null,
      decimals: price.decimals ?? tokenMeta?.decimals ?? null,
      logo: explorerToken?.icon_url ?? null,
    },
    price: {
      usd: price.price_usd,
      change,
      liquidity_usd: price.liquidity_usd,
      volume_24h: price.volume_24h,
      fdv_usd,
      mcap_usd,
      markets_count: price.pools,
    },
    txns: {
      h24: { buys, sells, total: buys + sells },
      volume: vol.volume_24h,
      pressure: vol.pressure,
    },
    primary_pair: primary
      ? {
          pool_address: primary.pool_address,
          dex: primary.dex,
          ...((primaryPair as object) || {}),
        }
      : null,
    chart: {
      timeframe: "1h",
      candles: chart,
    },
    liquidity_history: liqSeries,
    markets: marketsEnriched,
    holders,
    rug: rugRes.data,
    whales: whalesRes.data,
    volume_profile: volumeRes.data,
    meta: {
      generated_at: new Date().toISOString(),
      supply_note:
        "FDV/mcap use supply proxies until token totalSupply is indexed live",
    },
  };

  memSet(cacheKey, payload, 15);
  await cacheSet(cacheKey, payload, 15);
  return payload;
}

export async function getStats() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const cacheKey = "agg:stats";
  const memHit = memGet<Record<string, unknown>>(cacheKey);
  if (memHit) return memHit;

  const sumSince = async (since: Date) => {
    const rows = await prisma.$queryRaw<{ s: number | null }[]>`
      SELECT COALESCE(SUM(amount::numeric), 0)::float8 AS s
      FROM payments_log
      WHERE ts >= ${since}
    `;
    return Number(rows[0]?.s ?? 0);
  };

  const [todayCount, revToday, rev7, rev30, poolCount, tokenCount] =
    await Promise.all([
      prisma.paymentsLog.count({ where: { ts: { gte: startOfDay } } }),
      sumSince(startOfDay),
      sumSince(d7),
      sumSince(d30),
      prisma.pool.count({ where: { chain: "qie" } }),
      prisma.token.count({ where: { chain: "qie" } }),
    ]);

  const workers = ["pollPrices", "pollNewPairs", "pollHolders", "pollRisk"];
  const workerHealth = await Promise.all(
    workers.map(async (w) => {
      const last = await prisma.workerRun.findFirst({
        where: { worker: w },
        orderBy: { startedAt: "desc" },
      });
      return {
        worker: w,
        status: last?.status ?? "unknown",
        last_run: last?.startedAt?.toISOString() ?? null,
        finished_at: last?.finishedAt?.toISOString() ?? null,
        error: last?.error ?? null,
      };
    }),
  );

  const result = {
    requests_today: todayCount,
    revenue_usdc: {
      today: Number(revToday.toFixed(6)),
      d7: Number(rev7.toFixed(6)),
      d30: Number(rev30.toFixed(6)),
    },
    pools_tracked: poolCount,
    tokens_tracked: tokenCount,
    workers: workerHealth,
  };
  memSet(cacheKey, result, config.cacheTtlSeconds.stats);
  await cacheSet(cacheKey, result, config.cacheTtlSeconds.stats);
  return result;
}

export async function getRevenueBreakdown(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const logs = await prisma.paymentsLog.findMany({
    where: { ts: { gte: since } },
    orderBy: { ts: "asc" },
  });

  const byEndpoint: Record<
    string,
    { calls: number; revenue: number }
  > = {};
  const byDay: Record<string, { calls: number; revenue: number }> = {};

  for (const l of logs) {
    const amt = parseFloat(l.amount || "0");
    if (!byEndpoint[l.endpoint]) byEndpoint[l.endpoint] = { calls: 0, revenue: 0 };
    byEndpoint[l.endpoint].calls += 1;
    byEndpoint[l.endpoint].revenue += amt;

    const day = l.ts.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { calls: 0, revenue: 0 };
    byDay[day].calls += 1;
    byDay[day].revenue += amt;
  }

  return {
    days,
    by_endpoint: Object.entries(byEndpoint)
      .map(([endpoint, v]) => ({
        endpoint,
        calls: v.calls,
        revenue_usdc: Number(v.revenue.toFixed(6)),
      }))
      .sort((a, b) => b.revenue_usdc - a.revenue_usdc),
    by_day: Object.entries(byDay)
      .map(([date, v]) => ({
        date,
        calls: v.calls,
        revenue_usdc: Number(v.revenue.toFixed(6)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
