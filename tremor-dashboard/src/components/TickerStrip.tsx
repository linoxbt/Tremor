"use client";

import Link from "next/link";
import { fmtPrice, fmtPct, cn, tokenLabel } from "@/lib/utils";
import type { PairRow } from "@/components/PairTable";
import { TokenAvatar } from "@/components/ui";

export function TickerStrip({ rows }: { rows: PairRow[] }) {
  if (!rows.length) return null;
  const loop = [...rows, ...rows];
  return (
    <div className="relative overflow-hidden rounded-md border border-cs-border bg-cs-elevated">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-cs-elevated to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-cs-elevated to-transparent" />
      <div className="ticker-track py-1.5">
        {loop.map((p, i) => {
          const id = p.pool_address || p.pair_address || "";
          if (!id) return null;
          const up = p.change_24h_pct >= 0;
          const s0 = p.symbol0 || tokenLabel(p.token0);
          const s1 = p.symbol1 || tokenLabel(p.token1);
          return (
            <Link
              key={`${id}-${i}`}
              href={`/pair/${encodeURIComponent(id)}`}
              className="mx-0.5 inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] hover:bg-cs-hover"
            >
              <span className="relative inline-flex">
                <TokenAvatar symbol={s0} address={p.token0} size={14} />
                <span className="absolute -right-1 -bottom-0.5 rounded-full ring-1 ring-cs-elevated">
                  <TokenAvatar symbol={s1} address={p.token1} size={10} />
                </span>
              </span>
              <span className="ml-1 font-medium text-white">
                {s0}/{s1}
              </span>
              <span className="num text-cs-muted">{fmtPrice(p.price_usd)}</span>
              <span className={cn("num", up ? "text-cs-green" : "text-cs-red")}>
                {fmtPct(p.change_24h_pct)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
