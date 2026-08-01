import { prisma } from "../lib/db.js";
import { config } from "../lib/config.js";
import { getAsset, analyzeAssetRisk } from "../lib/algorand.js";
import { num } from "../lib/envelope.js";
import { recordWorkerRun } from "./util.js";

/**
 * Hourly: recompute risk_flags (LP lock heuristic, mint authority, concentration).
 */
export async function pollRisk(): Promise<void> {
  const run = await recordWorkerRun("pollRisk", "running");
  try {
    const tokens = await prisma.token.findMany({
      where: { chain: "qie", NOT: { address: "0" } },
    });
    let flagged = 0;

    for (const token of tokens) {
      // Deactivate old auto flags; keep manually seeded ones that we re-upsert
      await prisma.riskFlag.updateMany({
        where: { tokenAddress: token.address, flagType: { in: ["mint_authority", "holder_concentration", "ownership_active"] } },
        data: { active: false },
      });

      if (!config.useMockData) {
        const asset = await getAsset(token.address);
        if (asset) {
          const risk = analyzeAssetRisk(asset);
          if (risk.mintAuthorityPresent) {
            await prisma.riskFlag.create({
              data: {
                tokenAddress: token.address,
                flagType: "mint_authority",
                severity: "high",
                detailsJson: {
                  manager: asset.params.manager,
                  freeze: asset.params.freeze,
                  clawback: asset.params.clawback,
                },
              },
            });
            flagged++;
          }
          if (!risk.ownershipRenounced) {
            await prisma.riskFlag.create({
              data: {
                tokenAddress: token.address,
                flagType: "ownership_active",
                severity: "medium",
                detailsJson: { manager: asset.params.manager },
              },
            });
            flagged++;
          }
        }
      }

      const holders = await prisma.holder.findMany({
        where: { tokenAddress: token.address },
        orderBy: { pctOfSupply: "desc" },
        take: 10,
      });
      const top10 = holders.reduce((s, h) => s + num(h.pctOfSupply), 0);
      if (top10 >= 50) {
        await prisma.riskFlag.create({
          data: {
            tokenAddress: token.address,
            flagType: "holder_concentration",
            severity: top10 >= 70 ? "high" : "medium",
            detailsJson: { top10Pct: top10 },
          },
        });
        flagged++;
      }
    }

    await recordWorkerRun("pollRisk", "success", run.id, `flags_written=${flagged}`);
  } catch (err) {
    await recordWorkerRun("pollRisk", "error", run.id, undefined, (err as Error).message);
    throw err;
  }
}
