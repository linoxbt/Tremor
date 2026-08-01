import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { cacheSet, cacheDel } from "../lib/redis.js";
import { config } from "../lib/config.js";
import {
  deriveUsdPrice,
  fetchSubgraphPairs,
  getCoinPriceUsd,
} from "../lib/qie-chain.js";
import { recordWorkerRun } from "./util.js";

/**
 * Refresh prices from Qie Mainnet DEX subgraph (or jitter seed when mock).
 */
export async function pollPrices(): Promise<void> {
  const run = await recordWorkerRun("pollPrices", "running");
  try {
    let updated = 0;

    if (!config.useMockData) {
      const remote = await fetchSubgraphPairs(100);
      if (remote.length) {
        const qieUsd = await getCoinPriceUsd();
        for (const p of remote) {
          const t0 = p.token0.id.toLowerCase();
          const t1 = p.token1.id.toLowerCase();
          const pool = p.id.toLowerCase();

          await prisma.token.upsert({
            where: { address: t0 },
            create: {
              chain: "qie",
              address: t0,
              symbol: p.token0.symbol,
              name: p.token0.name,
              decimals: Number(p.token0.decimals) || 18,
            },
            update: { symbol: p.token0.symbol, name: p.token0.name },
          });
          await prisma.token.upsert({
            where: { address: t1 },
            create: {
              chain: "qie",
              address: t1,
              symbol: p.token1.symbol,
              name: p.token1.name,
              decimals: Number(p.token1.decimals) || 18,
            },
            update: { symbol: p.token1.symbol, name: p.token1.name },
          });
          await prisma.pool.upsert({
            where: { poolAddress: pool },
            create: {
              chain: "qie",
              poolAddress: pool,
              token0: t0,
              token1: t1,
              dex: "qie-dex",
              createdAt: new Date(Number(p.createdAtTimestamp) * 1000),
            },
            update: { token0: t0, token1: t1 },
          });

          const price = deriveUsdPrice(p, config.wqie, qieUsd);
          const liq = Number(p.reserveUSD) || 0;
          const vol = Number(p.volumeUSD) || 0;
          await prisma.priceSnapshot.create({
            data: {
              poolAddress: pool,
              price: new Prisma.Decimal(price || 0),
              liquidityUsd: new Prisma.Decimal(liq),
              volume24h: new Prisma.Decimal(vol),
              ts: new Date(),
            },
          });
          await cacheSet(
            `pair:qie:${pool}`,
            {
              chain: "qie",
              pair_address: pool,
              price_usd: price,
              liquidity_usd: liq,
              volume_24h: vol,
            },
            config.cacheTtlSeconds.price,
          );
          updated++;
        }
        await cacheDel("trending:*");
        await cacheDel("agg:*");
        await recordWorkerRun(
          "pollPrices",
          "success",
          run.id,
          `qie mainnet subgraph: ${updated} pools`,
        );
        return;
      }
      console.warn("[pollPrices] subgraph empty — falling back to jitter");
    }

    const pools = await prisma.pool.findMany({ where: { chain: "qie" } });
    for (const pool of pools) {
      const last = await prisma.priceSnapshot.findFirst({
        where: { poolAddress: pool.poolAddress },
        orderBy: { ts: "desc" },
      });
      const basePrice = last ? Number(last.price.toString()) : 0.1;
      const baseLiq = last ? Number(last.liquidityUsd.toString()) : 100_000;
      const baseVol = last ? Number(last.volume24h.toString()) : 10_000;
      const price = basePrice * (1 + (Math.random() - 0.5) * 0.004);
      const liq = baseLiq * (1 + (Math.random() - 0.5) * 0.01);
      const vol = baseVol * (1 + (Math.random() - 0.5) * 0.02);
      await prisma.priceSnapshot.create({
        data: {
          poolAddress: pool.poolAddress,
          price: new Prisma.Decimal(price),
          liquidityUsd: new Prisma.Decimal(liq),
          volume24h: new Prisma.Decimal(vol),
          ts: new Date(),
        },
      });
      updated++;
    }
    await cacheDel("trending:*");
    await cacheDel("agg:*");
    await recordWorkerRun(
      "pollPrices",
      "success",
      run.id,
      `jittered ${updated} pools`,
    );
  } catch (err) {
    await recordWorkerRun(
      "pollPrices",
      "error",
      run.id,
      undefined,
      (err as Error).message,
    );
    throw err;
  }
}
