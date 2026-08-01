import { Router } from "express";
import { ok, fail } from "../lib/envelope.js";
import { internalAuth } from "../middleware/internalAuth.js";
import * as market from "../services/market.js";
import { prisma } from "../lib/db.js";

/**
 * Internal-only routes: same data as /v1, no x402 charge.
 * Protected by INTERNAL_API_KEY. Used solely by tremor-dashboard.
 */
export const internalRouter = Router();
internalRouter.use(internalAuth);

function handle(fn: (req: import("express").Request) => Promise<unknown>) {
  return async (req: import("express").Request, res: import("express").Response) => {
    try {
      const data = await fn(req);
      return ok(res, data, { cache: "bypass" });
    } catch (err) {
      const status = (err as Error & { status?: number }).status ?? 500;
      return fail(res, status, (err as Error).message);
    }
  };
}

internalRouter.get(
  "/stats",
  handle(async () => market.getStats()),
);

internalRouter.get(
  "/revenue",
  handle(async (req) => {
    const days = parseInt((req.query.days as string) || "30", 10);
    return market.getRevenueBreakdown(days);
  }),
);

internalRouter.get(
  "/pools",
  handle(async () => market.listPools()),
);

internalRouter.get(
  "/pools/:address",
  handle(async (req) => {
    const pair = await market.getPair("algorand", req.params.address);
    const ohlcv = await market.getOhlcv("algorand", req.params.address, "1h", 100);
    const liq = await market.getLiquidityHistory("algorand", req.params.address);
    return {
      pair: pair.data,
      ohlcv: ohlcv.data,
      liquidity_history: liq.data,
    };
  }),
);

internalRouter.get(
  "/tokens",
  handle(async () => market.listTokensWithRisk()),
);

internalRouter.get(
  "/trending",
  handle(async () => {
    const t = await market.getTrending("algorand");
    const n = await market.getNewPairs("algorand");
    return { trending: t.data, new_pairs: n.data };
  }),
);

internalRouter.get(
  "/risk",
  handle(async () => {
    const flags = await market.listRiskFlags();
    return flags.map((f) => ({
      id: f.id,
      token_address: f.tokenAddress,
      symbol: f.token?.symbol ?? null,
      name: f.token?.name ?? null,
      flag_type: f.flagType,
      severity: f.severity,
      detected_at: f.detectedAt.toISOString(),
      details: f.detailsJson,
    }));
  }),
);

internalRouter.get(
  "/search",
  handle(async (req) => {
    const r = await market.search((req.query.q as string) || "");
    return r.data;
  }),
);

// Mirror individual market endpoints for dashboard detail views
internalRouter.get(
  "/token/:address/price",
  handle(async (req) => {
    const r = await market.getTokenPrice("algorand", req.params.address);
    return r.data;
  }),
);

internalRouter.get(
  "/token/:address/rug-score",
  handle(async (req) => {
    const r = await market.getRugScore("algorand", req.params.address);
    return r.data;
  }),
);

internalRouter.get(
  "/token/:address/holders",
  handle(async (req) => {
    const r = await market.getHolders("algorand", req.params.address);
    return r.data;
  }),
);

internalRouter.get(
  "/token/:address/pools",
  handle(async (req) => {
    const r = await market.getTokenPools("algorand", req.params.address);
    return r.data;
  }),
);

internalRouter.get(
  "/token/:address/volume-profile",
  handle(async (req) => {
    const r = await market.getVolumeProfile("algorand", req.params.address);
    return r.data;
  }),
);

internalRouter.get(
  "/token/:address/whale-activity",
  handle(async (req) => {
    const hours = parseInt((req.query.hours as string) || "24", 10);
    const r = await market.getWhaleActivity("algorand", req.params.address, hours);
    return r.data;
  }),
);

internalRouter.get(
  "/token/:address/full",
  handle(async (req) => market.getTokenMarketDetail(req.params.address)),
);

internalRouter.get(
  "/workers",
  handle(async () => {
    const workers = ["pollPrices", "pollNewPairs", "pollHolders", "pollRisk"];
    return Promise.all(
      workers.map(async (w) => {
        const last = await prisma.workerRun.findFirst({
          where: { worker: w },
          orderBy: { startedAt: "desc" },
        });
        return {
          worker: w,
          status: last?.status ?? "unknown",
          last_run: last?.startedAt?.toISOString() ?? null,
          finished_at: last?.finishedAt?.toISOString() ?? null,
          detail: last?.detail ?? null,
          error: last?.error ?? null,
        };
      }),
    );
  }),
);

internalRouter.get(
  "/payments/recent",
  handle(async (req) => {
    const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200);
    const rows = await prisma.paymentsLog.findMany({
      orderBy: { ts: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      request_id: r.requestId,
      endpoint: r.endpoint,
      payer: r.payerAddress,
      amount: r.amount,
      tx_id: r.txId,
      ts: r.ts.toISOString(),
    }));
  }),
);
