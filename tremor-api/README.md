# Tremor API

Metered, pay-per-request **Algorand** market-data API for the [Algorand Global x402 Challenge](https://algorand.co/global-x402-challenge).

- **Chain scope:** Algorand only (Mainnet for competition; Testnet for dry runs)
- **Payments:** x402 `exact` scheme via **GoPlausible facilitator**
- **Discovery:** Bazaar extension + `x402-global-challenge` tag
- **Stack:** Node.js, TypeScript, Express, Prisma/Postgres, Redis, `@x402/express` + `@x402/avm`

## Architecture

```
Indexer / Tinyman  →  workers  →  Postgres + Redis
                                      ↓
                         Express + x402 middleware
                         /v1/* (paid)   /internal/* (API key)
```

## Quick start

```bash
# From monorepo root
docker compose up -d

cd tremor-api
cp .env.example .env
# edit PAYTO_ADDRESS, INTERNAL_API_KEY, NETWORK

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
| `GOPLAUSIBLE_FACILITATOR_URL` | Default `https://facilitator.goplausible.xyz` |
| `PAYTO_ADDRESS` | Algorand address receiving USDC (must opt-in ASA) |
| `NETWORK` | `testnet` or `mainnet` |
| `INTERNAL_API_KEY` | Bearer token for `/internal/*` |
| `ALGOD_URL` / `INDEXER_URL` | AlgoNode or your own nodes |
| `USE_MOCK_DATA` | `true` = seed/jitter mode without live DEX mapping |

### Network constants

| | Testnet | Mainnet |
|---|---|---|
| CAIP-2 | `ALGORAND_TESTNET_CAIP2` | `ALGORAND_MAINNET_CAIP2` |
| USDC ASA | `10458941` | `31566704` |

## Public endpoints (`/v1`, x402 USDC)

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
  "meta": { "chain": "algorand", "generated_at": "ISO8601", "cache": "hit|miss" }
}
```

Use `chain=algorand` (or any path segment — non-`algorand` returns 400).

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
| `pollRisk` | 1h | Risk flags (mint authority, concentration, …) |

## Competition checklist

1. Testnet: `NETWORK=testnet`, USDC ASA 10458941, payTo opted-in  
2. Mainnet: `NETWORK=mainnet`, USDC ASA 31566704, public HTTPS  
3. Same `PAYTO_ADDRESS` for all routes (Composite entry rollup)  
4. Facilitator = GoPlausible only  
5. `tag: x402-global-challenge` is set in payment `extra`  
6. Bazaar discovery extension registered  
7. Complete ≥1 real Mainnet payment; confirm USDC received  
8. Verify listing under [Bazaar / leaderboard](https://facilitator.goplausible.xyz/dashboard)

## Project layout

```
src/
  index.ts              # Express entry
  lib/                  # config, db, redis, algorand client, pricing
  middleware/           # x402 + internal auth
  routes/               # v1 + internal
  services/market.ts    # query layer
  workers/              # cron pollers
prisma/schema.prisma
```
