"use client";

import useSWR from "swr";
import { internalFetch } from "@/lib/api";
import { fmtUsd, timeAgo } from "@/lib/utils";
import {
  Badge,
  Card,
  CardHeader,
  ErrorBox,
  Loading,
  Stat,
} from "@/components/ui";

type Stats = {
  requests_today: number;
  revenue_usdc: { today: number; d7: number; d30: number };
  pools_tracked: number;
  tokens_tracked: number;
  workers: {
    worker: string;
    status: string;
    last_run: string | null;
    finished_at: string | null;
    error: string | null;
  }[];
};

export default function OpsOverviewPage() {
  const { data, error, isLoading, mutate } = useSWR(
    "ops-stats",
    () => internalFetch<Stats>("/stats"),
    { refreshInterval: 15_000 },
  );

  if (isLoading) return <Loading label="Loading ops…" />;
  if (error) return <ErrorBox message={String(error.message || error)} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cs-dim">
            Operator
          </p>
          <h1 className="font-display text-2xl font-semibold text-white">Overview</h1>
          <p className="text-sm text-cs-dim">
            API health, revenue ledger, worker status
          </p>
        </div>
        <button
          onClick={() => mutate()}
          className="rounded-lg border border-cs-border px-3 py-1.5 text-xs text-cs-muted hover:text-white"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Requests today" value={String(data.requests_today)} />
        <Stat
          label="Revenue today"
          value={fmtUsd(data.revenue_usdc.today, 4)}
          tone="green"
          hint="USDC via payments_log"
        />
        <Stat label="Revenue 7d" value={fmtUsd(data.revenue_usdc.d7, 4)} />
        <Stat label="Revenue 30d" value={fmtUsd(data.revenue_usdc.d30, 4)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Pools tracked" value={String(data.pools_tracked)} />
        <Stat label="Tokens tracked" value={String(data.tokens_tracked)} />
      </div>

      <Card>
        <CardHeader title="Sync workers" subtitle="Last run per poller" />
        <div className="overflow-x-auto">
          <table className="market-table">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Status</th>
                <th>Last run</th>
                <th>Finished</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {data.workers.map((w) => (
                <tr key={w.worker} className="!cursor-default">
                  <td className="font-medium text-cs-accent">{w.worker}</td>
                  <td>
                    <Badge
                      tone={
                        w.status === "success"
                          ? "green"
                          : w.status === "error"
                            ? "red"
                            : "amber"
                      }
                    >
                      {w.status}
                    </Badge>
                  </td>
                  <td className="num text-cs-dim">{timeAgo(w.last_run)}</td>
                  <td className="num text-cs-dim">{timeAgo(w.finished_at)}</td>
                  <td className="max-w-xs truncate text-cs-red">{w.error || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
