import { auth } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { clientIp, handler, ok } from "@/lib/route-helpers";

/**
 * POST /api/auth/magic-link — request a sign-in link.
 *
 * Always responds the same way whether or not the address has an account. The
 * service handles that internally; the important part here is not leaking the
 * difference through the status code or message either, since that would turn
 * this endpoint into an account-enumeration oracle.
 */
export const POST = handler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));

  await auth.requestMagicLink(
    { email: body?.email, redirectTo: body?.redirectTo },
    { ipAddress: await clientIp() },
  );

  return ok({ sent: true });
});

export const dynamic = "force-dynamic";
