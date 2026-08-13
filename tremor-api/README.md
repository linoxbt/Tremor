# Tremor API

Metered, pay-per-request **Qie Mainnet** market-data API.

- **Chain scope:** Qie only — Mainnet (`eip155:1990`) or Testnet (`eip155:1983`)
- **Payments:** x402 `exact` scheme, EVM (`@x402/evm`), settled in a configurable ERC-20 asset
- **Discovery:** Bazaar extension (when the configured facilitator supports it)
- **Stack:** Node.js, TypeScript, Express, Prisma/Postgres, Redis, `@x402/express` + `@x402/evm`

## x402 on Qie — read this before enabling payments

x402's `exact` EVM scheme needs a **facilitator** to verify and settle payments on-chain.
There is currently **no public facilitator that supports Qie** (`eip155:1990`/`1983`) —
GoPlausible only covers Algorand/Base/Solana, and the other major hosted facilitators are
scoped to a handful of well-known EVM chains. Until Qie is added to a public facilitator,
operators have two options:

1. **Self-host a facilitator.** `@x402/evm` ships the facilitator-side primitives
   (`@x402/evm/exact/facilitator`) — run them against `QIE_RPC_URL` with a funded relayer
   key and point `X402_FACILITATOR_URL` at it.
2. **Leave `X402_FACILITATOR_URL` unset.** The API still boots and advertises correct
   HTTP 402 payment requirements (price, network, asset) on every `/v1/*` route — clients
   just can't complete settlement yet. This is the default for local dev.

You must also set `QIE_PAYMENT_ASSET_ADDRESS` to a real deployed ERC-20 contract (e.g. a
USDC bridge/issuance on Qie) — there is no default, since guessing a token address here
would risk pointing payers at the wrong contract.

## Architecture

```
Qie RPC + Blockscout + DEX subgraph  →  workers  →  Postgres + Redis
                                                          ↓
                                          Express + x402 (EVM exact) middleware
                                          /v1/* (paid)   /internal/* (API key)
```

## Quick start

```bash
# From monorepo root
docker compose up -d

cd tremor-api
cp .env.example .env
# edit PAYTO_ADDRESS, INTERNAL_API_KEY, NETWORK, QIE_PAYMENT_ASSET_ADDRESS

npm install
npx prisma db push
npm run db:seed

# Terminal 1 — API
npm run dev

# Terminal 2 — sync workers
npm run workers
```

Health: `GET http://localhost:4021/health`
Catalog: `GET http://localhost:4021/`

## Environment

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis URL (optional; falls back to DB-only) |
| `X402_FACILITATOR_URL` | Self-hosted x402 facilitator for Qie; unset disables settlement |
| `PAYTO_ADDRESS` | Qie address (0x…) receiving payment |
| `QIE_PAYMENT_ASSET_ADDRESS` | ERC-20 contract to accept payment in — required to settle |
| `QIE_PAYMENT_ASSET_SYMBOL` / `QIE_PAYMENT_ASSET_DECIMALS` | Display symbol / decimals for that asset |
| `NETWORK` | `testnet` or `mainnet` |
| `INTERNAL_API_KEY` | Bearer token for `/internal/*` |
| `QIE_RPC_URL` / `QIE_EXPLORER_URL` / `QIE_SUBGRAPH_URL` | Qie JSON-RPC, Blockscout, DEX subgraph endpoints |
| `QIE_WQIE` | Wrapped QIE contract address |
| `USE_MOCK_DATA` | `true` = seed/jitter mode without live DEX mapping |

### Network constants

| | Testnet | Mainnet |
|---|---|---|
| CAIP-2 | `eip155:1983` | `eip155:1990` |
| Chain ID | 1983 | 1990 |

## Public endpoints (`/v1`, x402)

| Endpoint | Tier |
|---|---|
| `GET /v1/token/{chain}/{address}/price` | Micro $0.002 |
| `GET /v1/pair/{chain}/{pairAddress}` | Micro $0.002 |
| `GET /v1/token/{chain}/{address}/pools` | Micro $0.002 |
| `GET /v1/search?q=` | Micro $0.002 |
| `GET /v1/trending/{chain}` | Low $0.01 |
| `GET /v1/new-pairs/{chain}` | Low $0.01 |
| `GET /v1/pair/{chain}/{pairAddress}/ohlcv?tf=` | Medium $0.03 |
| `GET /v1/token/{chain}/{address}/holders` | Medium $0.03 |
| `GET /v1/pair/{chain}/{pairAddress}/liquidity-history` | Medium $0.03 |
| `GET /v1/token/{chain}/{address}/volume-profile` | Medium $0.03 |
| `GET /v1/token/{chain}/{address}/rug-score` | Premium $0.08 |
| `GET /v1/token/{chain}/{address}/whale-activity` | Premium $0.08 |
| `POST /v1/watch` | Premium $0.08 |

Response envelope:

```json
{
  "data": {},
  "meta": { "chain": "qie", "generated_at": "ISO8601", "cache": "hit|miss" }
}
```

Use `chain=qie` (any other value returns 400).

## Internal routes (`/internal`, no payment)

Auth: `Authorization: Bearer $INTERNAL_API_KEY` or `x-api-key`.

- `GET /internal/stats` — requests, revenue, worker health
- `GET /internal/revenue` — endpoint/day breakdown
- `GET /internal/pools`, `/internal/tokens`, `/internal/trending`, `/internal/risk`
- Mirrors of price / rug-score / holders for the private dashboard

## Workers

| Worker | Interval | Job |
|---|---|---|
| `pollPrices` | 15s | Price/liquidity/volume → Postgres + Redis TTL 20s |
| `pollNewPairs` | 5m | New pool discovery |
| `pollHolders` | 1h | Holder snapshots |
| `pollRisk` | 1h | Risk flags (owner privileges, concentration, …) |
| `pollWatches` | 5m | Fires active `POST /v1/watch` webhooks with fresh endpoint data (SSRF-guarded — refuses loopback/private/link-local webhook targets) |

## Project layout

```
src/
  index.ts              # Express entry
  lib/                  # config, db, redis, Qie RPC/explorer/subgraph client, pricing
  middleware/           # x402 (EVM exact) + internal auth
  routes/               # v1 + internal
  services/market.ts    # query layer
  workers/              # cron pollers
prisma/schema.prisma
```
