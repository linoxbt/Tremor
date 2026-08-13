"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState } from "react";
import { internalFetch } from "@/lib/api";
import { PairTable, type PairRow } from "@/components/PairTable";
import { TickerStrip } from "@/components/TickerStrip";
import {
  Badge,
  Card,
  ErrorBox,
  Loading,
  SectionLabel,
  TabBar,
  TokenAvatar,
} from "@/components/ui";
import { DexLink } from "@/components/DexLink";
import { fmtUsd, fmtPct, tokenLabel, cn } from "@/lib/utils";
import { Flame, Sparkles, TrendingUp } from "lucide-react";

type Stats = {
  pools_tracked: number;
  tokens_tracked: number;
};

export default function MarketsHome() {
  const { data: pools, error, isLoading } = useSWR(
    "pools",
    () => internalFetch<PairRow[]>("/pools"),
    { refreshInterval: 12_000 },
  );
  const { data: stats } = useSWR("stats-lite", () => internalFetch<Stats>("/stats"), {
    refreshInterval: 30_000,
  });
  const { data: tokens } = useSWR(
    "tokens-home",
    () =>
      internalFetch<
        {
          address: string;
          symbol: string;
          name: string;
          top10_pct: number;
          rug_score: number;
        }[]
      >("/tokens"),
    { refreshInterval: 45_000 },
  );

  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let list = pools ?? [];
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) => {
        const id = p.pool_address || p.pair_address || "";
        return (
          id.toLowerCase().includes(s) ||
          p.dex.includes(s) ||
          p.token0.includes(s) ||
          p.token1.includes(s) ||
          (p.symbol0 || tokenLabel(p.token0)).toLowerCase().includes(s) ||
          (p.symbol1 || tokenLabel(p.token1)).toLowerCase().includes(s)
        );
      });
    }
    if (tab === "gainers") list = list.filter((p) => p.change_24h_pct > 0);
    if (tab === "losers") list = list.filter((p) => p.change_24h_pct < 0);
    if (tab === "liquid") list = [...list].sort((a, b) => b.liquidity_usd - a.liquidity_usd);
    return list;
  }, [pools, q, tab]);

  const hot = useMemo(
    () =>
      [...(pools ?? [])]
        .sort((a, b) => Math.abs(b.change_24h_pct) - Math.abs(a.change_24h_pct))
        .slice(0, 4),
    [pools],
  );

  const totalVol = (pools ?? []).reduce((s, p) => s + (p.volume_24h || 0), 0);
  const totalLiq = (pools ?? []).reduce((s, p) => s + (p.liquidity_usd || 0), 0);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox message={String(error.message || error)} />;

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-lg border border-cs-border bg-cs-elevated">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 12% 20%, rgba(255,107,44,0.14), transparent 55%)",
          }}
        />
        <div className="relative grid gap-4 p-3 md:grid-cols-[1.3fr_1fr] md:p-4">
          <div>
            <Badge tone="accent" className="mb-2">
              Qie Mainnet
            </Badge>
            <h1 className="text-[20px] font-semibold tracking-tight text-white sm:text-[22px]">
              Markets{" "}
              <span className="text-cs-muted font-normal">· live pairs & risk</span>
            </h1>
            <p className="mt-1 max-w-md text-[11px] leading-relaxed text-cs-dim">
              Dense terminal for Qie Mainnet DEX. Every public datapoint is also a
              metered x402 endpoint.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Link
                href="/trending"
                className="inline-flex h-7 items-center gap-1 rounded-md bg-cs-accent px-2.5 text-[11px] font-semibold text-white"
              >
                <Flame className="h-3 w-3" /> Trending
              </Link>
              <Link
                href="/tokens"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-cs-border bg-cs-card px-2.5 text-[11px] text-cs-muted hover:text-white"
              >
                All tokens
              </Link>
              <Link
                href="/new-pairs"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-cs-border px-2.5 text-[11px] text-cs-muted"
              >
                <Sparkles className="h-3 w-3" /> New
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 content-end">
            <Metric label="24h volume" value={fmtUsd(totalVol)} />
            <Metric label="Liquidity" value={fmtUsd(totalLiq)} />
            <Metric label="Pairs" value={String(stats?.pools_tracked ?? pools?.length ?? "—")} />
            <Metric label="Tokens" value={String(stats?.tokens_tracked ?? tokens?.length ?? "—")} />
          </div>
        </div>
      </section>

      <TickerStrip rows={pools ?? []} />

      <section>
        <SectionLabel>Pulse</SectionLabel>
        <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-4">
          {hot.map((p) => {
            const id = p.pool_address || p.pair_address || "";
            if (!id) return null;
            const s0 = p.symbol0 || tokenLabel(p.token0);
            const s1 = p.symbol1 || tokenLabel(p.token1);
            const up = p.change_24h_pct >= 0;
            return (
              <Link key={id} href={`/pair/${encodeURIComponent(id)}`}>
                <Card className="p-2 transition hover:border-cs-accent/40">
                  <div className="flex items-center gap-1.5">
                    <TokenAvatar symbol={s0} address={p.token0} size={22} />
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-white">
                        {s0}/{s1}
                      </div>
                      <div className="mt-0.5">
                        <DexLink dex={p.dex} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span
                      className={cn(
                        "num text-[13px] font-semibold",
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
      </section>

      <section>
        <Card>
          <div className="flex flex-col border-b border-cs-border sm:flex-row sm:items-center sm:justify-between">
            <TabBar
              tabs={[
                { id: "all", label: "All", count: pools?.length },
                { id: "gainers", label: "Gainers" },
                { id: "losers", label: "Losers" },
                { id: "liquid", label: "Liquid" },
              ]}
              active={tab}
              onChange={setTab}
            />
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter…"
                className="h-6 w-full rounded border border-cs-border bg-cs-bg px-2 text-[10px] text-white placeholder:text-cs-dim sm:w-40"
              />
              <span className="hidden items-center gap-0.5 text-[9px] text-cs-dim sm:inline-flex">
                <TrendingUp className="h-2.5 w-2.5" /> 12s
              </span>
            </div>
          </div>
          <PairTable rows={filtered} />
        </Card>
      </section>

      {tokens?.length ? (
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <SectionLabel>Tokens</SectionLabel>
            <Link href="/tokens" className="text-[10px] text-cs-accent hover:underline">
              View all {tokens.length} →
            </Link>
          </div>
          <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-4">
            {[...tokens]
              .sort((a, b) => a.symbol.localeCompare(b.symbol))
              .slice(0, 8)
              .map((t) => (
                <Link key={t.address} href={`/token/${encodeURIComponent(t.address)}`}>
                  <Card className="flex items-center gap-2 p-2 transition hover:border-cs-accent/30">
                    <TokenAvatar symbol={t.symbol} address={t.address} size={24} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-white">{t.symbol}</div>
                      <div className="truncate text-[9px] text-cs-dim">{t.name}</div>
                    </div>
                    <div
                      className={cn(
                        "num text-[11px] font-semibold",
                        t.rug_score >= 70
                          ? "text-cs-red"
                          : t.rug_score >= 40
                            ? "text-cs-amber"
                            : "text-cs-green",
                      )}
                    >
                      {t.rug_score}
                    </div>
                  </Card>
                </Link>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-cs-border bg-black/25 px-2.5 py-2">
      <div className="text-[9px] font-medium uppercase tracking-wider text-cs-dim">{label}</div>
      <div className="num mt-0.5 text-[14px] font-semibold text-white">{value}</div>
    </div>
  );
}
