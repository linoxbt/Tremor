import { prisma } from "../lib/db.js";
import { config } from "../lib/config.js";
import { fetchTinymanPools } from "../lib/algorand.js";
import { recordWorkerRun } from "./util.js";
import { Prisma } from "@prisma/client";

/**
 * Every 5 min: discover new pools.
 * Live: Tinyman/indexer; mock: occasionally inject a synthetic pair.
 */
export async function pollNewPairs(): Promise<void> {
  const run = await recordWorkerRun("pollNewPairs", "running");
  try {
    let inserted = 0;

    if (!config.useMockData) {
      const remote = await fetchTinymanPools();
      if (remote?.length) {
        for (const raw of remote.slice(0, 50)) {
          const row = raw as Record<string, unknown>;
          const addr =
            (row.address as string) ||
            (row.pool_address as string) ||
            (row.app_id != null ? String(row.app_id) : null);
          if (!addr) continue;
          const existing = await prisma.pool.findUnique({
            where: { poolAddress: addr },
          });
          if (existing) continue;
          const token0 = String(row.asset_1_id ?? row.token0 ?? "0");
          const token1 = String(row.asset_2_id ?? row.token1 ?? "31566704");
          await prisma.pool.create({
            data: {
              chain: "algorand",
              poolAddress: addr,
              token0,
              token1,
              dex: "tinyman",
            },
          });
          inserted++;
        }
      }
    } else if (Math.random() < 0.3) {
      // Demo: rare synthetic new pair
      const id = `TM-DEMO-${Date.now().toString(36).toUpperCase()}`;
      await prisma.pool.create({
        data: {
          chain: "algorand",
          poolAddress: id,
          token0: "0",
          token1: "31566704",
          dex: "tinyman",
        },
      });
      await prisma.priceSnapshot.create({
        data: {
          poolAddress: id,
          price: new Prisma.Decimal(0.18 * (0.95 + Math.random() * 0.1)),
          liquidityUsd: new Prisma.Decimal(10_000 + Math.random() * 50_000),
          volume24h: new Prisma.Decimal(Math.random() * 5_000),
        },
      });
      inserted = 1;
    }

    await recordWorkerRun("pollNewPairs", "success", run.id, `inserted ${inserted}`);
  } catch (err) {
    await recordWorkerRun("pollNewPairs", "error", run.id, undefined, (err as Error).message);
    throw err;
  }
}
