"use client";

import useSWR from "swr";
import { internalFetch } from "@/lib/api";
import { PairTable, type PairRow } from "@/components/PairTable";
import { Badge, Card, ErrorBox, Loading } from "@/components/ui";
import { Sparkles } from "lucide-react";

type TrendingPayload = {
  new_pairs: { pairs: (PairRow & { created_at: string })[] };
};

export default function NewPairsPage() {
  const { data, error, isLoading } = useSWR(
    "new-pairs-page",
    () => internalFetch<TrendingPayload>("/trending"),
    { refreshInterval: 15_000 },
  );

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox message={String(error.message || error)} />;

  const pairs = data?.new_pairs?.pairs ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="mb-0.5 inline-flex items-center gap-1 text-cs-accent">
            <Sparkles className="h-3 w-3" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em]">
              Discovery
            </span>
          </div>
          <h1 className="page-title">New pairs</h1>
          <p className="page-sub">Recently created / discovered pools</p>
        </div>
        <Badge tone="accent">{pairs.length}</Badge>
      </div>
      <Card>
        <PairTable rows={pairs} showAge />
      </Card>
    </div>
  );
}
