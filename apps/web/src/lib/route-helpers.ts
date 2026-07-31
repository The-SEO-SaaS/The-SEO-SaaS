import { toAppError } from "@theseosaas/core";
import { auth } from "@theseosaas/core";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Shared plumbing for Route Handlers.
 *
 * This file is the boundary: it is the only place that knows about Next's
 * request/response objects. Everything below it in @theseosaas/core takes
 * plain values, which is what keeps the option open to move the API to Hono
 * later without rewriting business logic.
 */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

/**
 * Converts anything thrown into the error envelope the axios client expects.
 * Zod failures become a 400 with field details rather than a 500.
 */
export function fail(error: unknown) {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: first?.message ?? "That input isn't valid.",
          details: { issues: error.issues },
        },
      },
      { status: 400 },
    );
  }

  const appError = toAppError(error);

  /**
   * Anything that isn't the user's fault gets logged with its cause.
   *
   * This used to log only `INTERNAL`, which meant every provider failure was
   * invisible in production. A Dodo 401 becomes `UPSTREAM_ERROR`, a Serpex
   * timeout becomes `TIMEOUT` — neither printed a line, so the server logs
   * were silent while the UI showed a bare "dodo responded 401" with no way
   * to find out what Dodo actually said. The upstream's own response body is
   * already captured in `details`; it just never reached anywhere readable.
   *
   * 4xx codes stay unlogged on purpose — a validation failure or an expired
   * session is normal traffic, and logging it is how you end up unable to
   * find the real errors.
   */
  const isOurProblem =
    appError.code === "INTERNAL" ||
    appError.code === "UPSTREAM_ERROR" ||
    appError.code === "TIMEOUT";

  if (isOurProblem) {
    console.error(
      `[api] ${appError.code}: ${appError.message}`,
      JSON.stringify({
        details: appError.details ?? null,
        cause:
          appError.cause instanceof Error
            ? { message: appError.cause.message, stack: appError.cause.stack }
            : (appError.cause ?? null),
      }),
    );
  }

  return NextResponse.json(appError.toJSON(), {
    status: appError.status,
    ...(appError.retryAfter
      ? { headers: { "retry-after": String(appError.retryAfter) } }
      : {}),
  });
}

/** Wraps a handler so no route has to repeat the try/catch. */
export function handler<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<NextResponse>,
) {
  return async (...args: TArgs): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      return fail(error);
    }
  };
}

/**
 * Best-effort client IP. Behind a proxy the first x-forwarded-for entry is the
 * client; this is spoofable in principle, so it's used only for rate limiting
 * and never for authorisation.
 */
export async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return headerList.get("x-real-ip");
}

export async function userAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}

/** Current session, or null. Never throws — use requireUser to enforce. */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(auth.SESSION_COOKIE_NAME)?.value;
  return auth.validateSessionToken(token);
}

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    const { AppError } = await import("@theseosaas/core");
    throw AppError.unauthorized();
  }
  return session.user;
}
