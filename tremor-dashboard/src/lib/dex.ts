/** Qie DEX deep links (mainnet swap UI) */
const DEX_URLS: Record<string, string> = {
  "qie-dex": "https://www.swap.dex.qie.digital/swap",
  qiedex: "https://www.swap.dex.qie.digital/swap",
  "qie dex": "https://www.swap.dex.qie.digital/swap",
  tinyman: "https://www.swap.dex.qie.digital/swap",
  pact: "https://www.swap.dex.qie.digital/swap",
};

export function dexUrl(dex: string | null | undefined): string | null {
  if (!dex) return "https://www.swap.dex.qie.digital/swap";
  const key = dex.trim().toLowerCase();
  return DEX_URLS[key] ?? "https://www.swap.dex.qie.digital/swap";
}

export function dexLabel(dex: string): string {
  if (!dex) return "Qie DEX";
  const k = dex.toLowerCase();
  if (k.includes("qie") || k === "tinyman" || k === "pact") return "Qie DEX";
  return dex;
}
