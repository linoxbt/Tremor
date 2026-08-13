import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { prisma } from "../lib/db.js";
import { recordWorkerRun } from "./util.js";
import * as market from "../services/market.js";
import type { WatchEndpoint } from "../services/market.js";

const ENDPOINT_FETCHERS: Record<
  WatchEndpoint,
  (chain: string, address: string) => Promise<{ data: unknown }>
> = {
  price: (chain, addr) => market.getTokenPrice(chain, addr),
  "rug-score": (chain, addr) => market.getRugScore(chain, addr),
  holders: (chain, addr) => market.getHolders(chain, addr),
  pools: (chain, addr) => market.getTokenPools(chain, addr),
  "volume-profile": (chain, addr) => market.getVolumeProfile(chain, addr),
  "whale-activity": (chain, addr) => market.getWhaleActivity(chain, addr),
};

function isPrivateOrReservedIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    return false;
  }
  return true; // not a resolvable IP at all — treat as unsafe
}

/**
 * Webhook URLs are user-supplied at watch-creation time (POST /v1/watch), and
 * this worker is what actually fetch()es them on a schedule — resolve the
 * hostname and refuse loopback/private/link-local targets so a watch can't be
 * used to reach internal services (Redis, Postgres, cloud metadata endpoints, etc).
 */
async function isSafeWebhookUrl(urlStr: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
  try {
    const { address } = await lookup(hostname);
    return !isPrivateOrReservedIp(address);
  } catch {
    return false;
  }
}

/**
 * Fires each active Watch's webhook with fresh data for its configured
 * endpoints. Previously POST /v1/watch only ever inserted a row and nothing
 * ever read it back — this worker is what makes the (paid) feature real.
 */
export async function pollWatches(): Promise<void> {
  const run = await recordWorkerRun("pollWatches", "running");
  try {
    const watches = await prisma.watch.findMany({
      where: { active: true, webhookUrl: { not: null } },
    });

    let fired = 0;
    let failed = 0;
    let blocked = 0;

    for (const w of watches) {
      const webhookUrl = w.webhookUrl;
      if (!webhookUrl) continue;

      if (!(await isSafeWebhookUrl(webhookUrl))) {
        blocked++;
        await prisma.watch.update({ where: { id: w.id }, data: { active: false } });
        continue;
      }

      try {
        const results: Record<string, unknown> = {};
        for (const ep of w.endpoints) {
          const fetcher = ENDPOINT_FETCHERS[ep as WatchEndpoint];
          if (!fetcher) continue;
          const res = await fetcher(w.chain, w.targetAddress);
          results[ep] = res.data;
        }

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            watch_id: w.id,
            chain: w.chain,
            target_type: w.targetType,
            target_address: w.targetAddress,
            data: results,
            fired_at: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) fired++;
        else failed++;
      } catch {
        failed++;
      }

      await prisma.watch.update({ where: { id: w.id }, data: { lastFiredAt: new Date() } });
    }

    await recordWorkerRun(
      "pollWatches",
      "success",
      run.id,
      `fired=${fired} failed=${failed} blocked_unsafe=${blocked} total=${watches.length}`,
    );
  } catch (err) {
    await recordWorkerRun("pollWatches", "error", run.id, undefined, (err as Error).message);
    throw err;
  }
}
