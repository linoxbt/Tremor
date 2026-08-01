"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { loadWatchlist, toggleWatch, type WatchItem } from "@/lib/watchlist";
import { TokenAvatar } from "@/components/ui";
import { shortAddr } from "@/lib/utils";

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([]);

  useEffect(() => {
    function refresh() {
      setItems(loadWatchlist());
    }
    refresh();
    window.addEventListener("tremor-watchlist", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("tremor-watchlist", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight text-white">
          Watchlist
        </h1>
        <p className="mt-0.5 text-[11px] text-cs-dim">
          Starred tokens and pairs are saved in this browser.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-cs-border bg-cs-elevated px-4 py-16 text-center">
          <Star className="h-8 w-8 text-cs-dim" />
          <p className="text-[12px] text-cs-muted">
            Your watchlist is empty. Star any token or pair from a detail page
            or the markets table.
          </p>
          <Link
            href="/"
            className="rounded-md bg-cs-accent px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            Browse markets
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-cs-border">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-cs-elevated text-[10px] uppercase tracking-wide text-cs-dim">
              <tr>
                <th className="px-3 py-2 font-medium"> </th>
                <th className="px-3 py-2 font-medium">Asset</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Address</th>
                <th className="px-3 py-2 font-medium text-right">Added</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const href =
                  item.kind === "token"
                    ? `/token/${encodeURIComponent(item.address)}`
                    : `/pair/${encodeURIComponent(item.address)}`;
                const label =
                  item.kind === "pair" && item.quote
                    ? `${item.symbol}/${item.quote}`
                    : item.symbol;
                return (
                  <tr
                    key={`${item.kind}-${item.address}`}
                    className="border-t border-cs-border hover:bg-cs-hover/50"
                  >
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-cs-accent"
                        onClick={() => {
                          toggleWatch(item);
                          setItems(loadWatchlist());
                        }}
                      >
                        <Star className="h-3.5 w-3.5" fill="currentColor" />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={href}
                        className="inline-flex items-center gap-2 font-semibold text-white hover:text-cs-accent"
                      >
                        <TokenAvatar
                          symbol={item.symbol}
                          address={item.address}
                          size={22}
                        />
                        {label}
                        {item.name ? (
                          <span className="font-normal text-cs-dim">
                            {item.name}
                          </span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-3 py-2 capitalize text-cs-muted">
                      {item.kind}
                    </td>
                    <td className="num px-3 py-2 text-cs-dim">
                      {shortAddr(item.address, 6, 4)}
                    </td>
                    <td className="px-3 py-2 text-right text-cs-dim">
                      {new Date(item.addedAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
