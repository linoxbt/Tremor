import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { config } from "../lib/config.js";
import { getTokenHolders } from "../lib/qie-chain.js";
import { recordWorkerRun } from "./util.js";

export async function pollHolders(): Promise<void> {
  const run = await recordWorkerRun("pollHolders", "running");
  try {
    const tokens = await prisma.token.findMany({
      where: { chain: "qie", NOT: { address: "0" } },
      take: 40,
    });
    let snapshotted = 0;

    for (const token of tokens) {
      if (!config.useMockData) {
        const balances = await getTokenHolders(token.address, 25);
        if (!balances.length) continue;
        const total =
          balances.reduce((s, b) => s + BigInt(b.amount || "0"), 0n) || 1n;
        await prisma.holder.deleteMany({
          where: { tokenAddress: token.address },
        });
        for (const b of balances) {
          const bal = BigInt(b.amount || "0");
          const pct = Number((bal * 10000n) / total) / 100;
          await prisma.holder.create({
            data: {
              chain: "qie",
              tokenAddress: token.address,
              holderAddress: b.address,
              balance: new Prisma.Decimal(b.amount),
              pctOfSupply: new Prisma.Decimal(pct.toFixed(6)),
              snapshotTs: new Date(),
            },
          });
        }
        snapshotted++;
      }
    }

    await recordWorkerRun(
      "pollHolders",
      "success",
      run.id,
      `tokens=${snapshotted}`,
    );
  } catch (err) {
    await recordWorkerRun(
      "pollHolders",
      "error",
      run.id,
      undefined,
      (err as Error).message,
    );
    throw err;
  }
}
