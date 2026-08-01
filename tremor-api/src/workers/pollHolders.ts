import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { config } from "../lib/config.js";
import { getAssetHolders } from "../lib/algorand.js";
import { recordWorkerRun } from "./util.js";

/**
 * Hourly: snapshot holder distributions for tracked non-ALGO tokens.
 */
export async function pollHolders(): Promise<void> {
  const run = await recordWorkerRun("pollHolders", "running");
  try {
    const tokens = await prisma.token.findMany({
      where: { chain: "algorand", NOT: { address: "0" } },
    });
    let snapshotted = 0;

    for (const token of tokens) {
      if (!config.useMockData) {
        const balances = await getAssetHolders(token.address, 25);
        if (!balances.length) continue;
        const total = balances.reduce((s, b) => s + b.amount, 0) || 1;
        // Clear previous snapshot for this token (keep latest only for simplicity)
        await prisma.holder.deleteMany({ where: { tokenAddress: token.address } });
        for (const b of balances) {
          await prisma.holder.create({
            data: {
              chain: "algorand",
              tokenAddress: token.address,
              holderAddress: b.address,
              balance: new Prisma.Decimal(b.amount),
              pctOfSupply: new Prisma.Decimal(((b.amount / total) * 100).toFixed(6)),
              snapshotTs: new Date(),
            },
          });
        }
        snapshotted++;
      } else {
        // Mock: re-jitter existing holder percentages slightly
        const holders = await prisma.holder.findMany({
          where: { tokenAddress: token.address },
        });
        for (const h of holders) {
          const pct = Number(h.pctOfSupply.toString()) * (1 + (Math.random() - 0.5) * 0.02);
          await prisma.holder.update({
            where: { id: h.id },
            data: {
              pctOfSupply: new Prisma.Decimal(Math.max(0.01, pct).toFixed(6)),
              snapshotTs: new Date(),
            },
          });
        }
        if (holders.length) snapshotted++;
      }
    }

    await recordWorkerRun("pollHolders", "success", run.id, `tokens=${snapshotted}`);
  } catch (err) {
    await recordWorkerRun("pollHolders", "error", run.id, undefined, (err as Error).message);
    throw err;
  }
}
