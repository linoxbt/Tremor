"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { internalFetch } from "@/lib/api";
import { Badge, Card, ErrorBox, Loading, TokenAvatar } from "@/components/ui";
import { shortAddr, cn } from "@/lib/utils";
import { Coins } from "lucide-react";

type TokenRow = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  top10_pct: number;
  rug_score: number;
};

function TokensInner() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const [sort, setSort] = useState<"risk" | "name" | "concentration">("name");
  const [view, setView] = useState<"table" | "cards">("table");

  const { data, error, isLoading } = useSWR(
    "tokens-all",
    () => internalFetch<TokenRow[]>("/tokens"),
    { refreshInterval: 30_000 },
  );

  const rows = useMemo(() => {
    let list = data ?? [];
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (t) =>
          t.symbol.toLowerCase().includes(s) ||
          t.name.toLowerCase().includes(s) ||
          t.address.includes(s),
      );
    }
    return [...list].sort((a, b) => {
      if (sort === "risk") return b.rug_score - a.rug_score;
      if (sort === "concentration") return b.top10_pct - a.top10_pct;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [data, q, sort]);

  if (isLoading) return <Loading label="Loading tokens…" />;
  if (error) return <ErrorBox message={String(error.message || error)} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="mb-0.5 inline-flex items-center gap-1 text-cs-accent">
            <Coins className="h-3 w-3" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em]">Assets</span>
          </div>
          <h1 className="page-title">All tokens</h1>
          <p className="page-sub">{rows.length} ASAs tracked · click any row for full page</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter…"
            className="h-7 w-36 rounded-md border border-cs-border bg-cs-elevated px-2 text-[11px] text-white placeholder:text-cs-dim"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-7 rounded-md border border-cs-border bg-cs-elevated px-2 text-[10px] text-cs-muted"
          >
            <option value="name">Symbol</option>
            <option value="risk">Rug score</option>
            <option value="concentration">Top10 %</option>
          </select>
          <div className="flex rounded-md border border-cs-border p-0.5">
            {(["table", "cards"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] capitalize",
                  view === v ? "bg-cs-hover text-white" : "text-cs-dim",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "table" ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="market-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Token</th>
                  <th>Address</th>
                  <th className="text-right">Decimals</th>
                  <th className="text-right">Top10 %</th>
                  <th className="text-right">Rug</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t, i) => {
                  const tone =
                    t.rug_score >= 70 ? "red" : t.rug_score >= 40 ? "amber" : "green";
                  return (
                    <tr key={t.address}>
                      <td className="num text-cs-dim">{i + 1}</td>
                      <td>
                        <Link
                          href={`/token/${encodeURIComponent(t.address)}`}
                          className="flex items-center gap-2 group"
                        >
                          <TokenAvatar symbol={t.symbol} address={t.address} size={22} />
                          <div>
                            <div className="text-[11px] font-semibold text-white group-hover:text-cs-accent">
                              {t.symbol}
                            </div>
                            <div className="max-w-[140px] truncate text-[9px] text-cs-dim">
                              {t.name}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="num text-cs-dim">{t.address}</td>
                      <td className="num text-right text-cs-muted">{t.decimals}</td>
                      <td className="num text-right text-white">{t.top10_pct.toFixed(1)}%</td>
                      <td
                        className={cn(
                          "num text-right font-semibold",
                          tone === "red"
                            ? "text-cs-red"
                            : tone === "amber"
                              ? "text-cs-amber"
                              : "text-cs-green",
                        )}
                      >
                        {t.rug_score}
                      </td>
                      <td>
                        <Badge tone={tone}>
                          {tone === "red" ? "high" : tone === "amber" ? "med" : "low"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((t) => {
            const tone =
              t.rug_score >= 70 ? "red" : t.rug_score >= 40 ? "amber" : "green";
            return (
              <Link key={t.address} href={`/token/${encodeURIComponent(t.address)}`}>
                <Card className="p-2.5 transition hover:border-cs-accent/35">
                  <div className="flex items-center gap-2">
                    <TokenAvatar symbol={t.symbol} address={t.address} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] font-semibold text-white">{t.symbol}</span>
                        <Badge tone={tone}>{t.rug_score}</Badge>
                      </div>
                      <div className="truncate text-[10px] text-cs-dim">{t.name}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-cs-border pt-2 text-[10px]">
                    <span className="text-cs-dim">Top10 {t.top10_pct.toFixed(1)}%</span>
                    <span className="num text-cs-muted">{shortAddr(t.address, 5, 3)}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TokensPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TokensInner />
    </Suspense>
  );
}
