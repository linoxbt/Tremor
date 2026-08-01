import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs · Tremor",
  description: "Tremor API and product documentation — Qie market data screener.",
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/v1/token/{chain}/{address}/price",
    tier: "micro",
    desc: "USD price, liquidity, 24h volume",
  },
  {
    method: "GET",
    path: "/v1/token/{chain}/{address}/pools",
    tier: "micro",
    desc: "DEX pools for a token",
  },
  {
    method: "GET",
    path: "/v1/token/{chain}/{address}/holders",
    tier: "medium",
    desc: "Top holders + concentration",
  },
  {
    method: "GET",
    path: "/v1/token/{chain}/{address}/rug-score",
    tier: "premium",
    desc: "Automated risk heuristics 0–100",
  },
  {
    method: "GET",
    path: "/v1/pair/{chain}/{pairAddress}",
    tier: "micro",
    desc: "Pair snapshot",
  },
  {
    method: "GET",
    path: "/v1/pair/{chain}/{pairAddress}/ohlcv",
    tier: "medium",
    desc: "OHLCV candles",
  },
  {
    method: "GET",
    path: "/v1/trending/{chain}",
    tier: "low",
    desc: "Trending pairs by volume",
  },
  {
    method: "GET",
    path: "/v1/new-pairs/{chain}",
    tier: "low",
    desc: "Recently created pairs",
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cs-accent">
          Documentation
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-white">
          Tremor docs
        </h1>
        <p className="mt-2 text-[12px] leading-relaxed text-cs-muted">
          Tremor is a dense, DexScreener-class market data product for Qie —
          live pairs, charts, holders, and automated risk scores. Public data
          is also exposed as a metered{" "}
          <strong className="text-white">x402</strong> API.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-white">Product</h2>
        <ul className="list-inside list-disc space-y-1.5 text-[12px] text-cs-muted">
          <li>
            <Link href="/" className="text-cs-accent hover:underline">
              Markets
            </Link>{" "}
            — dense pair table with volume, liquidity, and % change
          </li>
          <li>
            <Link href="/trending" className="text-cs-accent hover:underline">
              Trending / New / Gainers
            </Link>{" "}
            — discovery views
          </li>
          <li>
            Token & pair detail — price strip, multi-window %, txns, buy/sell
            pressure, chart, holders, rug score
          </li>
          <li>
            <Link href="/watchlist" className="text-cs-accent hover:underline">
              Watchlist
            </Link>{" "}
            — star assets in your browser
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-white">Architecture</h2>
        <div className="rounded-lg border border-cs-border bg-cs-elevated p-4 font-mono text-[11px] leading-relaxed text-cs-muted">
          <div>Indexers / workers → Postgres + Redis</div>
          <div>Express API → /v1 (x402 paid) · /internal (dashboard key)</div>
          <div>Next.js dashboard → /api/proxy/* → /internal/*</div>
        </div>
        <p className="text-[11px] text-cs-dim">
          Live data is indexed from <strong className="text-cs-muted">Qie Mainnet</strong>{" "}
          (chain id 1990) via the official DEX subgraph and Blockscout explorer.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-white">Public API</h2>
        <p className="text-[12px] text-cs-muted">
          Base URL: your deployed API host (local default{" "}
          <code className="text-cs-muted">http://localhost:4021</code>). Unpaid
          requests receive <code className="text-cs-muted">HTTP 402</code> with
          x402 payment requirements.
        </p>
        <div className="overflow-hidden rounded-lg border border-cs-border">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-cs-elevated text-[10px] uppercase text-cs-dim">
              <tr>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Path</th>
                <th className="px-3 py-2 font-medium">Tier</th>
                <th className="px-3 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((e) => (
                <tr
                  key={e.path}
                  className="border-t border-cs-border text-cs-muted"
                >
                  <td className="px-3 py-2">
                    <span className="rounded bg-cs-green/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cs-green">
                      {e.method}
                    </span>
                  </td>
                  <td className="num px-3 py-2 text-[10px] text-cs-accent">
                    {e.path}
                  </td>
                  <td className="px-3 py-2 capitalize">{e.tier}</td>
                  <td className="px-3 py-2">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-cs-dim">
          Response envelope:{" "}
          <code className="text-cs-muted">
            {`{ "data": {}, "meta": { "chain", "generated_at", "cache" } }`}
          </code>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-white">Pricing tiers</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { t: "Micro", p: "$0.002", e: "price, pair, pools, search" },
            { t: "Low", p: "$0.01", e: "trending, new-pairs" },
            { t: "Medium", p: "$0.03", e: "ohlcv, holders, volume profile" },
            { t: "Premium", p: "$0.08", e: "rug-score, whale activity" },
          ].map((x) => (
            <div
              key={x.t}
              className="rounded-lg border border-cs-border bg-cs-elevated px-3 py-2"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-semibold text-white">
                  {x.t}
                </span>
                <span className="num text-[12px] text-cs-accent">{x.p}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-cs-dim">{x.e}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-white">Disclaimers</h2>
        <p className="text-[11px] leading-relaxed text-cs-dim">
          Market data and rug scores are automated heuristics for informational
          purposes only — not financial advice, not a guarantee against scams,
          and not an endorsement of any asset. Tremor does not execute trades.
          Always do your own research.
        </p>
      </section>

      <section className="rounded-lg border border-cs-border bg-cs-elevated p-4">
        <h2 className="text-[13px] font-semibold text-white">Local setup</h2>
        <pre className="mt-2 overflow-x-auto rounded-md bg-cs-bg p-3 text-[10px] leading-relaxed text-cs-muted">{`docker compose up -d
cd tremor-api && npm i && npx prisma db push && npm run db:seed
npm run dev          # API :4021
npm run workers
cd ../tremor-dashboard && npm i && npm run dev  # UI :3000`}</pre>
      </section>
    </div>
  );
}
