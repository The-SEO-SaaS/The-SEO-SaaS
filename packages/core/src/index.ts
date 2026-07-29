/**
 * @theseosaas/core
 *
 * All business logic lives here, deliberately free of any framework import.
 * apps/web calls into it from Route Handlers today; if the backend is ever
 * extracted into a Hono service, that service imports this package unchanged.
 *
 * The one rule: nothing in this package may import from "next/*".
 */

export { AppError, isAppError, toAppError, type ErrorCode } from "./errors.js";
export { request, type RequestOptions, type HttpResponse } from "./http/index.js";
export {
  checkRateLimit,
  consumeRateLimit,
  deleteExpiredRateLimits,
  type RateLimitPolicy,
  type RateLimitResult,
} from "./ratelimit.js";

export * as auth from "./auth/index.js";
export * as audit from "./audit/index.js";
export * as onboarding from "./onboarding/index.js";
export * as ai from "./ai/index.js";
export * as search from "./search/index.js";
export * as queue from "./queue/index.js";
export * as billing from "./billing/index.js";
export * as mail from "./mail/index.js";
export * as util from "./util/index.js";
