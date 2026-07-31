import { marketing } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { clientIp, handler, ok } from "@/lib/route-helpers";

/**
 * POST /api/subscribe — the marketing footer's newsletter capture.
 *
 * Public and unauthenticated by necessity, which is why the rate limit lives in
 * core rather than being optional here.
 */
export const POST = handler(async (request: NextRequest) => {
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    source?: unknown;
  };

  await marketing.subscribe(
    {
      email: typeof body.email === "string" ? body.email : "",
      source: typeof body.source === "string" ? body.source : "footer",
    },
    { ipAddress: await clientIp() },
  );

  return ok({ ok: true });
});

export const dynamic = "force-dynamic";
