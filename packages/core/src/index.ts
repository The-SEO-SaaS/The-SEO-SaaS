/**
 * @theseosaas/core
 *
 * All business logic lives here, deliberately free of any framework import.
 * apps/web calls into it from Route Handlers today; if the backend is ever
 * extracted into a Hono service, that service imports this package unchanged.
 *
 * The one rule: nothing in this package may import from "next/*".
 */

export { AppError, isAppError, toAppError, type ErrorCode } from "./errors.ts";
export { request, type RequestOptions, type HttpResponse } from "./http/index.ts";
export {
  checkRateLimit,
  consumeRateLimit,
  deleteExpiredRateLimits,
  type RateLimitPolicy,
  type RateLimitResult,
} from "./ratelimit.ts";

export * as auth from "./auth/index.ts";
export * as audit from "./audit/index.ts";
export * as onboarding from "./onboarding/index.ts";
export * as projects from "./projects/index.ts";
export * as keywords from "./keywords/index.ts";
export * as competitors from "./competitors/index.ts";
export * as content from "./content/index.ts";
export * as ai from "./ai/index.ts";
export * as search from "./search/index.ts";
export * as queue from "./queue/index.ts";
export * as billing from "./billing/index.ts";
export * as tracking from "./tracking/index.ts";
export * as mail from "./mail/index.ts";
export * as health from "./health/index.ts";
export * as util from "./util/index.ts";
