# Tremor

**Professional multichain-style DEX screener & metered market-data API.**  
Dense DexScreener-class UI, token/pair detail, watchlists, risk scores, and a public **x402**-gated REST API.

<p align="center">
  <img src="./tremor-dashboard/public/logo.png" alt="Tremor" width="96" height="96" />
</p>

```text
Markets · Trending · New · Gainers · Tokens · Watchlist · Docs
```

## Features

| Area | What you get |
|------|----------------|
| **Screener** | Dense pair table — price, 24h %, volume, liquidity, age |
| **Discovery** | Trending, new pairs, top gainers |
| **Token detail** | DexScreener-style layout: identity, multi-window %, txns/buys/sells, chart, markets, holders, security |
| **Pair detail** | OHLCV + liquidity history + deep links |
| **Watchlist** | Star tokens/pairs (browser localStorage) |
| **Docs** | In-app product & API documentation (`/docs`) |
| **API** | Versioned `/v1/*` paid via x402; `/internal/*` for the dashboard |

## Monorepo

| Package | Role | Default port |
|---------|------|----------------|
| [`tremor-api`](./tremor-api) | Express + Prisma + Redis + workers + x402 | `4021` |
| [`tremor-dashboard`](./tremor-dashboard) | Next.js 14 App Router UI | `3000` |

```
[ Indexers / workers ]
         │
  Postgres + Redis
         │
  tremor-api  ──/v1/* (x402)──► public clients
         │
         └──/internal/* (API key)──► tremor-dashboard (/api/proxy)
```

## Quick start

### Prerequisites

- Node.js 20+
- Docker (Postgres + Redis)

### 1. Infrastructure

```bash
git clone https://github.com/linoxbt/Tremor.git
cd Tremor
docker compose up -d
```

Postgres is exposed on **host port `5436`**, Redis on **`6380`** (to avoid local clashes).

### 2. API

```bash
cd tremor-api
cp .env.example .env   # or use the committed local defaults
npm install
npx prisma db push
npm run db:seed
npm run dev            # http://localhost:4021
```

Second terminal — background sync:

```bash
npm run workers
```

### 3. Dashboard

```bash
cd tremor-dashboard
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4021
# INTERNAL_API_KEY=<same as API>
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

Open [http://localhost:3000](http://localhost:3000).

Root helpers:

```bash
npm run infra
npm run api:install && npm run dash:install
npm run api:db
npm run api:dev
npm run api:workers
npm run dash:dev
```

## Environment

### `tremor-api`

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis (optional — degrades gracefully) |
| `NETWORK` | `testnet` \| `mainnet` |
| `INTERNAL_API_KEY` | Bearer key for `/internal/*` |
| `PAYTO_ADDRESS` | Settlement address for x402 |
| `GOPLAUSIBLE_FACILITATOR_URL` | x402 facilitator |
| `USE_MOCK_DATA` | `true` = seed jitter; `false` = live pollers |

### `tremor-dashboard`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Public URL of `tremor-api` |
| `INTERNAL_API_KEY` | Must match API key |

## Netlify (dashboard)

Root [`netlify.toml`](./netlify.toml) builds `tremor-dashboard` with `@netlify/plugin-nextjs`.

1. Connect the GitHub repo to Netlify.
2. Base directory: `tremor-dashboard` (or use root `netlify.toml`).
3. Set env:
   - `NEXT_PUBLIC_API_URL` → your deployed API HTTPS origin  
   - `INTERNAL_API_KEY` → same secret as the API  

> The API (Express + workers + Postgres) should run on a Node host (Railway, Fly, Render, VPS). Netlify serves the Next.js UI only.

## Public API (paid)

Unauthenticated `GET /v1/...` returns **HTTP 402** with x402 payment instructions when the facilitator is configured.

| Tier | Price | Examples |
|------|-------|----------|
| Micro | $0.002 | price, pair, pools |
| Low | $0.01 | trending, new-pairs |
| Medium | $0.03 | ohlcv, holders |
| Premium | $0.08 | rug-score, whales |

Response shape:

```json
{
  "data": {},
  "meta": {
    "chain": "algorand",
    "generated_at": "…",
    "cache": "hit|miss"
  }
}
```

See in-app **[Docs](./tremor-dashboard/src/app/docs/page.tsx)** at `/docs` after launch.

## Product routes

| Path | Description |
|------|-------------|
| `/` | Markets screener |
| `/trending` `/new-pairs` `/gainers` | Discovery |
| `/tokens` | Token list + rug scores |
| `/token/[address]` | DexScreener-style token detail |
| `/pair/[address]` | Pair detail + charts |
| `/watchlist` | Local watchlist |
| `/docs` | Product & API docs |
| `/ops` | Internal ops (API key) |

## Disclaimer

Market data and rug scores are **automated heuristics for information only** — not financial advice, not a guarantee against scams. Tremor does not execute trades. Always do your own research.

## License

MIT

---

Built for real-time discovery. Star assets, read the docs, pay-per-request on `/v1`.
