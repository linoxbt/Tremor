/**
 * x402 payment middleware for /v1/* routes.
 * Settles the "exact" scheme in an ERC-20 asset on Qie Mainnet/Testnet (EVM, eip155:1990/1983)
 * via a configurable x402 facilitator.
 *
 * No public facilitator (GoPlausible, Coinbase's CDP, etc.) supports Qie today — operators
 * must run their own facilitator against QIE_RPC_URL (the @x402/evm package ships the
 * facilitator-side primitives for this) and point X402_FACILITATOR_URL at it.
 */
import express from "express";
import {
  paymentMiddleware,
  x402ResourceServer,
} from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { RoutesConfig } from "@x402/core/server";
import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
} from "@x402/extensions";
import { config } from "../lib/config.js";
import { PRICE_TIERS, ENDPOINT_PRICES } from "../lib/pricing.js";
import { prisma } from "../lib/db.js";
import { v4 as uuidv4 } from "uuid";
import type { RequestHandler } from "express";

const QIE_MAINNET_CAIP2 = "eip155:1990" as Network;
const QIE_TESTNET_CAIP2 = "eip155:1983" as Network;

function networkCaip2(): Network {
  return config.x402Network as Network;
}

function accept(price: string) {
  return {
    scheme: "exact" as const,
    network: networkCaip2(),
    payTo: config.payTo,
    price,
    extra: {
      asset: config.paymentAsset,
      name: config.paymentAssetSymbol,
      decimals: config.paymentAssetDecimals,
      tag: config.x402Tag,
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
        asset: config.paymentAssetSymbol,
        network: networkCaip2(),
        payTo: config.payTo,
        tag: config.x402Tag,
        facilitator: config.facilitatorUrl || null,
        hint: config.facilitatorUrl
          ? "Retry with a valid x402 PAYMENT-SIGNATURE header after settling payment via the configured facilitator"
          : "No x402 facilitator is configured for Qie yet (X402_FACILITATOR_URL unset) — payments cannot settle until an operator runs one",
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
      extensions: discoveryFor({ price_usd: 0.18, symbol: "QIE" }),
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
          target_address: "0x0087904D95BEe9E5F24dc8852804b547981A9139",
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
  server: x402ResourceServer | null;
} {
  const routes = buildX402Routes();

  if (!config.paymentAsset) {
    console.warn(
      "[x402] QIE_PAYMENT_ASSET_ADDRESS is unset — set it to the ERC-20 contract address to accept payment in (e.g. USDC on Qie)",
    );
  }

  if (!config.facilitatorUrl) {
    // @x402/express's paymentMiddleware requires a successful initialize() handshake
    // with a real facilitator before it can build ANY payment-required response — it
    // throws (→ 500) on every request otherwise, rather than degrading gracefully.
    // With no facilitator configured we bypass the SDK's facilitator-backed flow
    // entirely and serve the same per-route pricing as a plain 402, built from data
    // we already have — so /v1/* still advertises correctly instead of crashing.
    console.warn(
      "[x402] X402_FACILITATOR_URL is unset — /v1/* will advertise payment requirements via a static 402 but cannot settle payments until a Qie-capable facilitator is configured",
    );
    const router = express.Router();
    for (const [key, routeConfig] of Object.entries(routes)) {
      const spaceIdx = key.indexOf(" ");
      const method = key.slice(0, spaceIdx).toLowerCase() as "get" | "post";
      const path = key.slice(spaceIdx + 1);
      const body = routeConfig.unpaidResponseBody?.().body ?? { error: "Payment Required" };
      router[method](path, (_req, res) => {
        res.status(402).json(body);
      });
    }
    return { middleware: router, server: null };
  }

  const facilitatorClient = new HTTPFacilitatorClient({
    url: config.facilitatorUrl,
  });

  const server = new x402ResourceServer(facilitatorClient)
    .register(QIE_MAINNET_CAIP2, new ExactEvmScheme())
    .register(QIE_TESTNET_CAIP2, new ExactEvmScheme())
    .register("eip155:*" as Network, new ExactEvmScheme());

  const syncOnStart = process.env.X402_SYNC_ON_START !== "false";

  // Enable Bazaar discovery so facilitators that support it can catalog endpoints
  try {
    server.registerExtension(bazaarResourceServerExtension);
  } catch (err) {
    console.warn("[x402] bazaar extension registration:", (err as Error).message);
  }

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
/**
 * Best-effort payer extraction from the client's own signed payment payload
 * (base64url(JSON), per the x402 wire format). This is the payer's *claim*,
 * available before settlement — unlike a settlement tx hash, which genuinely
 * doesn't exist yet at this point in the request (see the module doc comment
 * on payment-timing above).
 */
function decodePayerAddress(paymentHeader: string): string | null {
  try {
    const json = JSON.parse(
      Buffer.from(paymentHeader, "base64").toString("utf8"),
    ) as {
      payload?: {
        authorization?: { from?: string };
        permit2Authorization?: { from?: string };
      };
    };
    return (
      json.payload?.authorization?.from ??
      json.payload?.permit2Authorization?.from ??
      null
    );
  } catch {
    return null;
  }
}

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

      // NOTE on timing: @x402/express settles payment *after* this handler's
      // next() resolves (verified against the installed SDK — settlement
      // happens in the outer middleware frame once this call stack unwinds),
      // and its onAfterSettle/onSettleFailure hooks are registered-but-never-
      // invoked in this SDK version (confirmed: grepping the built SDK finds
      // no caller for either hooks array). There is no reliable extension
      // point to defer this log until settlement is confirmed without patching
      // node_modules. txId is therefore left null — a settlement tx hash
      // genuinely doesn't exist yet at this point — and this log should be
      // read as "a signed payment claim accompanied a successful response,"
      // not "settlement was confirmed," until a future SDK version exposes a
      // working post-settlement hook.
      void logPayment({
        endpoint: `${req.method} ${path}`,
        amount,
        payerAddress: decodePayerAddress(paymentHeader),
        requestId: (req.headers["x-request-id"] as string) || uuidv4(),
      });
    }
    return originalJson(body);
  }) as typeof res.json;

  return next();
};
