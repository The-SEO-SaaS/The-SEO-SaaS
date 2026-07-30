import prisma from "@theseosaas/db";

import { AppError } from "./errors.ts";

/**
 * Fixed-window rate limiter on Postgres. No Redis, no extra vendor.
 *
 * Two things in this product are genuinely expensive to leave open: the free
 * audit (real Serpex + OpenRouter spend per call) and magic-link email
 * (reputation damage if abused as a spam relay). Both go through here.
 *
 * A fixed window can allow up to 2x the limit across a boundary. That's an
 * acceptable trade for abuse control; swap in a sliding window only if the
 * numbers ever justify it.
 */

export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

function windowStartFor(windowMs: number): Date {
  return new Date(Math.floor(Date.now() / windowMs) * windowMs);
}

/**
 * Increments the counter and returns the outcome without throwing. Use when
 * the caller wants to degrade rather than reject.
 */
export async function checkRateLimit(
  bucket: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const windowStart = windowStartFor(policy.windowMs);
  const resetAt = new Date(windowStart.getTime() + policy.windowMs);

  // Atomic upsert-and-increment: concurrent requests can't both read the same
  // count and each believe they're under the limit.
  const record = await prisma.rateLimit.upsert({
    where: { bucket_windowStart: { bucket, windowStart } },
    create: { bucket, windowStart, count: 1, expiresAt: resetAt },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  return {
    allowed: record.count <= policy.limit,
    remaining: Math.max(0, policy.limit - record.count),
    resetAt,
  };
}

/** Increments and throws a 429 when the limit is exceeded. */
export async function consumeRateLimit(
  bucket: string,
  policy: RateLimitPolicy,
  message = "You're doing that too often. Please try again shortly.",
): Promise<RateLimitResult> {
  const result = await checkRateLimit(bucket, policy);

  if (!result.allowed) {
    throw AppError.rateLimited(message, {
      retryAfter: Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)),
      details: { resetAt: result.resetAt.toISOString() },
    });
  }

  return result;
}

/** Housekeeping. */
export async function deleteExpiredRateLimits(): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return count;
}
