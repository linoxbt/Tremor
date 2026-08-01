import type { Response } from "express";

export type CacheStatus = "hit" | "miss" | "bypass";

export interface Meta {
  chain: string;
  generated_at: string;
  cache: CacheStatus;
}

export function ok<T>(
  res: Response,
  data: T,
  opts?: { chain?: string; cache?: CacheStatus; status?: number },
) {
  return res.status(opts?.status ?? 200).json({
    data,
    meta: {
      chain: opts?.chain ?? "qie",
      generated_at: new Date().toISOString(),
      cache: opts?.cache ?? "miss",
    } satisfies Meta,
  });
}

export function fail(
  res: Response,
  status: number,
  error: string,
  details?: unknown,
) {
  return res.status(status).json({
    error,
    details: details ?? null,
    meta: {
      chain: "qie",
      generated_at: new Date().toISOString(),
      cache: "bypass" as CacheStatus,
    },
  });
}

export function num(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}
