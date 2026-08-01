/** Official DEX app URLs (Algorand) */
const DEX_URLS: Record<string, string> = {
  tinyman: "https://app.tinyman.org/",
  pact: "https://app.pact.fi/",
  "pact.fi": "https://app.pact.fi/",
  vestige: "https://vestige.fi/",
  ultratrade: "https://app.ultratrade.app/",
  algofi: "https://app.algofi.org/",
};

export function dexUrl(dex: string | null | undefined): string | null {
  if (!dex) return null;
  const key = dex.trim().toLowerCase();
  return DEX_URLS[key] ?? null;
}

export function dexLabel(dex: string): string {
  return dex;
}
