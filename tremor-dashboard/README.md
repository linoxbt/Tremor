# Tremor Market UI

Professional **Qie DEX screener** (DexScreener-class product surface) with a design language inspired by [stacks.co](https://www.stacks.co/) — deep black canvas, warm orange accent, editorial typography, clean data density.

Not a generic admin template. Markets are first-class; operator tools live under `/ops`.

## Surfaces

| Route | What you get |
|---|---|
| `/` | Markets home — hero stats, ticker strip, pulse cards, full pair table |
| `/trending` | Top movers + ranked volume table |
| `/new-pairs` | Recently discovered pools |
| `/gainers` | Split gainers / losers |
| `/tokens` | Token cards with concentration + rug score |
| `/pair/[address]` | Pair terminal — price/liquidity charts, meta |
| `/token/[address]` | Token deep dive — risk factors, holders, pools |
| `/ops` | Operator overview (revenue / workers) |
| `/ops/revenue` | Endpoint revenue charts |
| `/ops/risk` | Risk flag ledger |

**Search:** `⌘K` / `Ctrl+K` global modal.

## Design notes

- **Accent:** `#ff6b2c` (warm orange, Stacks-adjacent)
- **Type:** Instrument Sans (display) · DM Sans (UI) · JetBrains Mono (nums)
- **Layout:** top nav + sticky header, max width 1440, glass cards
- **Tables:** sticky headers, sort, hover rows → pair detail

## Setup

```bash
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4021
# INTERNAL_API_KEY=<same as API>

npm install
npm run dev   # http://localhost:3000
```

Requires `tremor-api` with seed data + matching `INTERNAL_API_KEY`.
