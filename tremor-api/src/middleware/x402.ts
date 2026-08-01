/**
 * x402 payment middleware for /v1/* routes.
 * Settles via GoPlausible facilitator on Algorand (Testnet/Mainnet).
 * Registers Bazaar discovery + x402-global-challenge tag.
 */
import {
  paymentMiddleware,
  x402ResourceServer,
} from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { RoutesConfig } from "@x402/core/server";
import type { Network } from "@x402/core/types";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { USDC_TESTNET_ASA_ID, USDC_MAINNET_ASA_ID } from "@x402/avm";
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
} from "@x402/extensions";
import { config } from "../lib/config.js";
import { PRICE_TIERS, ENDPOINT_PRICES } from "../lib/pricing.js";
import { prisma } from "../lib/db.js";
import { v4 as uuidv4 } from "uuid";
import type { RequestHandler } from "express";

/**
 * Full CAIP-2 IDs as advertised by GoPlausible `/supported`.
 * (Package constants use a truncated form that fails facilitator scheme matching.)
 */
const FACILITATOR_ALGORAND_MAINNET =
  "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=" as Network;
const FACILITATOR_ALGORAND_TESTNET =
  "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=" as Network;

function networkCaip2(): Network {
  return config.isMainnet
    ? FACILITATOR_ALGORAND_MAINNET
    : FACILITATOR_ALGORAND_TESTNET;
}

function usdcAsset(): string {
  return config.isMainnet ? USDC_MAINNET_ASA_ID : USDC_TESTNET_ASA_ID;
}

function accept(price: string) {
  return {
    scheme: "exact" as const,
    network: networkCaip2(),
    payTo: config.payTo,
    price,
    extra: {
      asset: usdcAsset(),
      name: "USDC",
      decimals: 6,
      /** Required for Algorand Global x402 Challenge tracking */
      tag: config.challengeTag,
    },
  };
}

/** Friendlier JSON body alongside PAYMENT-REQUIRED header (x402 v2). */
function unpaidBody(price: string, description: string) {
  return {
    unpaidResponseBody: () => ({
      contentType: "application/json",
      body: {
        error: "Payment Required",
        message: description,
        price,
        asset: "USDC",
        network: networkCaip2(),
        payTo: config.payTo,
        challenge_tag: config.challengeTag,
        facilitator: config.facilitatorUrl,
        hint: "Retry with a valid x402 PAYMENT-SIGNATURE header after settling USDC via GoPlausible",
      },
    }),
  };
}

function discoveryFor(sampleOutput: Record<string, unknown>) {
  return declareDiscoveryExtension({
    output: {
      example: {
        data: sampleOutput,
        meta: {
          chain: "qie",
          generated_at: new Date().toISOString(),
          cache: "miss",
        },
      },
    },
  });
}

/**
 * Build route map for @x402/express paymentMiddleware.
 */
export function buildX402Routes(): RoutesConfig {
  return {
    "GET /v1/token/:chain/:address/price": {
      accepts: accept(PRICE_TIERS.micro.price),
      description: ENDPOINT_PRICES["GET /v1/token/:chain/:address/price"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ price_usd: 0.18, symbol: "ALGO" }),
      ...unpaidBody(PRICE_TIERS.micro.price, ENDPOINT_PRICES["GET /v1/token/:chain/:address/price"].description),
    },
    "GET /v1/pair/:chain/:pairAddress": {
      accepts: accept(PRICE_TIERS.micro.price),
      description: ENDPOINT_PRICES["GET /v1/pair/:chain/:pairAddress"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ price_usd: 0.18, liquidity_usd: 1_000_000 }),
      ...unpaidBody(PRICE_TIERS.micro.price, ENDPOINT_PRICES["GET /v1/pair/:chain/:pairAddress"].description),
    },
    "GET /v1/token/:chain/:address/pools": {
      accepts: accept(PRICE_TIERS.micro.price),
      description: ENDPOINT_PRICES["GET /v1/token/:chain/:address/pools"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ pools: [] }),
      ...unpaidBody(PRICE_TIERS.micro.price, ENDPOINT_PRICES["GET /v1/token/:chain/:address/pools"].description),
    },
    "GET /v1/trending/:chain": {
      accepts: accept(PRICE_TIERS.low.price),
      description: ENDPOINT_PRICES["GET /v1/trending/:chain"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ trending: [] }),
      ...unpaidBody(PRICE_TIERS.low.price, ENDPOINT_PRICES["GET /v1/trending/:chain"].description),
    },
    "GET /v1/new-pairs/:chain": {
      accepts: accept(PRICE_TIERS.low.price),
      description: ENDPOINT_PRICES["GET /v1/new-pairs/:chain"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ pairs: [] }),
      ...unpaidBody(PRICE_TIERS.low.price, ENDPOINT_PRICES["GET /v1/new-pairs/:chain"].description),
    },
    "GET /v1/search": {
      accepts: accept(PRICE_TIERS.micro.price),
      description: ENDPOINT_PRICES["GET /v1/search"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ tokens: [], pairs: [] }),
      ...unpaidBody(PRICE_TIERS.micro.price, ENDPOINT_PRICES["GET /v1/search"].description),
    },
    "GET /v1/pair/:chain/:pairAddress/ohlcv": {
      accepts: accept(PRICE_TIERS.medium.price),
      description: ENDPOINT_PRICES["GET /v1/pair/:chain/:pairAddress/ohlcv"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ candles: [] }),
      ...unpaidBody(PRICE_TIERS.medium.price, ENDPOINT_PRICES["GET /v1/pair/:chain/:pairAddress/ohlcv"].description),
    },
    "GET /v1/token/:chain/:address/holders": {
      accepts: accept(PRICE_TIERS.medium.price),
      description: ENDPOINT_PRICES["GET /v1/token/:chain/:address/holders"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ holders: [] }),
      ...unpaidBody(PRICE_TIERS.medium.price, ENDPOINT_PRICES["GET /v1/token/:chain/:address/holders"].description),
    },
    "GET /v1/pair/:chain/:pairAddress/liquidity-history": {
      accepts: accept(PRICE_TIERS.medium.price),
      description:
        ENDPOINT_PRICES["GET /v1/pair/:chain/:pairAddress/liquidity-history"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ series: [] }),
      ...unpaidBody(
        PRICE_TIERS.medium.price,
        ENDPOINT_PRICES["GET /v1/pair/:chain/:pairAddress/liquidity-history"].description,
      ),
    },
    "GET /v1/token/:chain/:address/volume-profile": {
      accepts: accept(PRICE_TIERS.medium.price),
      description: ENDPOINT_PRICES["GET /v1/token/:chain/:address/volume-profile"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ pressure: {} }),
      ...unpaidBody(
        PRICE_TIERS.medium.price,
        ENDPOINT_PRICES["GET /v1/token/:chain/:address/volume-profile"].description,
      ),
    },
    "GET /v1/token/:chain/:address/rug-score": {
      accepts: accept(PRICE_TIERS.premium.price),
      description: ENDPOINT_PRICES["GET /v1/token/:chain/:address/rug-score"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ rug_score: 42 }),
      ...unpaidBody(
        PRICE_TIERS.premium.price,
        ENDPOINT_PRICES["GET /v1/token/:chain/:address/rug-score"].description,
      ),
    },
    "GET /v1/token/:chain/:address/whale-activity": {
      accepts: accept(PRICE_TIERS.premium.price),
      description: ENDPOINT_PRICES["GET /v1/token/:chain/:address/whale-activity"].description,
      mimeType: "application/json",
      extensions: discoveryFor({ whales: [] }),
      ...unpaidBody(
        PRICE_TIERS.premium.price,
        ENDPOINT_PRICES["GET /v1/token/:chain/:address/whale-activity"].description,
      ),
    },
    "POST /v1/watch": {
      accepts: accept(PRICE_TIERS.premium.price),
      description: ENDPOINT_PRICES["POST /v1/watch"].description,
      mimeType: "application/json",
      extensions: declareDiscoveryExtension({
        bodyType: "json",
        input: {
          target_type: "token",
          target_address: "31566704",
          endpoints: ["price", "rug-score"],
        },
        inputSchema: {
          properties: {
            target_type: { type: "string", enum: ["token", "pair"] },
            target_address: { type: "string" },
            endpoints: { type: "array", items: { type: "string" } },
            webhook_url: { type: "string" },
          },
          required: ["target_type", "target_address"],
        },
        output: {
          example: {
            data: { id: "cuid", active: true },
            meta: { chain: "qie", generated_at: new Date().toISOString(), cache: "bypass" },
          },
        },
      }),
      ...unpaidBody(PRICE_TIERS.premium.price, ENDPOINT_PRICES["POST /v1/watch"].description),
    },
  };
}

export function createX402Middleware(): {
  middleware: RequestHandler;
  server: x402ResourceServer;
} {
  const facilitatorClient = new HTTPFacilitatorClient({
    url: config.facilitatorUrl,
  });

  const server = new x402ResourceServer(facilitatorClient)
    .register(FACILITATOR_ALGORAND_TESTNET, new ExactAvmScheme())
    .register(FACILITATOR_ALGORAND_MAINNET, new ExactAvmScheme())
    .register("algorand:*" as Network, new ExactAvmScheme());

  // Dev/local: skip hard fail when facilitator scheme list is temporarily unreachable
  const syncOnStart = process.env.X402_SYNC_ON_START !== "false";

  // Enable Bazaar discovery so GoPlausible catalogs endpoints after first settlement
  try {
    server.registerExtension(bazaarResourceServerExtension);
  } catch (err) {
    console.warn("[x402] bazaar extension registration:", (err as Error).message);
  }

  const routes = buildX402Routes();
  const middleware = paymentMiddleware(routes, server, undefined, undefined, syncOnStart);

  return { middleware, server };
}

/**
 * After a paid request succeeds, log to payments_log for dashboard/leaderboard sanity checks.
 */
export async function logPayment(opts: {
  endpoint: string;
  amount: string;
  payerAddress?: string | null;
  txId?: string | null;
  requestId?: string;
}) {
  try {
    await prisma.paymentsLog.create({
      data: {
        requestId: opts.requestId || uuidv4(),
        endpoint: opts.endpoint,
        payerAddress: opts.payerAddress ?? null,
        amount: opts.amount,
        txId: opts.txId ?? null,
      },
    });
  } catch (err) {
    console.error("[payments_log]", (err as Error).message);
  }
}

/**
 * Middleware that records a payments_log row when the request includes payment headers.
 */
export const paymentLogger: RequestHandler = async (req, res, next) => {
  const paymentHeader =
    (req.headers["payment-signature"] as string) ||
    (req.headers["x-payment"] as string) ||
    "";

  if (!paymentHeader) {
    return next();
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const path = req.route?.path
        ? `${req.baseUrl}${req.route.path}`
        : req.originalUrl.split("?")[0];
      let amount = PRICE_TIERS.micro.amountUsd.toString();
      if (path.includes("rug-score") || path.includes("whale") || path.includes("watch")) {
        amount = PRICE_TIERS.premium.amountUsd.toString();
      } else if (
        path.includes("ohlcv") ||
        path.includes("holders") ||
        path.includes("liquidity") ||
        path.includes("volume-profile")
      ) {
        amount = PRICE_TIERS.medium.amountUsd.toString();
      } else if (path.includes("trending") || path.includes("new-pairs")) {
        amount = PRICE_TIERS.low.amountUsd.toString();
      }

      void logPayment({
        endpoint: `${req.method} ${path}`,
        amount,
        requestId: (req.headers["x-request-id"] as string) || uuidv4(),
      });
    }
    return originalJson(body);
  }) as typeof res.json;

  return next();
};
