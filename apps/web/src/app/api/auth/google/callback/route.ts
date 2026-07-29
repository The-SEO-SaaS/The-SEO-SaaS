import { auth } from "@theseosaas/core";
import { env } from "@theseosaas/env/server";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { clientIp, userAgent } from "@/lib/route-helpers";

/**
 * GET /api/auth/google/callback
 *
 * Errors here redirect back to /login with a message rather than returning
 * JSON: the user arrived by browser navigation, so a raw error body would be a
 * dead end with no way back.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const isProduction = env.NODE_ENV === "production";

  const failed = (reason: string) =>
    NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(reason)}`, env.APP_URL),
    );

  try {
    const params = request.nextUrl.searchParams;

    // The user declined at Google's consent screen. Not an error worth
    // shouting about — send them back quietly.
    if (params.get("error")) {
      return NextResponse.redirect(new URL("/login", env.APP_URL));
    }

    const code = params.get("code");
    const returnedState = params.get("state");
    if (!code || !returnedState) return failed("Sign-in was interrupted. Please try again.");

    const expectedState = cookieStore.get(auth.OAUTH_STATE_COOKIE)?.value;
    const codeVerifier = cookieStore.get(auth.OAUTH_VERIFIER_COOKIE)?.value;
    const redirectTo = cookieStore.get(auth.OAUTH_REDIRECT_COOKIE)?.value;

    const profile = await auth.exchangeCodeForProfile({
      code,
      returnedState,
      expectedState,
      codeVerifier,
      redirectUri: new URL("/api/auth/google/callback", env.APP_URL).toString(),
    });

    const result = await auth.signInWithGoogle(profile, {
      ipAddress: await clientIp(),
      userAgent: await userAgent(),
    });

    // New users go to onboarding; returning users go where they were headed.
    const destination = result.isNewUser
      ? "/onboarding"
      : (auth.sanitizeRedirect(redirectTo) ?? "/dashboard");

    const response = NextResponse.redirect(new URL(destination, env.APP_URL));

    const cookie = auth.sessionCookieOptions(result.session.expiresAt, isProduction);
    response.cookies.set(cookie.name, result.session.token, cookie);

    // The handshake cookies have served their purpose.
    for (const name of [
      auth.OAUTH_STATE_COOKIE,
      auth.OAUTH_VERIFIER_COOKIE,
      auth.OAUTH_REDIRECT_COOKIE,
    ]) {
      response.cookies.set(name, "", { path: "/", maxAge: 0 });
    }

    return response;
  } catch (error) {
    console.error("[auth] google callback failed:", error);
    return failed("We couldn't complete that sign-in. Please try again.");
  }
}

export const dynamic = "force-dynamic";
