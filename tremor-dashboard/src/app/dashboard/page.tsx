"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { internalFetch } from "@/lib/api";
import { Badge, Card, ErrorBox, Loading } from "@/components/ui";
import { ExplorerAccountLink, ExplorerTxLink } from "@/components/ExplorerLink";
import { fmtUsd, timeAgo, cn } from "@/lib/utils";
import {
  Activity,
  ArrowUpRight,
  DollarSign,
  Hash,
  LayoutDashboard,
  Radio,
  RefreshCw,
  Server,
  Wallet,
  Zap,
} from "lucide-react";

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

type Revenue = {
  days: number;
  by_endpoint: { endpoint: string; calls: number; revenue_usdc: number }[];
  by_day: { date: string; calls: number; revenue_usdc: number }[];
};

type Payment = {
  id: string;
  request_id: string;
  endpoint: string;
  payer: string | null;
  amount: string;
  tx_id: string | null;
  ts: string;
};

const ENDPOINT_COLORS = [
  "#ff6b2c",
  "#5b9dff",
  "#3dd68c",
  "#f5b942",
  "#c084fc",
  "#22d3ee",
  "#fb7185",
];

export default function DashboardPage() {
  const [days, setDays] = useState(30);

  const {
    data: stats,
    error: e1,
    isLoading: l1,
    mutate: mutStats,
  } = useSWR("dash-stats", () => internalFetch<Stats>("/stats"), {
    refreshInterval: 10_000,
  });

  const {
    data: revenue,
    error: e2,
    isLoading: l2,
    mutate: mutRev,
  } = useSWR(
    `dash-revenue-${days}`,
    () => internalFetch<Revenue>(`/revenue?days=${days}`),
    { refreshInterval: 15_000 },
  );

  const {
    data: payments,
    error: e3,
    isLoading: l3,
    mutate: mutPay,
  } = useSWR(
    "dash-payments",
    () => internalFetch<Payment[]>("/payments/recent?limit=100"),
    { refreshInterval: 10_000 },
  );

  const loading = l1 || l2 || l3;
  const error = e1 || e2 || e3;

  const totals = useMemo(() => {
    const list = payments ?? [];
    const totalCalls = list.length;
    const totalAmt = list.reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
    const payers = new Set(list.map((p) => p.payer).filter(Boolean));
    const avg = totalCalls ? totalAmt / totalCalls : 0;
    return {
      recentCalls: totalCalls,
      recentRevenue: totalAmt,
      uniquePayers: payers.size,
      avgCharge: avg,
    };
  }, [payments]);

  const endpointBars = useMemo(() => {
    return (revenue?.by_endpoint ?? []).slice(0, 8).map((e, i) => ({
      ...e,
      short: e.endpoint.replace("/v1/", "").replace(/qie\/\*/g, "*").slice(0, 28),
      fill: ENDPOINT_COLORS[i % ENDPOINT_COLORS.length],
    }));
  }, [revenue]);

  function refreshAll() {
    void mutStats();
    void mutRev();
    void mutPay();
  }

  if (loading && !stats) return <Loading label="Loading dashboard…" />;
  if (error && !stats)
    return <ErrorBox message={String((error as Error).message || error)} />;

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="mb-0.5 inline-flex items-center gap-1 text-cs-accent">
            <LayoutDashboard className="h-3 w-3" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em]">
              Operator
            </span>
          </div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">
            x402 call volume · USDC charged · payments ledger · worker health
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md border border-cs-border p-0.5">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "rounded px-2 py-1 text-[10px] font-medium",
                  days === d
                    ? "bg-cs-hover text-white"
                    : "text-cs-dim hover:text-cs-muted",
                )}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={refreshAll}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-cs-border px-2 text-[10px] text-cs-muted hover:text-white"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi
          icon={<Hash className="h-3.5 w-3.5" />}
          label="Calls today"
          value={String(stats?.requests_today ?? "—")}
          hint="Settled paid requests"
        />
        <Kpi
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label="Revenue today"
          value={fmtUsd(stats?.revenue_usdc.today ?? 0, 4)}
          hint="USDC"
          tone="green"
        />
        <Kpi
          label="Revenue 7d"
          value={fmtUsd(stats?.revenue_usdc.d7 ?? 0, 4)}
        />
        <Kpi
          label="Revenue 30d"
          value={fmtUsd(stats?.revenue_usdc.d30 ?? 0, 4)}
        />
        <Kpi
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Unique payers"
          value={String(totals.uniquePayers)}
          hint="In recent 100 txs"
        />
        <Kpi
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Avg charge"
          value={fmtUsd(totals.avgCharge, 4)}
          hint="Per paid call"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <MiniStat label="Pools tracked" value={String(stats?.pools_tracked ?? "—")} />
        <MiniStat label="Tokens tracked" value={String(stats?.tokens_tracked ?? "—")} />
        <MiniStat
          label="Endpoints earning"
          value={String(revenue?.by_endpoint?.length ?? "—")}
        />
        <MiniStat
          label="Window"
          value={`${days} days`}
          href="/"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-cs-border px-3 py-2">
            <div>
              <h2 className="text-[12px] font-semibold text-white">
                Daily revenue
              </h2>
              <p className="text-[9px] text-cs-dim">USDC settled via x402</p>
            </div>
            <Badge tone="accent">payments_log</Badge>
          </div>
          <div className="h-56 p-2 sm:h-64">
            {(revenue?.by_day?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue!.by_day}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6b2c" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#ff6b2c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#23232d" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6b6760", fontSize: 9 }}
                    minTickGap={28}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b6760", fontSize: 9 }}
                    width={42}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0e0e12",
                      border: "1px solid #23232d",
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                    formatter={(v) => [fmtUsd(Number(v ?? 0), 4), "USDC"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue_usdc"
                    stroke="#ff6b2c"
                    fill="url(#revFill)"
                    strokeWidth={1.75}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-cs-border px-3 py-2">
            <div>
              <h2 className="text-[12px] font-semibold text-white">
                Daily calls
              </h2>
              <p className="text-[9px] text-cs-dim">Paid request count</p>
            </div>
          </div>
          <div className="h-56 p-2 sm:h-64">
            {(revenue?.by_day?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue!.by_day}>
                  <CartesianGrid stroke="#23232d" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6b6760", fontSize: 9 }}
                    minTickGap={28}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b6760", fontSize: 9 }}
                    width={36}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0e0e12",
                      border: "1px solid #23232d",
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="calls" fill="#5b9dff" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </Card>
      </div>

      {/* Endpoint breakdown */}
      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <div className="border-b border-cs-border px-3 py-2">
            <h2 className="text-[12px] font-semibold text-white">
              Revenue by endpoint
            </h2>
            <p className="text-[9px] text-cs-dim">Top earning routes</p>
          </div>
          <div className="h-52 p-2">
            {endpointBars.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={endpointBars} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" tick={{ fill: "#6b6760", fontSize: 9 }} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="short"
                    width={100}
                    tick={{ fill: "#9a968f", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0e0e12",
                      border: "1px solid #23232d",
                      fontSize: 10,
                    }}
                    formatter={(v) => [fmtUsd(Number(v ?? 0), 4), "USDC"]}
                  />
                  <Bar dataKey="revenue_usdc" radius={[0, 3, 3, 0]}>
                    {endpointBars.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="border-b border-cs-border px-3 py-2">
            <h2 className="text-[12px] font-semibold text-white">
              Endpoint ledger
            </h2>
            <p className="text-[9px] text-cs-dim">
              Calls · USDC charged per route ({days}d)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="market-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Endpoint</th>
                  <th className="text-right">Calls</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Avg / call</th>
                  <th className="text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {(revenue?.by_endpoint ?? []).map((e, i) => {
                  const totalRev = stats?.revenue_usdc.d30 || 1;
                  const share = (e.revenue_usdc / Math.max(totalRev, 0.000001)) * 100;
                  const avg = e.calls ? e.revenue_usdc / e.calls : 0;
                  return (
                    <tr key={e.endpoint} className="!cursor-default">
                      <td className="num text-cs-dim">{i + 1}</td>
                      <td className="font-mono text-[10px] text-cs-accent">
                        {e.endpoint}
                      </td>
                      <td className="num text-right text-white">{e.calls}</td>
                      <td className="num text-right text-cs-green">
                        {fmtUsd(e.revenue_usdc, 4)}
                      </td>
                      <td className="num text-right text-cs-muted">
                        {fmtUsd(avg, 4)}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="h-1 w-12 overflow-hidden rounded-full bg-cs-hover">
                            <div
                              className="h-full bg-cs-accent"
                              style={{ width: `${Math.min(100, share)}%` }}
                            />
                          </div>
                          <span className="num text-[9px] text-cs-dim">
                            {share.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!revenue?.by_endpoint?.length ? (
              <p className="p-6 text-center text-[11px] text-cs-dim">
                No payment data yet
              </p>
            ) : null}
          </div>
        </Card>
      </div>

      {/* Recent payments + workers */}
      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-cs-border px-3 py-2">
            <div>
              <h2 className="text-[12px] font-semibold text-white">
                Recent payments
              </h2>
              <p className="text-[9px] text-cs-dim">
                Latest x402 settlements logged locally
              </p>
            </div>
            <Badge tone="green">{payments?.length ?? 0} rows</Badge>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="market-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Endpoint</th>
                  <th>Payer</th>
                  <th className="text-right">Amount</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((p) => (
                  <tr key={p.id} className="!cursor-default">
                    <td className="num text-[10px] text-cs-dim" title={p.ts}>
                      {timeAgo(p.ts)}
                    </td>
                    <td className="max-w-[180px] truncate font-mono text-[10px] text-cs-muted">
                      {p.endpoint}
                    </td>
                    <td className="text-[10px]">
                      {p.payer ? (
                        <ExplorerAccountLink address={p.payer} />
                      ) : (
                        <span className="text-cs-dim">—</span>
                      )}
                    </td>
                    <td className="num text-right font-semibold text-cs-green">
                      ${parseFloat(p.amount || "0").toFixed(4)}
                    </td>
                    <td className="text-[9px]">
                      {p.tx_id ? (
                        <ExplorerTxLink txId={p.tx_id} />
                      ) : (
                        <span className="text-cs-dim">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!payments?.length ? (
              <p className="p-6 text-center text-[11px] text-cs-dim">
                No payments logged yet. Seed data or complete a paid /v1 call.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="border-b border-cs-border px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-cs-muted" />
              <h2 className="text-[12px] font-semibold text-white">
                Sync workers
              </h2>
            </div>
            <p className="text-[9px] text-cs-dim">Last run status</p>
          </div>
          <div className="divide-y divide-cs-border">
            {(stats?.workers ?? []).map((w) => (
              <div key={w.worker} className="flex items-start gap-2 px-3 py-2.5">
                <Radio
                  className={cn(
                    "mt-0.5 h-3 w-3 shrink-0",
                    w.status === "success"
                      ? "text-cs-green"
                      : w.status === "error"
                        ? "text-cs-red"
                        : "text-cs-amber",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-white">
                      {w.worker}
                    </span>
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
                  </div>
                  <div className="mt-0.5 text-[9px] text-cs-dim">
                    last {timeAgo(w.last_run)}
                    {w.finished_at ? ` · done ${timeAgo(w.finished_at)}` : ""}
                  </div>
                  {w.error ? (
                    <div className="mt-0.5 truncate text-[9px] text-cs-red">
                      {w.error}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {!stats?.workers?.length ? (
              <p className="p-4 text-center text-[10px] text-cs-dim">No worker data</p>
            ) : null}
          </div>

          <div className="border-t border-cs-border p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cs-dim">
              Quick links
            </div>
            <div className="flex flex-col gap-1">
              <DashLink href="/" label="Markets screener" />
              <DashLink href="/tokens" label="All tokens" />
              <DashLink href="/ops/risk" label="Risk flags" />
              <DashLink href="/ops/revenue" label="Revenue (legacy)" />
            </div>
          </div>
        </Card>
      </div>

      {/* Protocol strip */}
      <Card className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2 text-[10px] text-cs-dim">
          <Activity className="h-3.5 w-3.5 text-cs-accent" />
          <span>
            Public routes under{" "}
            <code className="text-cs-muted">/v1/*</code> are x402-metered · Dashboard
            reads <code className="text-cs-muted">/internal/*</code> (no charge)
          </span>
        </div>
        <Badge tone="accent">x402-global-challenge</Badge>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "green" | "default";
}) {
  return (
    <div className="glass px-2.5 py-2.5">
      <div className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-cs-dim">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "num mt-1 text-[16px] font-semibold tracking-tight",
          tone === "green" ? "text-cs-green" : "text-white",
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-[9px] text-cs-dim">{hint}</div> : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="glass flex items-center justify-between px-2.5 py-2">
      <span className="text-[10px] text-cs-dim">{label}</span>
      <span className="num text-[12px] font-semibold text-white">{value}</span>
    </div>
  );
  if (href)
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {inner}
      </Link>
    );
  return inner;
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-[11px] text-cs-dim">
      No series data
    </div>
  );
}

function DashLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border border-cs-border bg-cs-bg px-2.5 py-1.5 text-[11px] text-cs-muted transition hover:border-cs-accent/40 hover:text-white"
    >
      {label}
      <ArrowUpRight className="h-3 w-3 text-cs-dim" />
    </Link>
  );
}
