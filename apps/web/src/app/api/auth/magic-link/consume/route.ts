import { auth } from "@theseosaas/core";
import { env } from "@theseosaas/env/server";
import { NextResponse, type NextRequest } from "next/server";

import { clientIp, userAgent } from "@/lib/route-helpers";

/**
 * GET /api/auth/magic-link/consume?token=…
 *
 * The user arrives here by clicking a link in their email, so every outcome is
 * a redirect rather than JSON.
 *
 * Consumption happens server-side on this GET even though the link is
 * single-use. Email clients do prefetch links, which is exactly why the claim
 * in core is an atomic conditional update — a prefetch and the real click race,
 * and only one can win.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=That+link+is+incomplete.", env.APP_URL),
    );
  }

  try {
    const result = await auth.consumeMagicLink(token, {
      ipAddress: await clientIp(),
      userAgent: await userAgent(),
    });

    const destination = result.isNewUser
      ? "/onboarding"
      : (auth.sanitizeRedirect(result.redirectTo) ?? "/dashboard");

    const response = NextResponse.redirect(new URL(destination, env.APP_URL));

    const cookie = auth.sessionCookieOptions(
      result.session.expiresAt,
      env.NODE_ENV === "production",
    );
    response.cookies.set(cookie.name, result.session.token, cookie);

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "That sign-in link is no longer valid.";

    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, env.APP_URL),
    );
  }
}

export const dynamic = "force-dynamic";
