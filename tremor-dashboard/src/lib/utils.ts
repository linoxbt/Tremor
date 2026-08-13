import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtUsd(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  if (abs > 0 && abs < 0.0001) return `$${n.toExponential(2)}`;
  if (abs < 1) return `$${n.toFixed(Math.min(6, digits + 2))}`;
  return `$${n.toFixed(digits)}`;
}

export function fmtPrice(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (abs >= 1) return `$${n.toFixed(4)}`;
  if (abs >= 0.0001) return `$${n.toFixed(6)}`;
  if (abs === 0) return "$0.00";
  return `$${n.toExponential(3)}`;
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

export function shortAddr(addr: string, left = 6, right = 4): string {
  if (!addr) return "—";
  if (addr.length <= left + right + 1) return addr;
  return `${addr.slice(0, left)}…${addr.slice(-right)}`;
}

/**
 * Symbol for a token address. `map` is a per-call symbol lookup built from
 * live API data (e.g. { [address]: symbol }) — there's no static fallback
 * table here since Qie addresses are 0x hex, not small integers that could
 * ever plausibly collide with a hardcoded list.
 */
export function tokenLabel(id: string, map?: Record<string, string>): string {
  if (map?.[id]) return map[id];
  return shortAddr(id, 4, 3);
}
