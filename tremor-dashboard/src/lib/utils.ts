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

export function fmtNum(n: number | null | undefined, digits = 4): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(digits);
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

const KNOWN: Record<string, string> = {
  "0": "ALGO",
  "31566704": "USDC",
  "312769": "USDT",
  "386192725": "goBTC",
  "386195940": "goETH",
  "27165954": "PLANET",
  "137594422": "HDL",
  "287867876": "OPUL",
  "226701642": "YLDY",
  "300208676": "SMILE",
  "470842789": "DEFLY",
  "511484048": "GORA",
  "403499324": "GARD",
  "465865291": "STBL",
  "700965019": "VEST",
  "1138500612": "TINY",
  "1096015467": "FOLKS",
  "987346050": "CHIP",
  "793124631": "ZONE",
  "444035862": "CHOICE",
  "796425061": "COOP",
  "688408515": "TAMO",
  "1241944285": "XET",
};

export function tokenLabel(id: string, map?: Record<string, string>): string {
  if (map?.[id]) return map[id];
  if (KNOWN[id]) return KNOWN[id];
  return shortAddr(id, 4, 3);
}

/** Deterministic pastel-ish chip color from string */
export function avatarHue(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 48%)`;
}
