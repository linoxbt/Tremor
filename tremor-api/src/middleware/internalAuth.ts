import type { Request, Response, NextFunction } from "express";
import { config } from "../lib/config.js";
import { fail } from "../lib/envelope.js";

/**
 * Static bearer / x-api-key gate for /internal/* routes.
 * Single-operator dashboard — no full auth system.
 */
export function internalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const apiKey = (req.headers["x-api-key"] as string) || bearer;

  if (!apiKey || apiKey !== config.internalApiKey) {
    return fail(res, 401, "Unauthorized — provide INTERNAL_API_KEY as Bearer or x-api-key");
  }
  return next();
}
