/**
 * Seed Algorand Mainnet-shaped demo data so the API and dashboard work offline.
 * Real pollers overwrite/extend these rows when USE_MOCK_DATA=false.
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const tokens = [
  { address: "0", symbol: "ALGO", name: "Algorand", decimals: 6 },
  { address: "31566704", symbol: "USDC", name: "USD Coin", decimals: 6 },
  { address: "312769", symbol: "USDT", name: "Tether USDt", decimals: 6 },
  { address: "386192725", symbol: "goBTC", name: "Bitcoin", decimals: 8 },
  { address: "386195940", symbol: "goETH", name: "Ethereum", decimals: 8 },
  { address: "27165954", symbol: "PLANET", name: "Planet", decimals: 6 },
  { address: "137594422", symbol: "HEADLINE", name: "Headline", decimals: 6 },
  { address: "287867876", symbol: "OPUL", name: "Opulous", decimals: 10 },
  { address: "226701642", symbol: "YLDY", name: "Yieldly", decimals: 6 },
  { address: "300208676", symbol: "SMILE", name: "Smile Coin", decimals: 6 },
  { address: "470842789", symbol: "DEFLY", name: "Defly Token", decimals: 6 },
  { address: "511484048", symbol: "GORA", name: "Gora", decimals: 9 },
  { address: "403499324", symbol: "GARD", name: "GARD", decimals: 6 },
  { address: "441139422", symbol: "gobtc", name: "GoBTC (legacy)", decimals: 8 },
  { address: "465865291", symbol: "STBL", name: "AlgoStable", decimals: 6 },
  { address: "700965019", symbol: "VEST", name: "Vestige", decimals: 6 },
  { address: "796425061", symbol: "COOP", name: "Coop Coin", decimals: 6 },
  { address: "987346050", symbol: "CHIP", name: "Chip", decimals: 6 },
  { address: "1096015467", symbol: "FOLKS", name: "Folks Finance", decimals: 6 },
  { address: "1138500612", symbol: "TINY", name: "Tinyman", decimals: 6 },
  { address: "1241944285", symbol: "XET", name: "Xfinite", decimals: 9 },
  { address: "793124631", symbol: "ZONE", name: "Zone", decimals: 6 },
  { address: "688408515", symbol: "TAMO", name: "Tamago", decimals: 6 },
  { address: "444035862", symbol: "CHOICE", name: "Choice Coin", decimals: 2 },
];

const pools = [
  { poolAddress: "TM-ALGO-USDC-V2-001", token0: "0", token1: "31566704", dex: "tinyman", price: 0.18, liq: 4_200_000, vol: 890_000 },
  { poolAddress: "TM-ALGO-USDT-V2-002", token0: "0", token1: "312769", dex: "tinyman", price: 0.1795, liq: 1_100_000, vol: 210_000 },
  { poolAddress: "TM-GOBTC-ALGO-V2-003", token0: "386192725", token1: "0", dex: "tinyman", price: 65000, liq: 2_800_000, vol: 450_000 },
  { poolAddress: "PACT-ALGO-USDC-001", token0: "0", token1: "31566704", dex: "pact", price: 0.1802, liq: 980_000, vol: 120_000 },
  { poolAddress: "TM-PLANET-ALGO-V2-004", token0: "27165954", token1: "0", dex: "tinyman", price: 0.00042, liq: 85_000, vol: 12_500 },
  { poolAddress: "TM-OPUL-USDC-V2-005", token0: "287867876", token1: "31566704", dex: "tinyman", price: 0.085, liq: 320_000, vol: 48_000 },
  { poolAddress: "TM-GOETH-ALGO-V2-006", token0: "386195940", token1: "0", dex: "tinyman", price: 3400, liq: 1_450_000, vol: 280_000 },
  { poolAddress: "TM-YLDY-ALGO-V2-007", token0: "226701642", token1: "0", dex: "tinyman", price: 0.000018, liq: 42_000, vol: 8_200 },
  { poolAddress: "TM-SMILE-ALGO-V2-008", token0: "300208676", token1: "0", dex: "tinyman", price: 0.00012, liq: 28_000, vol: 4_100 },
  { poolAddress: "TM-DEFLY-ALGO-V2-009", token0: "470842789", token1: "0", dex: "tinyman", price: 0.0024, liq: 95_000, vol: 18_000 },
  { poolAddress: "TM-GORA-USDC-V2-010", token0: "511484048", token1: "31566704", dex: "tinyman", price: 0.045, liq: 210_000, vol: 35_000 },
  { poolAddress: "PACT-GARD-ALGO-011", token0: "403499324", token1: "0", dex: "pact", price: 0.98, liq: 560_000, vol: 72_000 },
  { poolAddress: "TM-STBL-USDC-V2-012", token0: "465865291", token1: "31566704", dex: "tinyman", price: 1.001, liq: 890_000, vol: 140_000 },
  { poolAddress: "TM-VEST-ALGO-V2-013", token0: "700965019", token1: "0", dex: "tinyman", price: 0.0088, liq: 64_000, vol: 11_000 },
  { poolAddress: "TM-TINY-ALGO-V2-014", token0: "1138500612", token1: "0", dex: "tinyman", price: 0.012, liq: 180_000, vol: 29_000 },
  { poolAddress: "TM-FOLKS-USDC-V2-015", token0: "1096015467", token1: "31566704", dex: "tinyman", price: 0.22, liq: 410_000, vol: 55_000 },
  { poolAddress: "TM-HEADLINE-ALGO-016", token0: "137594422", token1: "0", dex: "tinyman", price: 0.00035, liq: 18_000, vol: 2_400 },
  { poolAddress: "TM-CHIP-ALGO-V2-017", token0: "987346050", token1: "0", dex: "tinyman", price: 0.0011, liq: 33_000, vol: 5_600 },
  { poolAddress: "TM-ZONE-USDC-V2-018", token0: "793124631", token1: "31566704", dex: "tinyman", price: 0.0065, liq: 47_000, vol: 7_800 },
  { poolAddress: "PACT-CHOICE-ALGO-019", token0: "444035862", token1: "0", dex: "pact", price: 0.00008, liq: 12_000, vol: 1_900 },
  { poolAddress: "TM-COOP-ALGO-V2-020", token0: "796425061", token1: "0", dex: "tinyman", price: 0.00055, liq: 22_000, vol: 3_200 },
  { poolAddress: "TM-TAMO-ALGO-V2-021", token0: "688408515", token1: "0", dex: "tinyman", price: 0.00021, liq: 15_500, vol: 2_100 },
  { poolAddress: "TM-XET-ALGO-V2-022", token0: "1241944285", token1: "0", dex: "tinyman", price: 0.0009, liq: 26_000, vol: 4_400 },
];

function d(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

async function main() {
  console.log("Seeding Tremor (Algorand)…");

  // Clean market tables for a full reseed (keep payments if you want — wipe for consistency)
  await prisma.holder.deleteMany();
  await prisma.riskFlag.deleteMany();
  await prisma.ohlcv.deleteMany();
  await prisma.liquidityHistory.deleteMany();
  await prisma.priceSnapshot.deleteMany();
  await prisma.pool.deleteMany();
  // tokens may be referenced; delete and recreate
  await prisma.token.deleteMany();

  for (const t of tokens) {
    await prisma.token.create({
      data: { chain: "algorand", ...t },
    });
  }

  const now = Date.now();

  for (const p of pools) {
    await prisma.pool.create({
      data: {
        chain: "algorand",
        poolAddress: p.poolAddress,
        token0: p.token0,
        token1: p.token1,
        dex: p.dex,
        createdAt: new Date(now - Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000),
      },
    });

    for (let i = 24; i >= 0; i--) {
      const drift = 1 + (Math.sin(i / 3) + (Math.random() - 0.5) * 0.1) * 0.02;
      const price = p.price * drift;
      const ts = new Date(now - i * 60 * 60 * 1000);
      await prisma.priceSnapshot.create({
        data: {
          poolAddress: p.poolAddress,
          price: d(price),
          liquidityUsd: d(p.liq * (0.95 + Math.random() * 0.1)),
          volume24h: d(p.vol * (0.8 + Math.random() * 0.4)),
          ts,
        },
      });
      await prisma.liquidityHistory.create({
        data: {
          poolAddress: p.poolAddress,
          liquidityUsd: d(p.liq * (0.95 + Math.random() * 0.1)),
          ts,
        },
      });
    }

    for (let i = 48; i >= 0; i--) {
      const base = p.price * (1 + Math.sin(i / 5) * 0.03);
      const open = base * (1 + (Math.random() - 0.5) * 0.01);
      const close = base * (1 + (Math.random() - 0.5) * 0.01);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      await prisma.ohlcv.create({
        data: {
          poolAddress: p.poolAddress,
          timeframe: "1h",
          open: d(open),
          high: d(high),
          low: d(low),
          close: d(close),
          volume: d((p.vol / 24) * (0.5 + Math.random())),
          bucketTs: new Date(now - i * 60 * 60 * 1000),
        },
      });
    }

    for (let i = 30; i >= 0; i--) {
      const base = p.price * (1 + Math.sin(i / 4) * 0.08);
      await prisma.ohlcv.create({
        data: {
          poolAddress: p.poolAddress,
          timeframe: "1d",
          open: d(base * 0.99),
          high: d(base * 1.04),
          low: d(base * 0.96),
          close: d(base * 1.01),
          volume: d(p.vol * (0.7 + Math.random() * 0.6)),
          bucketTs: new Date(now - i * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  // Holders for all non-ALGO tokens
  for (const t of tokens.filter((x) => x.address !== "0")) {
    let remaining = 100;
    for (let i = 0; i < 15; i++) {
      const pct =
        i === 0
          ? 12 + Math.random() * 18
          : i < 3
            ? 4 + Math.random() * 8
            : Math.max(0.15, (remaining / (15 - i)) * (0.4 + Math.random()));
      remaining = Math.max(0, remaining - pct);
      await prisma.holder.create({
        data: {
          chain: "algorand",
          tokenAddress: t.address,
          holderAddress: `H${t.address.slice(0, 4)}${i.toString().padStart(2, "0")}${"A".repeat(48)}`.slice(0, 58),
          balance: d(Math.floor(1_000_000_000 * (pct / 100))),
          pctOfSupply: d(Number(pct.toFixed(4))),
          snapshotTs: new Date(),
        },
      });
    }
  }

  await prisma.riskFlag.createMany({
    data: [
      { tokenAddress: "27165954", flagType: "holder_concentration", severity: "medium", detailsJson: { top10Pct: 62.4 } },
      { tokenAddress: "287867876", flagType: "lp_unlocked", severity: "low", detailsJson: { lockedPct: 35 } },
      { tokenAddress: "137594422", flagType: "mint_authority", severity: "high", detailsJson: { mintable: true } },
      { tokenAddress: "300208676", flagType: "holder_concentration", severity: "high", detailsJson: { top10Pct: 78 } },
      { tokenAddress: "226701642", flagType: "lp_unlocked", severity: "medium", detailsJson: { lockedPct: 12 } },
      { tokenAddress: "444035862", flagType: "mint_authority", severity: "high", detailsJson: { mintable: true } },
      { tokenAddress: "987346050", flagType: "holder_concentration", severity: "medium", detailsJson: { top10Pct: 55 } },
    ],
  });

  // Skip re-seeding payments if already present
  const payCount = await prisma.paymentsLog.count();
  if (payCount < 50) {
    const endpoints = [
      { path: "/v1/token/algorand/*/price", amount: "0.002" },
      { path: "/v1/pair/algorand/*", amount: "0.003" },
      { path: "/v1/trending/algorand", amount: "0.01" },
      { path: "/v1/token/algorand/*/rug-score", amount: "0.08" },
      { path: "/v1/pair/algorand/*/ohlcv", amount: "0.03" },
    ];
    for (let day = 0; day < 10; day++) {
      for (const ep of endpoints) {
        const calls = 3 + Math.floor(Math.random() * 20);
        for (let c = 0; c < calls; c++) {
          await prisma.paymentsLog.create({
            data: {
              requestId: `seed2-${day}-${ep.path}-${c}`,
              endpoint: ep.path,
              payerAddress: `PAYER${c}${"B".repeat(50)}`.slice(0, 58),
              amount: ep.amount,
              txId: `SEEDTX${day}${c}${Math.random().toString(36).slice(2, 8)}`,
              ts: new Date(now - day * 24 * 60 * 60 * 1000 - c * 60_000),
            },
          });
        }
      }
    }
  }

  for (const worker of ["pollPrices", "pollNewPairs", "pollHolders", "pollRisk"]) {
    await prisma.workerRun.create({
      data: {
        worker,
        status: "success",
        startedAt: new Date(now - 60_000),
        finishedAt: new Date(now - 55_000),
        detail: "seed",
      },
    });
  }

  console.log(`Seed complete: ${tokens.length} tokens, ${pools.length} pools.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
