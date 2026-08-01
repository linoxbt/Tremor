import { Redis } from "ioredis";
import { config } from "./config.js";

let redis: Redis | null = null;
let redisAvailable = false;
let initPromise: Promise<void> | null = null;

export async function initRedis(): Promise<boolean> {
  if (initPromise) return initPromise.then(() => redisAvailable);
  initPromise = (async () => {
    try {
      const client = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 3000,
      });
      client.on("error", () => {
        /* suppress noisy reconnect spam when redis is down */
      });
      await client.connect();
      await client.ping();
      redis = client;
      redisAvailable = true;
      console.log("[redis] connected");
    } catch (err) {
      console.warn(
        "[redis] unavailable — using Postgres-only cache path",
        (err as Error).message,
      );
      redis = null;
      redisAvailable = false;
    }
  })();
  return initPromise.then(() => redisAvailable);
}

export function getRedis(): Redis | null {
  return redisAvailable ? redis : null;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    /* ignore */
  }
}

export async function cacheDel(pattern: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    const keys = await r.keys(pattern);
    if (keys.length) await r.del(...keys);
  } catch {
    /* ignore */
  }
}
