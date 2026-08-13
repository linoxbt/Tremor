/** Qie DEX deep links (mainnet swap UI) */
const DEX_URLS: Record<string, string> = {
  "qie-dex": "https://www.swap.dex.qie.digital/swap",
  qiedex: "https://www.swap.dex.qie.digital/swap",
  "qie dex": "https://www.swap.dex.qie.digital/swap",
};

/** Null for an unrecognized DEX — callers should show the raw name, not silently point everything at Qie's swap UI. */
export function dexUrl(dex: string | null | undefined): string | null {
  if (!dex) return null;
  const key = dex.trim().toLowerCase();
  return DEX_URLS[key] ?? null;
}

export function dexLabel(dex: string): string {
  if (!dex) return "Unknown DEX";
  const k = dex.toLowerCase();
  if (k.includes("qie")) return "Qie DEX";
  return dex;
}
