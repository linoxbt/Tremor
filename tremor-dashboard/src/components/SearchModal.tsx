"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { internalFetch } from "@/lib/api";
import { TokenAvatar } from "@/components/ui";
import { DexLink } from "@/components/DexLink";
import { shortAddr, tokenLabel, cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

type SearchResult = {
  query: string;
  tokens: {
    chain: string;
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  }[];
  pairs: {
    chain: string;
    pair_address: string;
    dex: string;
    token0: string;
    token1: string;
  }[];
};

export function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const router = useRouter();

  // Debounce so a fast typist doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data } = useSWR(
    open && debouncedQ.trim().length >= 1 ? `search:${debouncedQ}` : null,
    () => internalFetch<SearchResult>(`/search?q=${encodeURIComponent(debouncedQ.trim())}`),
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!open) {
      setQ("");
      setDebouncedQ("");
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-cs-border bg-cs-elevated shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3 border-b border-cs-border px-4">
          <Search className="h-4 w-4 text-cs-dim" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tokens, pairs, addresses…"
            className="h-14 flex-1 bg-transparent text-[15px] text-white placeholder:text-cs-dim focus:outline-none focus:shadow-none"
          />
          <button onClick={onClose} className="rounded-md p-1.5 text-cs-dim hover:bg-cs-hover hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {!q.trim() ? (
            <p className="px-3 py-8 text-center text-sm text-cs-dim">
              Type a symbol, name, or token address
            </p>
          ) : (
            <>
              {data?.tokens?.length ? (
                <div className="mb-2">
                  <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-cs-dim">
                    Tokens
                  </div>
                  {data.tokens.map((t) => (
                    <button
                      key={t.address}
                      onClick={() => go(`/token/${encodeURIComponent(t.address)}`)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-cs-hover",
                      )}
                    >
                      <TokenAvatar symbol={t.symbol} address={t.address} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white">{t.symbol}</div>
                        <div className="truncate text-xs text-cs-dim">{t.name}</div>
                      </div>
                      <span className="num text-[11px] text-cs-dim">{shortAddr(t.address)}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {data?.pairs?.length ? (
                <div>
                  <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-cs-dim">
                    Pairs
                  </div>
                  {data.pairs.map((p) => {
                    const id = p.pair_address || (p as { pool_address?: string }).pool_address || "";
                    if (!id) return null;
                    return (
                    <button
                      key={id}
                      onClick={() => go(`/pair/${encodeURIComponent(id)}`)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-cs-hover"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cs-hover text-xs text-cs-accent">
                        /
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="num text-sm text-white">{shortAddr(id, 10, 6)}</div>
                        <div className="text-xs text-cs-dim">
                          {tokenLabel(p.token0)}/{tokenLabel(p.token1)}
                        </div>
                      </div>
                      <DexLink dex={p.dex} />
                    </button>
                    );
                  })}
                </div>
              ) : null}

              {data && !data.tokens?.length && !data.pairs?.length ? (
                <p className="px-3 py-8 text-center text-sm text-cs-dim">No results for “{q}”</p>
              ) : null}
            </>
          )}
        </div>

        <div className="border-t border-cs-border px-4 py-2 text-[11px] text-cs-dim">
          <kbd className="rounded border border-cs-border bg-cs-card px-1">esc</kbd> to close ·{" "}
          Qie market data via Tremor API
        </div>
      </div>
    </div>
  );
}
