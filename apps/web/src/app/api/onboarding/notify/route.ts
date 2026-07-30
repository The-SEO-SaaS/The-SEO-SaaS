import { onboarding } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * POST /api/onboarding/notify — "email me when the crawl finishes".
 *
 * The address is taken from the session rather than the request body: this
 * only ever notifies the person who owns the run, so accepting an arbitrary
 * address would turn it into a way to send mail to strangers.
 */
export const POST = handler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = (await request.json().catch(() => ({}))) as { publicId?: unknown };

  if (typeof body.publicId !== "string" || body.publicId.length === 0) {
    return ok({ ok: false });
  }

  await onboarding.notifyWhenAuditCompletes(user.id, body.publicId);

  return ok({ ok: true });
});

export const dynamic = "force-dynamic";
