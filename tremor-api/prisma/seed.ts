/**
 * Seed Qie Mainnet-shaped demo data so the API and dashboard work offline
 * (USE_MOCK_DATA=true). Real pollers overwrite/extend these rows otherwise.
 *
 * Addresses below are synthetic (sequential 0x1000…/0x2000… placeholders) —
 * they are NOT real deployed contracts. WQIE uses the real configured address
 * so dashboard links to it resolve correctly even in offline/demo mode.
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function synth(prefix: string, n: number): string {
  return `0x${prefix}${n.toString(16).padStart(40 - prefix.length, "0")}`;
}

const tokens = [
  { address: "0", symbol: "QIE", name: "Qie", decimals: 18 },
  { address: "0x0087904D95BEe9E5F24dc8852804b547981A9139", symbol: "WQIE", name: "Wrapped Qie", decimals: 18 },
  { address: synth("1000", 1), symbol: "qUSDC", name: "Qie USD Coin (demo)", decimals: 6 },
  { address: synth("1000", 2), symbol: "qUSDT", name: "Qie Tether USD (demo)", decimals: 6 },
  { address: synth("1000", 3), symbol: "wBTC", name: "Wrapped Bitcoin (demo)", decimals: 8 },
  { address: synth("1000", 4), symbol: "wETH", name: "Wrapped Ether (demo)", decimals: 18 },
  { address: synth("1000", 5), symbol: "COMET", name: "Comet Token (demo)", decimals: 18 },
  { address: synth("1000", 6), symbol: "BEACON", name: "Beacon Token (demo)", decimals: 18 },
  { address: synth("1000", 7), symbol: "EMBER", name: "Ember Token (demo)", decimals: 18 },
  { address: synth("1000", 8), symbol: "CINDER", name: "Cinder Token (demo)", decimals: 18 },
  { address: synth("1000", 9), symbol: "DRIFT", name: "Drift Token (demo)", decimals: 18 },
  { address: synth("1000", 10), symbol: "HAVEN", name: "Haven Token (demo)", decimals: 18 },
  { address: synth("1000", 11), symbol: "LUMEN", name: "Lumen Token (demo)", decimals: 18 },
  { address: synth("1000", 12), symbol: "NOVA", name: "Nova Token (demo)", decimals: 18 },
  { address: synth("1000", 13), symbol: "ORBIT", name: "Orbit Stable (demo)", decimals: 18 },
  { address: synth("1000", 14), symbol: "PULSE", name: "Pulse Token (demo)", decimals: 18 },
  { address: synth("1000", 15), symbol: "QUARTZ", name: "Quartz Token (demo)", decimals: 18 },
  { address: synth("1000", 16), symbol: "RALLY", name: "Rally Token (demo)", decimals: 18 },
  { address: synth("1000", 17), symbol: "SOLSTICE", name: "Solstice Token (demo)", decimals: 18 },
  { address: synth("1000", 18), symbol: "TUNDRA", name: "Tundra Token (demo)", decimals: 18 },
  { address: synth("1000", 19), symbol: "VERTEX", name: "Vertex Token (demo)", decimals: 18 },
  { address: synth("1000", 20), symbol: "WILLOW", name: "Willow Token (demo)", decimals: 18 },
  { address: synth("1000", 21), symbol: "ZENITH", name: "Zenith Token (demo)", decimals: 18 },
  { address: synth("1000", 22), symbol: "ASTRA", name: "Astra Token (demo)", decimals: 18 },
];

const QIE = "0";
const WQIE = "0x0087904D95BEe9E5F24dc8852804b547981A9139";
const qUSDC = synth("1000", 1);

const pools = [
  { poolAddress: synth("2000", 1), token0: QIE, token1: qUSDC, dex: "qie-dex", price: 0.18, liq: 4_200_000, vol: 890_000 },
  { poolAddress: synth("2000", 2), token0: QIE, token1: synth("1000", 2), dex: "qie-dex", price: 0.1795, liq: 1_100_000, vol: 210_000 },
  { poolAddress: synth("2000", 3), token0: synth("1000", 3), token1: QIE, dex: "qie-dex", price: 65000, liq: 2_800_000, vol: 450_000 },
  { poolAddress: synth("2000", 4), token0: QIE, token1: qUSDC, dex: "qie-dex", price: 0.1802, liq: 980_000, vol: 120_000 },
  { poolAddress: synth("2000", 5), token0: synth("1000", 5), token1: QIE, dex: "qie-dex", price: 0.00042, liq: 85_000, vol: 12_500 },
  { poolAddress: synth("2000", 6), token0: synth("1000", 7), token1: qUSDC, dex: "qie-dex", price: 0.085, liq: 320_000, vol: 48_000 },
  { poolAddress: synth("2000", 7), token0: synth("1000", 4), token1: QIE, dex: "qie-dex", price: 3400, liq: 1_450_000, vol: 280_000 },
  { poolAddress: synth("2000", 8), token0: synth("1000", 8), token1: QIE, dex: "qie-dex", price: 0.000018, liq: 42_000, vol: 8_200 },
  { poolAddress: synth("2000", 9), token0: synth("1000", 9), token1: QIE, dex: "qie-dex", price: 0.00012, liq: 28_000, vol: 4_100 },
  { poolAddress: synth("2000", 10), token0: synth("1000", 10), token1: QIE, dex: "qie-dex", price: 0.0024, liq: 95_000, vol: 18_000 },
  { poolAddress: synth("2000", 11), token0: synth("1000", 11), token1: qUSDC, dex: "qie-dex", price: 0.045, liq: 210_000, vol: 35_000 },
  { poolAddress: synth("2000", 12), token0: synth("1000", 12), token1: QIE, dex: "qie-dex", price: 0.98, liq: 560_000, vol: 72_000 },
  { poolAddress: synth("2000", 13), token0: synth("1000", 13), token1: qUSDC, dex: "qie-dex", price: 1.001, liq: 890_000, vol: 140_000 },
  { poolAddress: synth("2000", 14), token0: synth("1000", 14), token1: QIE, dex: "qie-dex", price: 0.0088, liq: 64_000, vol: 11_000 },
  { poolAddress: synth("2000", 15), token0: synth("1000", 18), token1: QIE, dex: "qie-dex", price: 0.012, liq: 180_000, vol: 29_000 },
  { poolAddress: synth("2000", 16), token0: synth("1000", 17), token1: qUSDC, dex: "qie-dex", price: 0.22, liq: 410_000, vol: 55_000 },
  { poolAddress: synth("2000", 17), token0: synth("1000", 6), token1: QIE, dex: "qie-dex", price: 0.00035, liq: 18_000, vol: 2_400 },
  { poolAddress: synth("2000", 18), token0: synth("1000", 16), token1: QIE, dex: "qie-dex", price: 0.0011, liq: 33_000, vol: 5_600 },
  { poolAddress: synth("2000", 19), token0: synth("1000", 20), token1: qUSDC, dex: "qie-dex", price: 0.0065, liq: 47_000, vol: 7_800 },
  { poolAddress: synth("2000", 20), token0: synth("1000", 22), token1: QIE, dex: "qie-dex", price: 0.00008, liq: 12_000, vol: 1_900 },
  { poolAddress: synth("2000", 21), token0: synth("1000", 15), token1: QIE, dex: "qie-dex", price: 0.00055, liq: 22_000, vol: 3_200 },
  { poolAddress: synth("2000", 22), token0: synth("1000", 21), token1: QIE, dex: "qie-dex", price: 0.00021, liq: 15_500, vol: 2_100 },
  { poolAddress: synth("2000", 23), token0: synth("1000", 19), token1: QIE, dex: "qie-dex", price: 0.0009, liq: 26_000, vol: 4_400 },
];

function d(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.FORCE_SEED !== "true") {
    console.error(
      "Refusing to run: NODE_ENV=production and FORCE_SEED is not \"true\". " +
        "This script deletes all tokens/pools/snapshots/holders/risk flags before reseeding demo data. " +
        "Set FORCE_SEED=true if you really mean to wipe production data.",
    );
    process.exit(1);
  }

  console.log("Seeding Tremor (Qie)…");

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
      data: { chain: "qie", ...t },
    });
  }

  const now = Date.now();

  for (const p of pools) {
    await prisma.pool.create({
      data: {
        chain: "qie",
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

  // Holders for all non-native tokens
  for (const t of tokens.filter((x) => x.address !== QIE)) {
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
          chain: "qie",
          tokenAddress: t.address,
          holderAddress: `0x${i.toString(16).padStart(2, "0")}${"a".repeat(38)}`,
          balance: d(Math.floor(1_000_000_000 * (pct / 100))),
          pctOfSupply: d(Number(pct.toFixed(4))),
          snapshotTs: new Date(),
        },
      });
    }
  }

  await prisma.riskFlag.createMany({
    data: [
      { tokenAddress: synth("1000", 5), flagType: "holder_concentration", severity: "medium", detailsJson: { top10Pct: 62.4 } },
      { tokenAddress: synth("1000", 7), flagType: "lp_unlocked", severity: "low", detailsJson: { lockedPct: 35 } },
      { tokenAddress: synth("1000", 6), flagType: "mint_authority", severity: "high", detailsJson: { mintable: true } },
      { tokenAddress: synth("1000", 9), flagType: "holder_concentration", severity: "high", detailsJson: { top10Pct: 78 } },
      { tokenAddress: synth("1000", 8), flagType: "lp_unlocked", severity: "medium", detailsJson: { lockedPct: 12 } },
      { tokenAddress: synth("1000", 22), flagType: "mint_authority", severity: "high", detailsJson: { mintable: true } },
      { tokenAddress: synth("1000", 16), flagType: "holder_concentration", severity: "medium", detailsJson: { top10Pct: 55 } },
    ],
  });

  // Skip re-seeding payments if already present
  const payCount = await prisma.paymentsLog.count();
  if (payCount < 50) {
    const endpoints = [
      { path: "/v1/token/qie/*/price", amount: "0.002" },
      { path: "/v1/pair/qie/*", amount: "0.003" },
      { path: "/v1/trending/qie", amount: "0.01" },
      { path: "/v1/token/qie/*/rug-score", amount: "0.08" },
      { path: "/v1/pair/qie/*/ohlcv", amount: "0.03" },
    ];
    for (let day = 0; day < 10; day++) {
      for (const ep of endpoints) {
        const calls = 3 + Math.floor(Math.random() * 20);
        for (let c = 0; c < calls; c++) {
          await prisma.paymentsLog.create({
            data: {
              requestId: `seed2-${day}-${ep.path}-${c}`,
              endpoint: ep.path,
              payerAddress: `0x${c.toString(16).padStart(2, "0")}${"b".repeat(38)}`,
              amount: ep.amount,
              txId: `0xseedtx${day}${c}${Math.random().toString(36).slice(2, 8)}`,
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
