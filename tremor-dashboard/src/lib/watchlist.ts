"use client";

export type WatchItem = {
  kind: "token" | "pair";
  address: string;
  symbol: string;
  quote?: string;
  name?: string;
  addedAt: number;
};

const KEY = "tremor-watchlist-v1";

export function loadWatchlist(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(items: WatchItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("tremor-watchlist"));
}

export function isWatched(kind: WatchItem["kind"], address: string): boolean {
  return loadWatchlist().some(
    (w) => w.kind === kind && w.address.toLowerCase() === address.toLowerCase(),
  );
}

export function toggleWatch(item: Omit<WatchItem, "addedAt">): WatchItem[] {
  const list = loadWatchlist();
  const idx = list.findIndex(
    (w) =>
      w.kind === item.kind &&
      w.address.toLowerCase() === item.address.toLowerCase(),
  );
  let next: WatchItem[];
  if (idx >= 0) {
    next = list.filter((_, i) => i !== idx);
  } else {
    next = [{ ...item, addedAt: Date.now() }, ...list].slice(0, 100);
  }
  saveWatchlist(next);
  return next;
}
