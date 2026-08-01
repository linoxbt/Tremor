/**
 * Tremor sync workers (Algorand Mainnet/Testnet only).
 * Run separately: `npm run workers`
 */
import cron from "node-cron";
import { initRedis } from "../lib/redis.js";
import { pollPrices } from "./pollPrices.js";
import { pollNewPairs } from "./pollNewPairs.js";
import { pollHolders } from "./pollHolders.js";
import { pollRisk } from "./pollRisk.js";

async function safe(name: string, fn: () => Promise<void>) {
  try {
    console.log(`[worker] ${name} start`);
    await fn();
    console.log(`[worker] ${name} ok`);
  } catch (err) {
    console.error(`[worker] ${name} failed:`, (err as Error).message);
  }
}

async function main() {
  await initRedis();
  console.log("[workers] Tremor Algorand sync workers starting…");

  // Initial kick
  await safe("pollPrices", pollPrices);
  await safe("pollNewPairs", pollNewPairs);

  // every 15s — prices (cron doesn't support seconds in all versions; use setInterval)
  setInterval(() => void safe("pollPrices", pollPrices), 15_000);

  // every 5 min — new pairs
  cron.schedule("*/5 * * * *", () => void safe("pollNewPairs", pollNewPairs));

  // hourly — holders + risk
  cron.schedule("0 * * * *", () => void safe("pollHolders", pollHolders));
  cron.schedule("5 * * * *", () => void safe("pollRisk", pollRisk));

  console.log("[workers] schedules armed: prices@15s, newPairs@5m, holders@hourly, risk@hourly");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
