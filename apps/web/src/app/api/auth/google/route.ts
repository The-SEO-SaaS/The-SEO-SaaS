import { auth } from "@theseosaas/core";
import { env } from "@theseosaas/env/server";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { handler } from "@/lib/route-helpers";

/**
 * GET /api/auth/google — start the OAuth flow.
 *
 * A redirect rather than an XHR: OAuth requires a top-level navigation, so this
 * cannot be called from the axios client.
 *
 * The CSRF state and PKCE verifier are written to short-lived httpOnly cookies
 * here and read back in the callback. Cookies rather than DB rows means no
 * server state and no cleanup job for abandoned sign-ins.
 */
export const GET = handler(async (request: NextRequest) => {
  const redirectTo = auth.sanitizeRedirect(
    request.nextUrl.searchParams.get("redirectTo"),
  );

  const redirectUri = new URL("/api/auth/google/callback", env.APP_URL).toString();
  const { url, state, codeVerifier } = auth.buildAuthorizationUrl({ redirectUri });

  const cookieStore = await cookies();
  const options = auth.oauthCookieOptions(env.NODE_ENV === "production");

  cookieStore.set(auth.OAUTH_STATE_COOKIE, state, options);
  cookieStore.set(auth.OAUTH_VERIFIER_COOKIE, codeVerifier, options);

  // Carried through the round trip so the user lands back where they started —
  // typically the audit report they were reading.
  if (redirectTo) {
    cookieStore.set(auth.OAUTH_REDIRECT_COOKIE, redirectTo, options);
  }

  return NextResponse.redirect(url);
});

export const dynamic = "force-dynamic";
