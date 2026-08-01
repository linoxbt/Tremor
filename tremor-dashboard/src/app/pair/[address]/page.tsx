"use client";

import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { internalFetch } from "@/lib/api";
import {
  Badge,
  Card,
  CardHeader,
  ErrorBox,
  Loading,
  Pct,
  Stat,
  TokenAvatar,
  TabBar,
} from "@/components/ui";
import { DexLink } from "@/components/DexLink";
import { WatchButton } from "@/components/WatchButton";
import { fmtPrice, fmtUsd, shortAddr, timeAgo, cn } from "@/lib/utils";
import { ArrowLeft, ExternalLink, Copy, Check } from "lucide-react";

type Detail = {
  pair: {
    pair_address: string;
    dex: string;
    price_usd: number;
    liquidity_usd: number;
    volume_24h: number;
    change_24h_pct: number;
    created_at: string;
    token0: { address: string; symbol: string | null; name: string | null };
    token1: { address: string; symbol: string | null; name: string | null };
  };
  ohlcv: {
    candles: {
      ts: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[];
  };
  liquidity_history: {
    series: { ts: string; liquidity_usd: number }[];
  };
};

export default function PairDetailPage() {
  const params = useParams();
  const raw = params?.address;
  const address =
    typeof raw === "string" && raw !== "undefined" && raw !== "null"
      ? decodeURIComponent(raw)
      : Array.isArray(raw) && raw[0]
        ? decodeURIComponent(raw[0])
        : "";
  const [chartTab, setChartTab] = useState("price");
  const [copied, setCopied] = useState(false);

  const { data, error, isLoading } = useSWR(
    address ? `pair-detail:${address}` : null,
    () => internalFetch<Detail>(`/pools/${encodeURIComponent(address)}`),
    { refreshInterval: 12_000 },
  );

  if (!address) {
    return (
      <ErrorBox message="Missing pair address. Go back to Markets and select a pool." />
    );
  }
  if (isLoading) return <Loading label="Loading pair…" />;
  if (error) return <ErrorBox message={String(error.message || error)} />;
  if (!data) return null;

  const p = data.pair;
  const s0 = p.token0.symbol || shortAddr(p.token0.address, 4, 3);
  const s1 = p.token1.symbol || shortAddr(p.token1.address, 4, 3);
  const up = p.change_24h_pct >= 0;

  const candles = data.ohlcv.candles.map((c) => ({
    t: c.ts.slice(5, 16).replace("T", " "),
    close: c.close,
    volume: c.volume,
    high: c.high,
    low: c.low,
  }));
  const liq = data.liquidity_history.series.map((s) => ({
    t: s.ts.slice(5, 16).replace("T", " "),
    liq: s.liquidity_usd,
  }));

  async function copyAddr() {
    await navigator.clipboard.writeText(p.pair_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-cs-dim hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Markets
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative">
            <TokenAvatar symbol={s0} address={p.token0.address} size={52} />
            <div className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-cs-bg">
              <TokenAvatar symbol={s1} address={p.token1.address} size={26} />
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
                {s0}
                <span className="text-cs-dim"> / {s1}</span>
              </h1>
              <WatchButton
                kind="pair"
                address={p.pair_address}
                symbol={s0}
                quote={s1}
              />
              <DexLink dex={p.dex} showIcon className="!text-[10px] !normal-case tracking-normal" />
              <Badge tone="blue">Qie Mainnet</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-cs-dim">
              <button
                onClick={copyAddr}
                className="num inline-flex items-center gap-1 rounded-md hover:text-white"
              >
                {shortAddr(p.pair_address, 10, 6)}
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-cs-green" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <span>·</span>
              <span>Created {timeAgo(p.created_at)} ago</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/token/${encodeURIComponent(p.token0.address)}`}
                className="inline-flex items-center gap-1 rounded-lg border border-cs-border bg-cs-card px-2.5 py-1 text-xs text-cs-muted hover:text-white"
              >
                {s0} token <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href={`/token/${encodeURIComponent(p.token1.address)}`}
                className="inline-flex items-center gap-1 rounded-lg border border-cs-border bg-cs-card px-2.5 py-1 text-xs text-cs-muted hover:text-white"
              >
                {s1} token <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        <div className="text-left lg:text-right">
          <div className="text-[11px] uppercase tracking-wider text-cs-dim">Price USD</div>
          <div className="num text-3xl font-semibold tracking-tight text-white">
            {fmtPrice(p.price_usd)}
          </div>
          <div className="mt-1">
            <Pct value={p.change_24h_pct} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Liquidity" value={fmtUsd(p.liquidity_usd)} />
        <Stat label="24h volume" value={fmtUsd(p.volume_24h)} />
        <Stat
          label="24h change"
          value={`${up ? "+" : ""}${p.change_24h_pct.toFixed(2)}%`}
          tone={up ? "green" : "red"}
        />
        <Stat label="DEX" value={<DexLink dex={p.dex} showIcon />} />
      </div>

      {/* Chart */}
      <Card>
        <div className="flex items-center justify-between border-b border-cs-border">
          <TabBar
            tabs={[
              { id: "price", label: "Price" },
              { id: "liquidity", label: "Liquidity" },
            ]}
            active={chartTab}
            onChange={setChartTab}
          />
          <span className="hidden px-4 text-[11px] text-cs-dim sm:inline">
            1h candles · auto-refresh
          </span>
        </div>
        <div className="h-[360px] p-4">
          {chartTab === "price" ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={candles}>
                <defs>
                  <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6b2c" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#ff6b2c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#23232d" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="t"
                  tick={{ fill: "#6b6760", fontSize: 10 }}
                  minTickGap={40}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="price"
                  domain={["auto", "auto"]}
                  tick={{ fill: "#6b6760", fontSize: 10 }}
                  width={64}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="vol"
                  orientation="right"
                  tick={{ fill: "#6b6760", fontSize: 10 }}
                  width={48}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0e0e12",
                    border: "1px solid #23232d",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar yAxisId="vol" dataKey="volume" fill="#23232d" radius={[2, 2, 0, 0]} />
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="close"
                  stroke="#ff6b2c"
                  fill="url(#priceFill)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liq}>
                <defs>
                  <linearGradient id="liqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b9dff" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#5b9dff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#23232d" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="t"
                  tick={{ fill: "#6b6760", fontSize: 10 }}
                  minTickGap={40}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6b6760", fontSize: 10 }}
                  width={70}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0e0e12",
                    border: "1px solid #23232d",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="liq"
                  stroke="#5b9dff"
                  fill="url(#liqFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Side info */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pair info" subtitle="On-chain identifiers" />
          <div className="space-y-3 p-5 text-sm">
            <Row label="Pool address" value={p.pair_address} mono />
            <Row label="Token 0" value={`${s0} · ${p.token0.address}`} mono />
            <Row label="Token 1" value={`${s1} · ${p.token1.address}`} mono />
            <Row label="DEX" value={<DexLink dex={p.dex} showIcon />} />
            <Row label="Chain" value="Qie" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Trade context" subtitle="Snapshot metrics" />
          <div className="space-y-3 p-5 text-sm">
            <Row label="Price" value={fmtPrice(p.price_usd)} mono />
            <Row label="Liquidity" value={fmtUsd(p.liquidity_usd)} mono />
            <Row label="24h volume" value={fmtUsd(p.volume_24h)} mono />
            <Row
              label="24h change"
              value={
                <span className={cn(up ? "text-cs-green" : "text-cs-red")}>
                  {up ? "+" : ""}
                  {p.change_24h_pct.toFixed(2)}%
                </span>
              }
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cs-border/60 pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-cs-dim">{label}</span>
      <span
        className={cn(
          "text-right text-white break-all",
          mono && "num text-xs text-cs-muted",
        )}
      >
        {value}
      </span>
    </div>
  );
}
