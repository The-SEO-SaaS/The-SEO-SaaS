import { auth } from "@theseosaas/core";
import { env } from "@theseosaas/env/server";
import { NextResponse } from "next/server";

import { getSession, handler } from "@/lib/route-helpers";

/**
 * POST /api/auth/sign-out
 *
 * Deletes the session row, not just the cookie. Clearing the cookie alone
 * leaves a valid token that anyone who captured it could keep using — the
 * whole reason sessions are server-side rather than JWTs.
 */
export const POST = handler(async () => {
  const session = await getSession();
  if (session) await auth.invalidateSession(session.sessionId);

  const response = NextResponse.json({ data: { ok: true } });
  const cleared = auth.clearedSessionCookieOptions(env.NODE_ENV === "production");
  response.cookies.set(cleared.name, cleared.value, cleared);

  return response;
});

export const dynamic = "force-dynamic";
