import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./lib/config.js";
import { initRedis } from "./lib/redis.js";
import { prisma } from "./lib/db.js";
import { healthCheckChain } from "./lib/algorand.js";
import { v1Router } from "./routes/v1.js";
import { internalRouter } from "./routes/internal.js";
import { createX402Middleware } from "./middleware/x402.js";
import { ENDPOINT_PRICES, PRICE_TIERS } from "./lib/pricing.js";

async function main() {
  await initRedis();

  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

  // Public metadata (no payment)
  app.get("/", (_req, res) => {
    res.json({
      name: "Tremor API",
      version: "1.0.0",
      chain: "algorand",
      network: config.network,
      challenge_tag: config.challengeTag,
      facilitator: config.facilitatorUrl,
      description:
        "Metered Algorand market-data API — prices, pools, OHLCV, holders, rug-score — paid via x402 USDC",
      docs: {
        health: "/health",
        endpoints: "/v1/* (x402 paid)",
        internal: "/internal/* (API key)",
      },
      pricing_tiers: PRICE_TIERS,
      endpoints: ENDPOINT_PRICES,
    });
  });

  app.get("/health", async (_req, res) => {
    let dbOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
    const chain = await healthCheckChain();
    const status = dbOk ? "ok" : "degraded";
    res.status(dbOk ? 200 : 503).json({
      status,
      chain: "algorand",
      network: config.network,
      database: dbOk,
      indexer: chain.indexer,
      uptime_s: Math.floor(process.uptime()),
      ts: new Date().toISOString(),
    });
  });

  // x402 payment gate on all /v1 routes (GoPlausible facilitator + Bazaar + challenge tag)
  const { middleware: x402 } = createX402Middleware();
  app.use(x402);

  // Public paid API
  app.use("/v1", v1Router);

  // Internal dashboard API (no x402)
  app.use("/internal", internalRouter);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("[error]", err);
      res.status(500).json({ error: "Internal server error", message: err.message });
    },
  );

  app.listen(config.port, () => {
    console.log(`Tremor API listening on :${config.port}`);
    console.log(`  network:     ${config.network}`);
    console.log(`  facilitator: ${config.facilitatorUrl}`);
    console.log(`  payTo:       ${config.payTo}`);
    console.log(`  mock data:   ${config.useMockData}`);
    console.log(`  challenge:   ${config.challengeTag}`);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
