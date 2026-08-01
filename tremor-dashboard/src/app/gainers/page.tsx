"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { internalFetch } from "@/lib/api";
import { PairTable, type PairRow } from "@/components/PairTable";
import { Card, ErrorBox, Loading, Badge } from "@/components/ui";
import { TrendingUp } from "lucide-react";

export default function GainersPage() {
  const { data, error, isLoading } = useSWR(
    "pools-gainers",
    () => internalFetch<PairRow[]>("/pools"),
    { refreshInterval: 12_000 },
  );

  const gainers = useMemo(
    () =>
      [...(data ?? [])]
        .filter((p) => p.change_24h_pct > 0)
        .sort((a, b) => b.change_24h_pct - a.change_24h_pct),
    [data],
  );
  const losers = useMemo(
    () =>
      [...(data ?? [])]
        .filter((p) => p.change_24h_pct < 0)
        .sort((a, b) => a.change_24h_pct - b.change_24h_pct),
    [data],
  );

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox message={String(error.message || error)} />;

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-0.5 inline-flex items-center gap-1 text-cs-green">
          <TrendingUp className="h-3 w-3" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em]">24h</span>
        </div>
        <h1 className="page-title">Gainers & losers</h1>
        <p className="page-sub">Ranked by price change</p>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-cs-border px-3 py-1.5">
            <h2 className="text-[11px] font-semibold text-cs-green">Gainers</h2>
            <Badge tone="green">{gainers.length}</Badge>
          </div>
          <PairTable rows={gainers} />
        </Card>
        <Card>
          <div className="flex items-center justify-between border-b border-cs-border px-3 py-1.5">
            <h2 className="text-[11px] font-semibold text-cs-red">Losers</h2>
            <Badge tone="red">{losers.length}</Badge>
          </div>
          <PairTable rows={losers} />
        </Card>
      </div>
    </div>
  );
}
