"use client";

import useSWR from "swr";
import Link from "next/link";
import { internalFetch } from "@/lib/api";
import { PairTable, type PairRow } from "@/components/PairTable";
import { Badge, Card, ErrorBox, Loading, SectionLabel, TokenAvatar } from "@/components/ui";
import { DexLink } from "@/components/DexLink";
import { fmtPct, fmtUsd, tokenLabel, cn } from "@/lib/utils";
import { Flame } from "lucide-react";

type TrendingPayload = {
  trending: { trending: PairRow[] };
  new_pairs: { pairs: (PairRow & { created_at: string })[] };
};

export default function TrendingPage() {
  const { data, error, isLoading } = useSWR(
    "trending-full",
    () => internalFetch<TrendingPayload>("/trending"),
    { refreshInterval: 12_000 },
  );

  if (isLoading) return <Loading label="Loading movers…" />;
  if (error) return <ErrorBox message={String(error.message || error)} />;
  if (!data) return null;

  const movers = data.trending?.trending ?? [];
  const top3 = movers.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="mb-0.5 inline-flex items-center gap-1 text-cs-accent">
            <Flame className="h-3 w-3" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em]">Live</span>
          </div>
          <h1 className="page-title">Trending</h1>
          <p className="page-sub">Top pairs by volume · 12s refresh</p>
        </div>
        <Badge tone="green">synced {new Date().toLocaleTimeString()}</Badge>
      </div>

      <SectionLabel>Top 3</SectionLabel>
      <div className="grid gap-1.5 md:grid-cols-3">
        {top3.map((p, i) => {
          const id = p.pool_address || p.pair_address || "";
          if (!id) return null;
          const s0 = p.symbol0 || tokenLabel(p.token0);
          const s1 = p.symbol1 || tokenLabel(p.token1);
          const up = p.change_24h_pct >= 0;
          return (
            <Link key={id} href={`/pair/${encodeURIComponent(id)}`}>
              <Card accent={i === 0} className="p-2.5 transition hover:border-cs-accent/40">
                <div className="flex items-center gap-2">
                  <TokenAvatar symbol={s0} address={p.token0} size={28} />
                  <div>
                    <div className="text-[12px] font-semibold text-white">
                      {s0}/{s1}
                    </div>
                    <DexLink dex={p.dex} />
                  </div>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <span
                    className={cn(
                      "num text-[16px] font-semibold",
                      up ? "text-cs-green" : "text-cs-red",
                    )}
                  >
                    {fmtPct(p.change_24h_pct)}
                  </span>
                  <span className="num text-[10px] text-cs-dim">{fmtUsd(p.volume_24h)}</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <div className="border-b border-cs-border px-3 py-2">
          <h2 className="text-[12px] font-semibold text-white">Full ranking</h2>
        </div>
        <PairTable rows={movers} />
      </Card>
    </div>
  );
}
