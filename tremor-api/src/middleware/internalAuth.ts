import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "../lib/config.js";
import { fail } from "../lib/envelope.js";

/**
 * Static bearer / x-api-key gate for /internal/* routes.
 * Single-operator dashboard — no full auth system.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, so compare a fixed-length
  // digest-independent pair first — this still leaks length, but not content.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function internalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const apiKey = (req.headers["x-api-key"] as string) || bearer;

  if (!apiKey || !safeEqual(apiKey, config.internalApiKey)) {
    return fail(res, 401, "Unauthorized — provide INTERNAL_API_KEY as Bearer or x-api-key");
  }
  return next();
}
