import { prisma } from "../lib/db.js";
import { config } from "../lib/config.js";
import { fetchSubgraphPairsByCreation } from "../lib/qie-chain.js";
import { recordWorkerRun } from "./util.js";

export async function pollNewPairs(): Promise<void> {
  const run = await recordWorkerRun("pollNewPairs", "running");
  try {
    let inserted = 0;
    if (!config.useMockData) {
      // Ordered by creation time, not volume — pollPrices already upserts
      // the volume-ordered top-100 every 15s, so re-fetching that same set
      // here would add nothing; this worker's whole job is catching pairs
      // that pollPrices' ranking will never surface.
      const remote = await fetchSubgraphPairsByCreation(100);
      for (const p of remote) {
        const addr = p.id.toLowerCase();
        const existing = await prisma.pool.findUnique({
          where: { poolAddress: addr },
        });
        if (existing) continue;
        await prisma.pool.create({
          data: {
            chain: "qie",
            poolAddress: addr,
            token0: p.token0.id.toLowerCase(),
            token1: p.token1.id.toLowerCase(),
            dex: "qie-dex",
            createdAt: new Date(Number(p.createdAtTimestamp) * 1000),
          },
        });
        inserted++;
      }
    }
    await recordWorkerRun(
      "pollNewPairs",
      "success",
      run.id,
      `inserted ${inserted}`,
    );
  } catch (err) {
    await recordWorkerRun(
      "pollNewPairs",
      "error",
      run.id,
      undefined,
      (err as Error).message,
    );
    throw err;
  }
}
