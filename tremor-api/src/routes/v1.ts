import { Router } from "express";
import { ok, fail } from "../lib/envelope.js";
import * as market from "../services/market.js";
import { paymentLogger } from "../middleware/x402.js";

export const v1Router = Router();

// Log successful paid calls (x402 middleware sits above this router)
v1Router.use(paymentLogger);

function handle(fn: (req: import("express").Request) => Promise<{ data: unknown; cache: "hit" | "miss" | "bypass" }>) {
  return async (req: import("express").Request, res: import("express").Response) => {
    try {
      const { data, cache } = await fn(req);
      return ok(res, data, { cache });
    } catch (err) {
      const status = (err as Error & { status?: number }).status ?? 500;
      return fail(res, status, (err as Error).message);
    }
  };
}

// GET /v1/token/{chain}/{address}/price
v1Router.get(
  "/token/:chain/:address/price",
  handle(async (req) => market.getTokenPrice(req.params.chain, req.params.address)),
);

// GET /v1/token/{chain}/{address}/pools
v1Router.get(
  "/token/:chain/:address/pools",
  handle(async (req) => market.getTokenPools(req.params.chain, req.params.address)),
);

// GET /v1/token/{chain}/{address}/holders
v1Router.get(
  "/token/:chain/:address/holders",
  handle(async (req) => market.getHolders(req.params.chain, req.params.address)),
);

// GET /v1/token/{chain}/{address}/volume-profile
v1Router.get(
  "/token/:chain/:address/volume-profile",
  handle(async (req) => market.getVolumeProfile(req.params.chain, req.params.address)),
);

// GET /v1/token/{chain}/{address}/rug-score
v1Router.get(
  "/token/:chain/:address/rug-score",
  handle(async (req) => market.getRugScore(req.params.chain, req.params.address)),
);

// GET /v1/token/{chain}/{address}/whale-activity
v1Router.get(
  "/token/:chain/:address/whale-activity",
  handle(async (req) => {
    const hours = parseInt((req.query.hours as string) || "24", 10);
    return market.getWhaleActivity(req.params.chain, req.params.address, hours);
  }),
);

// GET /v1/pair/{chain}/{pairAddress}
v1Router.get(
  "/pair/:chain/:pairAddress",
  handle(async (req) => market.getPair(req.params.chain, req.params.pairAddress)),
);

// GET /v1/pair/{chain}/{pairAddress}/ohlcv
v1Router.get(
  "/pair/:chain/:pairAddress/ohlcv",
  handle(async (req) => {
    const tf = (req.query.tf as string) || "1h";
    const limit = parseInt((req.query.limit as string) || "100", 10);
    return market.getOhlcv(req.params.chain, req.params.pairAddress, tf, limit);
  }),
);

// GET /v1/pair/{chain}/{pairAddress}/liquidity-history
v1Router.get(
  "/pair/:chain/:pairAddress/liquidity-history",
  handle(async (req) =>
    market.getLiquidityHistory(req.params.chain, req.params.pairAddress),
  ),
);

// GET /v1/trending/{chain}
v1Router.get(
  "/trending/:chain",
  handle(async (req) => market.getTrending(req.params.chain)),
);

// GET /v1/new-pairs/{chain}
v1Router.get(
  "/new-pairs/:chain",
  handle(async (req) => market.getNewPairs(req.params.chain)),
);

// GET /v1/search?q=
v1Router.get(
  "/search",
  handle(async (req) => market.search((req.query.q as string) || "")),
);

// POST /v1/watch
v1Router.post(
  "/watch",
  handle(async (req) => {
    const body = req.body || {};
    if (!body.target_type || !body.target_address) {
      const err = new Error("target_type and target_address are required");
      (err as Error & { status: number }).status = 400;
      throw err;
    }
    return market.createWatch(body);
  }),
);
