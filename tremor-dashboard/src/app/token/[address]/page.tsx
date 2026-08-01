"use client";

import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  ErrorBox,
  Loading,
  TokenAvatar,
} from "@/components/ui";
import { DexLink } from "@/components/DexLink";
import { WatchButton } from "@/components/WatchButton";
import { PairTable } from "@/components/PairTable";
import {
  fmtPrice,
  fmtUsd,
  shortAddr,
  tokenLabel,
  cn,
  timeAgo,
} from "@/lib/utils";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

type TokenDetail = {
  token: {
    chain: string;
    address: string;
    symbol: string | null;
    name: string | null;
    decimals: number | null;
    logo: string;
  };
  price: {
    usd: number | null;
    change: { m5: number; h1: number; h6: number; h24: number };
    liquidity_usd: number;
    volume_24h: number;
    fdv_usd: number;
    mcap_usd: number;
    markets_count: number;
  };
  txns: {
    h24: { buys: number; sells: number; total: number };
    volume: { buy: number; sell: number; total: number };
    pressure: { buy_pct: number; sell_pct: number; net: number };
  };
  primary_pair: {
    pool_address: string;
    dex: string;
    pair_address?: string;
    change_24h_pct?: number;
    created_at?: string;
    token0?: { address: string; symbol: string | null };
    token1?: { address: string; symbol: string | null };
  } | null;
  chart: {
    timeframe: string;
    candles: {
      ts: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[];
  };
  liquidity_history: { ts: string; liquidity_usd: number }[];
  markets: {
    pool_address: string;
    pair_address: string;
    dex: string;
    token0: string;
    token1: string;
    quote: string;
    price_usd: number;
    liquidity_usd: number;
    volume_24h: number;
    change_24h_pct: number;
  }[];
  holders: {
    holders: { address: string; balance: number; pct_of_supply: number }[];
    concentration: { top10_pct: number; holder_count: number };
  };
  rug: {
    rug_score: number;
    risk_level: string;
    factors: Record<
      string,
      { score: number; weight: number; risk_contribution: number; detail: unknown }
    >;
    active_flags: {
      type: string;
      severity: string;
      detected_at: string;
      details: unknown;
    }[];
  };
  whales: {
    window_hours: number;
    whales: {
      wallet: string;
      pct_of_supply: number;
      direction: string;
      hours_ago: number;
    }[];
    note?: string;
  };
  volume_profile: {
    volume_24h: { buy: number; sell: number; total: number };
    pressure: { buy_pct: number; sell_pct: number; net: number };
    note?: string;
  };
  meta: { generated_at: string; supply_note: string };
};

export default function TokenDetailPage() {
  const params = useParams();
  const raw = params?.address;
  const address =
    typeof raw === "string" && raw !== "undefined"
      ? decodeURIComponent(raw)
      : Array.isArray(raw) && raw[0]
        ? decodeURIComponent(raw[0])
        : "";
  const [copied, setCopied] = useState(false);
  const [chartMode, setChartMode] = useState<"price" | "liquidity">("price");

  const { data, error, isLoading } = useSWR(
    address ? `token-detail:${address}` : null,
    () =>
      internalFetch<TokenDetail>(
        `/token/${encodeURIComponent(address)}/full`,
      ),
    { refreshInterval: 12_000 },
  );

  const chartData = useMemo(() => {
    if (!data?.chart?.candles) return [];
    return data.chart.candles.map((c) => ({
      t: c.ts.slice(5, 16).replace("T", " "),
      close: c.close,
      volume: c.volume,
      high: c.high,
      low: c.low,
    }));
  }, [data]);

  const liqData = useMemo(() => {
    return (data?.liquidity_history ?? []).map((s) => ({
      t: s.ts.slice(5, 16).replace("T", " "),
      liq: s.liquidity_usd,
    }));
  }, [data]);

  if (!address) return <ErrorBox message="Missing token address." />;
  if (isLoading) return <Loading label="Loading token market…" />;
  if (error) return <ErrorBox message={String(error.message || error)} />;
  if (!data) return null;

  const symbol = data.token.symbol || shortAddr(address, 4, 3);
  const name = data.token.name || "Unknown";
  const quote =
    data.primary_pair?.token1?.symbol ||
    data.primary_pair?.token0?.symbol ||
    "QIE";
  // Prefer non-base as quote display
  const quoteLabel =
    data.markets[0]?.quote
      ? tokenLabel(data.markets[0].quote)
      : quote;
  const riskTone =
    data.rug.rug_score >= 70
      ? "red"
      : data.rug.rug_score >= 40
        ? "amber"
        : "green";

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const buyPct = data.txns.pressure.buy_pct;
  const sellPct = data.txns.pressure.sell_pct;
  const tradersEst = Math.max(
    1,
    Math.round(data.txns.h24.total * 0.42),
  );
  const buyersEst = Math.round(tradersEst * (buyPct / 100));
  const sellersEst = Math.max(0, tradersEst - buyersEst);

  // Rough pool split 50/50 of liquidity for "pooled" display
  const pooledBaseUsd = data.price.liquidity_usd / 2;
  const pooledQuoteUsd = data.price.liquidity_usd / 2;
  const px = data.price.usd || 0;
  const pooledBaseAmt = px > 0 ? pooledBaseUsd / px : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/tokens"
          className="inline-flex items-center gap-1 text-[11px] text-cs-dim hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> Tokens
        </Link>
        <span className="text-[9px] text-cs-dim">
          Updated {timeAgo(data.meta.generated_at)}
        </span>
      </div>

      {/* ── DexScreener-style header ── */}
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        {/* Left: identity + price windows + chart */}
        <div className="space-y-3">
          <Card className="p-3">
            <div className="flex flex-wrap items-start gap-3">
              <TokenAvatar symbol={symbol} address={address} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[20px] font-semibold tracking-tight text-white">
                    {name}
                  </h1>
                  <WatchButton
                    kind="token"
                    address={address}
                    symbol={symbol}
                    name={name}
                  />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px]">
                  <span className="font-semibold text-white">{symbol}</span>
                  <span className="text-cs-dim">/</span>
                  <span className="font-medium text-cs-muted">{quoteLabel}</span>
                  <Badge tone="blue">Qie</Badge>
                  {data.primary_pair ? (
                    <DexLink
                      dex={data.primary_pair.dex}
                      showIcon
                      className="!text-[10px]"
                    />
                  ) : null}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-cs-dim">
                  <button
                    onClick={copy}
                    className="num inline-flex items-center gap-1 rounded border border-cs-border bg-cs-bg px-1.5 py-0.5 hover:text-white"
                  >
                    {shortAddr(address, 8, 6)}
                    {copied ? (
                      <Check className="h-2.5 w-2.5 text-cs-green" />
                    ) : (
                      <Copy className="h-2.5 w-2.5" />
                    )}
                  </button>
                  {data.primary_pair ? (
                    <Link
                      href={`/pair/${encodeURIComponent(data.primary_pair.pool_address)}`}
                      className="inline-flex items-center gap-0.5 text-cs-accent hover:underline"
                    >
                      Pair page <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  ) : null}
                  {data.primary_pair?.created_at ? (
                    <span>
                      Pair created {timeAgo(data.primary_pair.created_at)} ago
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-[9px] uppercase tracking-wider text-cs-dim">
                  Price USD
                </div>
                <div className="num text-[28px] font-semibold leading-none text-white">
                  {fmtPrice(data.price.usd)}
                </div>
              </div>
            </div>

            {/* 5M / 1H / 6H / 24H strip */}
            <div className="mt-3 grid grid-cols-4 gap-px overflow-hidden rounded-md border border-cs-border bg-cs-border">
              {(
                [
                  ["5M", data.price.change.m5],
                  ["1H", data.price.change.h1],
                  ["6H", data.price.change.h6],
                  ["24H", data.price.change.h24],
                ] as const
              ).map(([label, v]) => (
                <div
                  key={label}
                  className="bg-cs-elevated px-2 py-2 text-center"
                >
                  <div className="text-[9px] font-medium uppercase text-cs-dim">
                    {label}
                  </div>
                  <div
                    className={cn(
                      "num mt-0.5 text-[13px] font-semibold",
                      v > 0
                        ? "text-cs-green"
                        : v < 0
                          ? "text-cs-red"
                          : "text-cs-muted",
                    )}
                  >
                    {v > 0 ? "+" : ""}
                    {v.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Chart */}
          <Card>
            <div className="flex items-center justify-between border-b border-cs-border px-3 py-1.5">
              <div className="flex gap-1">
                {(
                  [
                    ["price", "Price"],
                    ["liquidity", "Liquidity"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setChartMode(id)}
                    className={cn(
                      "rounded px-2 py-1 text-[11px] font-medium",
                      chartMode === id
                        ? "bg-cs-hover text-white"
                        : "text-cs-dim hover:text-cs-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-cs-dim">
                {symbol} · {fmtPrice(data.price.usd)} · charts by Tremor
              </span>
            </div>
            <div className="h-[320px] p-2 sm:h-[380px]">
              {chartMode === "price" && chartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="tokPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#ff6b2c"
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="100%"
                          stopColor="#ff6b2c"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#23232d"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="t"
                      tick={{ fill: "#6b6760", fontSize: 9 }}
                      minTickGap={36}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="p"
                      domain={["auto", "auto"]}
                      tick={{ fill: "#6b6760", fontSize: 9 }}
                      width={56}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="v"
                      orientation="right"
                      tick={{ fill: "#6b6760", fontSize: 9 }}
                      width={40}
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
                    <Bar
                      yAxisId="v"
                      dataKey="volume"
                      fill="#23232d"
                      radius={[1, 1, 0, 0]}
                    />
                    <Area
                      yAxisId="p"
                      type="monotone"
                      dataKey="close"
                      stroke="#ff6b2c"
                      fill="url(#tokPrice)"
                      strokeWidth={1.75}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : chartMode === "liquidity" && liqData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liqData}>
                    <defs>
                      <linearGradient id="tokLiq" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#5b9dff"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#5b9dff"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#23232d"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="t"
                      tick={{ fill: "#6b6760", fontSize: 9 }}
                      minTickGap={36}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#6b6760", fontSize: 9 }}
                      width={56}
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
                    <Area
                      type="monotone"
                      dataKey="liq"
                      stroke="#5b9dff"
                      fill="url(#tokLiq)"
                      strokeWidth={1.75}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-cs-dim">
                  No chart data for this token yet
                </div>
              )}
            </div>
          </Card>

          {/* Markets table */}
          <Card>
            <div className="border-b border-cs-border px-3 py-2 text-[11px] font-semibold text-white">
              Markets
            </div>
            <PairTable
              rows={data.markets.map((m) => ({
                pool_address: m.pool_address,
                pair_address: m.pair_address,
                dex: m.dex,
                token0: m.token0,
                token1: m.token1,
                price_usd: m.price_usd,
                liquidity_usd: m.liquidity_usd,
                volume_24h: m.volume_24h,
                change_24h_pct: m.change_24h_pct,
              }))}
            />
          </Card>
        </div>

        {/* ── Right rail (DexScreener info panel) ── */}
        <div className="space-y-3">
          <Card className="overflow-hidden p-0">
            <div className="grid grid-cols-2 gap-px bg-cs-border">
              <InfoCell label="Price USD" value={fmtPrice(data.price.usd)} />
              <InfoCell
                label="Liquidity"
                value={fmtUsd(data.price.liquidity_usd)}
              />
              <InfoCell label="FDV" value={fmtUsd(data.price.fdv_usd)} />
              <InfoCell label="Mkt Cap" value={fmtUsd(data.price.mcap_usd)} />
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="grid grid-cols-2 gap-px bg-cs-border">
              <InfoCell
                label="Txns"
                value={String(data.txns.h24.total.toLocaleString())}
              />
              <InfoCell
                label="Volume"
                value={fmtUsd(data.price.volume_24h)}
              />
              <InfoCell
                label="Traders"
                value={String(tradersEst.toLocaleString())}
              />
              <InfoCell label="Markets" value={String(data.price.markets_count)} />
              <InfoCell
                label="Buys"
                value={
                  <span className="text-cs-green">
                    {data.txns.h24.buys.toLocaleString()}
                  </span>
                }
              />
              <InfoCell
                label="Sells"
                value={
                  <span className="text-cs-red">
                    {data.txns.h24.sells.toLocaleString()}
                  </span>
                }
              />
              <InfoCell
                label="Buy Vol"
                value={
                  <span className="text-cs-green">
                    {fmtUsd(data.txns.volume.buy)}
                  </span>
                }
              />
              <InfoCell
                label="Sell Vol"
                value={
                  <span className="text-cs-red">
                    {fmtUsd(data.txns.volume.sell)}
                  </span>
                }
              />
              <InfoCell
                label="Buyers"
                value={
                  <span className="text-cs-green">
                    {buyersEst.toLocaleString()}
                  </span>
                }
              />
              <InfoCell
                label="Sellers"
                value={
                  <span className="text-cs-red">
                    {sellersEst.toLocaleString()}
                  </span>
                }
              />
            </div>
          </Card>

          {/* Buy/sell bar */}
          <Card className="p-3">
            <div className="mb-2 text-[11px] font-semibold text-white">
              Buy / Sell pressure
            </div>
            <div className="mb-2 flex h-2 overflow-hidden rounded-full">
              <div className="bg-cs-green" style={{ width: `${buyPct}%` }} />
              <div className="bg-cs-red" style={{ width: `${sellPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-cs-green">{buyPct.toFixed(1)}% buy</span>
              <span className="text-cs-red">{sellPct.toFixed(1)}% sell</span>
            </div>
            <div className="mt-2 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Buy", v: data.txns.volume.buy },
                    { name: "Sell", v: data.txns.volume.sell },
                  ]}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#6b6760", fontSize: 9 }}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "#0e0e12",
                      border: "1px solid #23232d",
                      fontSize: 10,
                    }}
                  />
                  <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                    <Cell fill="#3dd68c" />
                    <Cell fill="#ff5c6a" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Pooled reserves */}
          <Card className="p-3">
            <div className="mb-2 text-[11px] font-semibold text-white">
              Pair liquidity
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-cs-dim">Pooled {symbol}</span>
                <span className="num text-right text-white">
                  {pooledBaseAmt > 0
                    ? pooledBaseAmt.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                  <span className="ml-1 text-cs-dim">
                    {fmtUsd(pooledBaseUsd)}
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-cs-dim">Pooled {quoteLabel}</span>
                <span className="num text-right text-white">
                  —
                  <span className="ml-1 text-cs-dim">
                    {fmtUsd(pooledQuoteUsd)}
                  </span>
                </span>
              </div>
              <div className="flex justify-between border-t border-cs-border pt-2">
                <span className="text-cs-dim">Pair</span>
                <span className="font-medium text-white">
                  {symbol} / {quoteLabel}
                </span>
              </div>
            </div>
          </Card>

          {/* Security */}
          <Card className="p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-cs-accent" />
              <span className="text-[11px] font-semibold text-white">
                Security
              </span>
              <Badge tone={riskTone} className="ml-auto">
                {data.rug.risk_level} · {data.rug.rug_score}
              </Badge>
            </div>
            <p className="mb-2 text-[9px] leading-snug text-cs-dim">
              Warning! Audits / scores may not be 100% accurate. Automated
              heuristics only — not financial advice.
            </p>
            <div className="space-y-1.5">
              {Object.entries(data.rug.factors).map(([key, f]) => (
                <div key={key}>
                  <div className="mb-0.5 flex justify-between text-[9px]">
                    <span className="capitalize text-cs-muted">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="num text-cs-dim">{f.score}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-cs-bg">
                    <div
                      className="h-full rounded-full bg-cs-accent"
                      style={{ width: `${Math.min(100, f.score)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Profile / description */}
          <Card className="p-3">
            <div className="mb-1.5 text-[11px] font-semibold text-white">
              {name}
            </div>
            <p className="text-[11px] leading-relaxed text-cs-muted">
              {name} ({symbol}) on Qie. Tracked by Tremor with live price,
              liquidity, volume, and risk heuristics. Not financial advice —
              always DYOR.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{data.token.decimals ?? "—"} decimals</Badge>
              <Badge tone="neutral">
                Top10 {data.holders.concentration.top10_pct.toFixed(1)}%
              </Badge>
              <Badge tone="neutral">
                {data.holders.concentration.holder_count} holders
              </Badge>
            </div>
          </Card>

          {/* Holders */}
          <Card className="overflow-hidden">
            <div className="border-b border-cs-border px-3 py-2 text-[11px] font-semibold text-white">
              Top holders
            </div>
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-cs-elevated text-cs-dim">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">#</th>
                    <th className="px-2 py-1.5 text-left font-medium">
                      Address
                    </th>
                    <th className="px-3 py-1.5 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.holders.holders.slice(0, 12).map((h, i) => (
                    <tr
                      key={h.address + i}
                      className="border-t border-cs-border"
                    >
                      <td className="num px-3 py-1 text-cs-dim">{i + 1}</td>
                      <td className="num px-2 py-1 text-cs-accent">
                        {shortAddr(h.address, 4, 4)}
                      </td>
                      <td className="num px-3 py-1 text-right text-white">
                        {h.pct_of_supply.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                  {!data.holders.holders.length ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-4 text-center text-cs-dim"
                      >
                        No holder snapshot yet
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-cs-elevated px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-wide text-cs-dim">
        {label}
      </div>
      <div className="num mt-0.5 text-[13px] font-semibold text-white">
        {value}
      </div>
    </div>
  );
}
