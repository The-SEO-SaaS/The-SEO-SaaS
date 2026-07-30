import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@theseosaas/env/server";

import { AppError } from "../errors.ts";

/**
 * Standard Webhooks signature verification, hand-rolled on node:crypto.
 *
 * Dodo follows the Standard Webhooks spec, so the scheme is:
 *   signed content = `${webhook-id}.${webhook-timestamp}.${rawBody}`
 *   signature      = base64(HMAC-SHA256(secret, signedContent))
 *   header         = "v1,<sig>" — possibly several, space-separated, during
 *                    a secret rotation
 *
 * Two things here are load-bearing and easy to get wrong:
 *
 *  1. The raw body must be the exact bytes Dodo sent. Parsing to JSON and
 *     re-stringifying changes key order and whitespace, which breaks the HMAC.
 *     Callers must pass `await request.text()`, never a parsed object.
 *
 *  2. Timestamp tolerance is required. Without it a captured payload stays
 *     replayable forever, since the signature itself never expires.
 */

/** Standard Webhooks' recommended window. */
const TOLERANCE_SECONDS = 5 * 60;

export interface WebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

/**
 * Secrets are issued as `whsec_<base64>`. The bytes after the prefix are the
 * key — using the prefixed string verbatim produces a wrong digest.
 */
function secretKey(): Buffer {
  const raw = env.DODO_WEBHOOK_SECRET;
  if (!raw) {
    throw AppError.internal("Billing isn't configured. DODO_WEBHOOK_SECRET is missing.");
  }

  const withoutPrefix = raw.startsWith("whsec_") ? raw.slice("whsec_".length) : raw;

  // Dodo's secrets are base64. If a secret ever isn't, fall back to raw bytes
  // rather than silently verifying against garbage.
  const decoded = Buffer.from(withoutPrefix, "base64");
  return decoded.length > 0 ? decoded : Buffer.from(withoutPrefix, "utf8");
}

function sign(signedContent: string): string {
  return createHmac("sha256", secretKey()).update(signedContent, "utf8").digest("base64");
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Verifies a delivery and returns the parsed payload.
 *
 * Throws on any failure — missing headers, stale timestamp, or bad signature —
 * because there's no partial success worth acting on.
 */
export function verifyWebhook<T = unknown>(rawBody: string, headers: WebhookHeaders): T {
  const { id, timestamp, signature } = headers;

  if (!id || !timestamp || !signature) {
    throw AppError.badRequest("Missing webhook signature headers.");
  }

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) {
    throw AppError.badRequest("Invalid webhook timestamp.");
  }

  const drift = Math.abs(Math.floor(Date.now() / 1000) - sentAt);
  if (drift > TOLERANCE_SECONDS) {
    // Also rejects far-future timestamps, which would otherwise let an attacker
    // mint a signature that stays valid indefinitely.
    throw AppError.badRequest("Webhook timestamp is outside the allowed window.");
  }

  const expected = sign(`${id}.${timestamp}.${rawBody}`);

  // The header may carry multiple versioned signatures during a rotation; any
  // valid v1 entry is enough.
  const candidates = signature
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [version, value] = part.split(",", 2);
      return version === "v1" && value ? value : null;
    })
    .filter((value): value is string => value !== null);

  if (candidates.length === 0) {
    throw AppError.badRequest("No supported signature version found.");
  }

  const matched = candidates.some((candidate) => constantTimeEquals(candidate, expected));
  if (!matched) {
    throw AppError.unauthorized("Webhook signature does not match.");
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch (cause) {
    throw AppError.badRequest("Webhook body is not valid JSON.", { cause });
  }
}
