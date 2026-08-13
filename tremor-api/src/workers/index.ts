/**
 * Tremor sync workers (Qie Mainnet/Testnet only).
 * Run separately: `npm run workers`
 */
import cron from "node-cron";
import { initRedis } from "../lib/redis.js";
import { pollPrices } from "./pollPrices.js";
import { pollNewPairs } from "./pollNewPairs.js";
import { pollHolders } from "./pollHolders.js";
import { pollRisk } from "./pollRisk.js";
import { pollWatches } from "./pollWatches.js";

async function safe(name: string, fn: () => Promise<void>) {
  try {
    console.log(`[worker] ${name} start`);
    await fn();
    console.log(`[worker] ${name} ok`);
  } catch (err) {
    console.error(`[worker] ${name} failed:`, (err as Error).message);
  }
}

/**
 * Tracks an in-flight flag per job so a slow run (DB latency, RPC hiccup,
 * etc) can't overlap with the next scheduled tick — overlapping runs would
 * otherwise double up writes and contend for the same DB rows right when
 * the DB is already under load.
 */
function guarded(name: string, fn: () => Promise<void>): () => void {
  let running = false;
  return () => {
    if (running) {
      console.warn(`[worker] ${name} still running from a previous tick — skipping`);
      return;
    }
    running = true;
    void safe(name, fn).finally(() => {
      running = false;
    });
  };
}

async function main() {
  await initRedis();
  console.log("[workers] Tremor Qie sync workers starting…");

  // Initial kick
  await safe("pollPrices", pollPrices);
  await safe("pollNewPairs", pollNewPairs);

  // every 15s — prices (cron doesn't support seconds in all versions; use setInterval)
  setInterval(guarded("pollPrices", pollPrices), 15_000);

  // every 5 min — new pairs, active watch webhooks
  cron.schedule("*/5 * * * *", guarded("pollNewPairs", pollNewPairs));
  cron.schedule("*/5 * * * *", guarded("pollWatches", pollWatches));

  // hourly — holders + risk
  cron.schedule("0 * * * *", guarded("pollHolders", pollHolders));
  cron.schedule("5 * * * *", guarded("pollRisk", pollRisk));

  console.log(
    "[workers] schedules armed: prices@15s, newPairs@5m, watches@5m, holders@hourly, risk@hourly",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
